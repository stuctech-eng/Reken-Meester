// Onderdeel Tijd en kalender (groep Praktisch rekenen): skills, volgorde en vaste vraagpools (ontwerp B1).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Het vraagverloop (rekenmoment, stapels, gemengde ronde) staat in ./flow.js.
// Notatie (B1):
//   tijdstip  "9:45", "14:30", "0:30"  (dubbele punt, uur zonder voorloopnul)
//   duur      "45 min" (< 1 uur), "2 uur" (hele uren), "1u15" (uren en minuten)
//   tussen getal en eenheid een niet-afbrekende spatie (NB)
// Kalender: altijd een gewoon jaar (februari 28 dagen), geen schrikkeljaren.
// Soort per item (kind): "kort" = gewone knoppen (max 7 tekens), "lang" = smallChoices (woorden,
// namen, datums), "fout" = fout spotten (smallChoices, isErrorSpotter).
// Elke skill heeft een vaste, nagekeken pool. Alle skills trekken via deckPick: elke vraag komt
// één keer langs voordat de stapel opnieuw wordt geschud, en nooit direct dezelfde vraag als de
// vorige (ook niet bij kleine pools). Elke vraag heeft 4 keuzes met precies één goed antwoord.

import { shuffle } from "./helpers.js";
import { registerSkillId, createSkills, createMixer, deckPick } from "./flow.js";

var NB    = "\u00a0";
var MIN = "−";
var TIMES = " × ";

var P = {};

function put(id, question, answer, choices, tip, kind) {
  (P[id] || (P[id] = [])).push({ question: question, answer: answer, choices: choices, tip: tip, kind: kind || "kort" });
}

function pad(n) { return n < 10 ? "0" + n : String(n); }

// Tijdstip uit minuten sinds middernacht (0-1439)
function tijd(t) { var x = ((t % 1440) + 1440) % 1440; return Math.floor(x / 60) + ":" + pad(x % 60); }
// Klok van 12 uur: uur 1-12
function klok(h, m) { return h + ":" + pad(m); }
function nextH(h) { return h % 12 + 1; }
function prevH(h) { return (h + 10) % 12 + 1; }

// Duur uit minuten
function dur(m) {
  if (m < 60) return m + NB + "min";
  if (m % 60 === 0) return (m / 60) + NB + "uur";
  return Math.floor(m / 60) + "u" + pad(m % 60);
}

// Kloktijd in woorden (Nederlands), h = 1-12, m = veelvoud van 5
function woord(h, m) {
  var nx = nextH(h);
  switch (m) {
    case 0:  return h + " uur";
    case 5:  return "vijf over " + h;
    case 10: return "tien over " + h;
    case 15: return "kwart over " + h;
    case 20: return "tien voor half " + nx;
    case 25: return "vijf voor half " + nx;
    case 30: return "half " + nx;
    case 35: return "vijf over half " + nx;
    case 40: return "tien over half " + nx;
    case 45: return "kwart voor " + nx;
    case 50: return "tien voor " + nx;
    case 55: return "vijf voor " + nx;
  }
  return null;
}
var MIRROR = { 5: 55, 10: 50, 15: 45, 20: 40, 25: 35, 35: 25, 40: 20, 45: 15, 50: 10, 55: 5 };
var HALF_FORM = { 20: 1, 25: 1, 30: 1, 35: 1, 40: 1 };

// Uniek op tekst, eerste voorkomen blijft; vult aan uit reserve tot 4
function four(answer, cands, reserve) {
  var out = [answer];
  function add(c) { if (out.length < 4 && c !== null && c !== undefined && out.indexOf(c) < 0) out.push(c); }
  cands.forEach(add);
  (reserve || []).forEach(add);
  return out;
}

// Getal-keuzes: antwoord + kandidaten (> 0, uniek), reserve ± stap
function nums(ans, cands, step) {
  var out = [String(ans)], seen = {};
  seen[ans] = true;
  function add(c) { if (out.length < 4 && typeof c === "number" && c >= 0 && c % 1 === 0 && !seen[c]) { seen[c] = true; out.push(String(c)); } }
  cands.forEach(add);
  var st = step || 1;
  for (var k = 1; k < 50 && out.length < 4; k++) { add(ans + k * st); add(ans - k * st); }
  return out;
}

// Duur-keuzes in minuten (> 0, uniek in waarde)
function durs(ans, cands, step) {
  var out = [dur(ans)], seen = {};
  seen[ans] = true;
  function add(c) { if (out.length < 4 && typeof c === "number" && c > 0 && !seen[c]) { seen[c] = true; out.push(dur(c)); } }
  cands.forEach(add);
  var st = step || 5;
  for (var k = 1; k < 50 && out.length < 4; k++) { add(ans + k * st); add(ans - k * st); }
  return out;
}

// Tijdstip-keuzes (minuten sinds middernacht, uniek)
function tijden(ans, cands) {
  var out = [tijd(ans)];
  function add(c) { if (out.length < 4 && c !== null && out.indexOf(tijd(c)) < 0) out.push(tijd(c)); }
  cands.forEach(add);
  for (var k = 1; k < 30 && out.length < 4; k++) { add(ans + k * 5); add(ans - k * 5); }
  return out;
}

// ── Blok 1: klok lezen (klok van 12 uur) ──────────────────────────
(function() {
  var h;
  for (h = 1; h <= 12; h++) {
    var nx = nextH(h);
    // t01: half en hele uren. "half 4" = een half uur vóór 4 uur = 3:30
    put("t01", "half " + nx + " = ?", klok(h, 30), four(klok(h, 30), [klok(nx, 30), klok(nx, 0), klok(h, 0)]),
      "Half " + nx + " is een half uur vóór " + nx + " uur: " + klok(h, 30) + ".");
    put("t01", klok(h, 30) + " in woorden?", "half " + nx, four("half " + nx, ["half " + h, nx + " uur", h + " uur"]),
      klok(h, 30) + " is een half uur vóór " + nx + " uur: half " + nx + ".", "lang");
    put("t01", nx + " uur = ?", klok(nx, 0), four(klok(nx, 0), [klok(h, 30), klok(nx, 30), klok(h, 0)]),
      nx + " uur is precies " + klok(nx, 0) + ". Half " + nx + " is " + klok(h, 30) + ".");
    // t02: kwart over / kwart voor
    put("t02", "kwart over " + h + " = ?", klok(h, 15), four(klok(h, 15), [klok(prevH(h), 45), klok(h, 45), klok(nx, 15)]),
      "Kwart over " + h + " is 15 minuten na " + h + " uur: " + klok(h, 15) + ".");
    put("t02", "kwart voor " + nx + " = ?", klok(h, 45), four(klok(h, 45), [klok(nx, 45), klok(nx, 15), klok(h, 15)]),
      "Kwart voor " + nx + " is 15 minuten vóór " + nx + " uur: " + klok(h, 45) + ".");
    put("t02", klok(h, 15) + " in woorden?", "kwart over " + h, four("kwart over " + h, ["kwart voor " + h, "kwart voor " + nx, "kwart over " + nx]),
      klok(h, 15) + " is 15 minuten na " + h + " uur: kwart over " + h + ".", "lang");
    put("t02", klok(h, 45) + " in woorden?", "kwart voor " + nx, four("kwart voor " + nx, ["kwart over " + nx, "kwart voor " + h, "kwart over " + h]),
      klok(h, 45) + " is 15 minuten vóór " + nx + " uur: kwart voor " + nx + ".", "lang");
    // t03: vijf en tien over / voor het uur
    [5, 10].forEach(function(m) {
      var w = woord(h, m);
      put("t03", w + " = ?", klok(h, m), four(klok(h, m), [klok(prevH(h), 60 - m), klok(h, 60 - m), klok(nx, m)]),
        w.charAt(0).toUpperCase() + w.slice(1) + " is " + m + " minuten na " + h + " uur: " + klok(h, m) + ".");
    });
    [50, 55].forEach(function(m) {
      var w = woord(h, m);
      put("t03", w + " = ?", klok(h, m), four(klok(h, m), [klok(nx, 60 - m), klok(nx, m), klok(h, 60 - m)]),
        w.charAt(0).toUpperCase() + w.slice(1) + " is " + (60 - m) + " minuten vóór " + nx + " uur: " + klok(h, m) + ".");
    });
    // t04: rond half
    [20, 25, 35, 40].forEach(function(m) {
      var w = woord(h, m);
      put("t04", w + " = ?", klok(h, m), four(klok(h, m), [klok(h, MIRROR[m]), klok(nx, m), klok(h, m < 30 ? m - 10 : m + 10)]),
        "Half " + nx + " is " + klok(h, 30) + ". " + w.charAt(0).toUpperCase() + w.slice(1) + " is " + Math.abs(30 - m) + " minuten " + (m < 30 ? "ervóór" : "erna") + ": " + klok(h, m) + ".");
    });
    // t05: tijd in woorden kiezen (alle vormen behalve hele uren)
    [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].forEach(function(m) {
      var good = woord(h, m);
      var wrongHour = HALF_FORM[m] ? woord(prevH(h), m) : woord(nx, m);
      // Bij half: half h (uur te laag), half nx+1 (uur te hoog), nx uur. Anders: verkeerd uur en gespiegelde vorm
      var cands = m === 30 ? [woord(prevH(h), 30), woord(nx, 30), nx + " uur"] : [wrongHour, woord(h, MIRROR[m]), HALF_FORM[m] ? woord(nx, m) : woord(prevH(h), m)];
      put("t05", klok(h, m) + " in woorden?", good, four(good, cands),
        klok(h, m) + " is " + good + (HALF_FORM[m] ? " (half " + nx + " = " + klok(h, 30) + ")." : "."), "lang");
    });
  }
})();

// ── Blok 2: 24-uursklok ───────────────────────────────────────────
(function() {
  var k;
  // t06: 's middags (13-17 uur) en 's avonds (19-23 uur); grensuren 12, 18 en 0 alleen in t07
  for (k = 1; k <= 11; k++) {
    if (k === 6) continue;
    var part = k <= 5 ? "'s middags" : "'s avonds", H = k + 12;
    put("t06", k + " uur " + part + " = ?", H + ":00", four(H + ":00", [k + ":00", (k + 10) + ":00", (k + 11) + ":00"]),
      "Na 12 uur 's middags tel je door: " + k + " + 12 = " + H + ". Dus " + H + ":00.");
    put("t06", H + ":00 = ? uur " + part, String(k), nums(k, [H - 10, H, k + 2]),
      H + " " + MIN + " 12 = " + k + ". Dus " + k + " uur " + part + ".");
  }
  // t07: 's nachts en 's ochtends, met 12:00 en 0:00 apart
  for (k = 1; k <= 5; k++) put("t07", k + " uur 's nachts = ?", k + ":00", four(k + ":00", [(k + 12) + ":00", "0:00", (k + 1) + ":00"]),
    "Na middernacht (0:00) begint de dag opnieuw: " + k + " uur 's nachts = " + k + ":00.");
  for (k = 6; k <= 11; k++) put("t07", k + " uur 's ochtends = ?", k + ":00", four(k + ":00", [(k + 12) + ":00", (k - 1) + ":00", (k + 1) + ":00"]),
    "'s Ochtends is het uur gewoon " + k + ": " + k + ":00. 's Avonds zou het " + (k + 12) + ":00 zijn.");
  put("t07", "12 uur 's middags = ?", "12:00", ["12:00", "0:00", "13:00", "1:00"], "12 uur 's middags is midden op de dag: 12:00.");
  put("t07", "12 uur 's nachts = ?", "0:00", ["0:00", "12:00", "23:00", "1:00"], "12 uur 's nachts is middernacht. Op een digitale klok: 0:00.");
  put("t07", "half 1 's nachts = ?", "0:30", ["0:30", "12:30", "1:30", "23:30"], "Half 1 's nachts is een half uur na middernacht: 0:30.");
  put("t07", "half 1 's middags = ?", "12:30", ["12:30", "0:30", "13:30", "1:30"], "Half 1 's middags is een half uur na 12:00: 12:30.");
  put("t07", "0:00 is hoe laat?", "12 uur 's nachts", ["12 uur 's nachts", "12 uur 's middags", "1 uur 's nachts", "11 uur 's avonds"],
    "0:00 is middernacht: 12 uur 's nachts. 12:00 is 12 uur 's middags.", "lang");
  put("t07", "12:00 is hoe laat?", "12 uur 's middags", ["12 uur 's middags", "12 uur 's nachts", "1 uur 's middags", "9 uur 's ochtends"],
    "12:00 is midden op de dag: 12 uur 's middags. 0:00 is 12 uur 's nachts.", "lang");
  // t08: woorden + dagdeel -> 24 uur (dagdeel volgt uit de werkelijke tijd, geen grensuren)
  [13, 14, 15, 16, 19, 20, 21, 22].forEach(function(H) {
    var h = H - 12, part = H < 18 ? "'s middags" : "'s avonds";
    [15, 30, 45, 20, 40].forEach(function(m) {
      var w = woord(h, m), ans = H * 60 + m;
      var hourErr = HALF_FORM[m] ? ans + 60 : (m === 45 ? ans + 60 : ans - 60);
      put("t08", w + " " + part + " = ?", tijd(ans), tijden(ans, [h * 60 + m, hourErr, m === 30 ? ans - 60 : H * 60 + MIRROR[m]]),
        w.charAt(0).toUpperCase() + w.slice(1) + " is " + klok(h, m) + ". " + part.charAt(0).toUpperCase() + part.slice(1) + ": " + h + " + 12 = " + H + ", dus " + tijd(ans) + ".");
    });
  });
})();

// ── Blok 3: eenheden van tijd ─────────────────────────────────────
(function() {
  var h, t, m, w;
  for (h = 1; h <= 9; h++) put("t09", h + " uur = ? min", String(h * 60), nums(h * 60, [h * 100, h * 60 + 60, h * 30, h * 60 - 60], 10),
    "1 uur = 60 minuten: " + h + TIMES + "60 = " + h * 60 + ".");
  for (t = 70; t <= 290; t += 10) {
    if (t % 60 === 0) continue;
    var dec = Math.floor(t / 100) * 60 + t % 100; // fout: delen door 100 alsof een uur 100 minuten heeft
    put("t09", t + " min = ?", dur(t), durs(t, [t % 100 < 60 && Math.floor(t / 100) > 0 ? dec : null, t + 60, t - 10, t + 10]),
      "Haal er steeds 60 af: " + t + " min = " + Math.floor(t / 60) + " uur en " + t % 60 + " min = " + dur(t) + ".");
  }
  [[1, 30], [1, 15], [1, 45], [2, 20], [2, 40], [1, 10], [2, 15], [3, 30]].forEach(function(p) {
    var v = p[0] * 60 + p[1];
    put("t09", p[0] + "u" + pad(p[1]) + " = ? min", String(v), nums(v, [p[0] * 100 + p[1], v + 10, v - 10], 5),
      p[0] + " uur = " + p[0] * 60 + " min, plus " + p[1] + " = " + v + " min.");
  });
  for (m = 1; m <= 9; m++) {
    put("t10", m + " min = ? sec", String(m * 60), nums(m * 60, [m * 100, m * 60 + 60, m * 60 - 30], 10), "1 minuut = 60 seconden: " + m + TIMES + "60 = " + m * 60 + ".");
    put("t10", m * 60 + " sec = ? min", String(m), nums(m, [m * 60 / 100 % 1 === 0 ? m * 60 / 100 : null, m + 1, m * 10, m + 2]), "60 seconden = 1 minuut: " + m * 60 + " : 60 = " + m + ".");
  }
  [[1, 30], [1, 15], [2, 30], [1, 45], [2, 10]].forEach(function(p) {
    var v = p[0] * 60 + p[1];
    put("t10", p[0] + " min " + p[1] + " sec = ? sec", String(v), nums(v, [p[0] * 100 + p[1], v - 30, v + 30], 5),
      p[0] + " min = " + p[0] * 60 + " sec, plus " + p[1] + " = " + v + " sec.");
  });
  for (w = 1; w <= 8; w++) {
    put("t11", w + (w === 1 ? " week" : " weken") + " = ? dagen", String(w * 7), nums(w * 7, [w * 10, w * 7 + 7, w * 5]), "1 week = 7 dagen: " + w + TIMES + "7 = " + w * 7 + ".");
    put("t11", w * 7 + " dagen = ? weken", String(w), nums(w, [w * 7 / 10 % 1 === 0 ? w * 7 / 10 : null, w + 1, w - 1 > 0 ? w - 1 : w + 2]), "7 dagen = 1 week: " + w * 7 + " : 7 = " + w + ".");
  }
  [[2, 3], [1, 4], [3, 2], [2, 5], [1, 6]].forEach(function(p) {
    var v = p[0] * 7 + p[1];
    put("t11", p[0] + (p[0] === 1 ? " week " : " weken ") + p[1] + " dagen = ? dagen", String(v), nums(v, [p[0] * 10 + p[1], p[0] + p[1], v + 7]),
      p[0] + TIMES + "7 = " + p[0] * 7 + ", plus " + p[1] + " = " + v + " dagen.");
  });
  // t12: vaste feiten; 52 weken alleen als "ongeveer"
  [["1 dag = ? uur", 24, [12, 60, 100], "Een dag en een nacht samen duren 24 uur."],
   ["1 uur = ? min", 60, [100, 30, 24], "1 uur = 60 minuten, niet 100."],
   ["1 min = ? sec", 60, [100, 10, 30], "1 minuut = 60 seconden."],
   ["1 week = ? dagen", 7, [5, 10, 14], "Maandag tot en met zondag: 7 dagen."],
   ["1 jaar = ? maanden", 12, [10, 52, 24], "Januari tot en met december: 12 maanden."],
   ["Gewoon jaar = ? dagen", 365, [360, 356, 52], "Een gewoon jaar heeft 365 dagen."],
   ["Een jaar is ongeveer ? weken", 52, [12, 48, 100], "52 × 7 = 364 dagen: net iets minder dan een jaar. Dus ongeveer 52 weken."],
   ["Een maand is ongeveer ? weken", 4, [7, 12, 30], "Een maand heeft 28 tot 31 dagen: ongeveer 4 weken."]].forEach(function(f) {
    put("t12", f[0], String(f[1]), nums(f[1], f[2]), f[3]);
  });
  // t13: kwartier en half uur
  [["1 kwartier = ? min", 15, [25, 10, 30]], ["3 kwartier = ? min", 45, [75, 30, 35]], ["2 kwartier = ? min", 30, [50, 20, 15]],
   ["Een half uur = ? min", 30, [50, 15, 60]], ["Anderhalf uur = ? min", 90, [150, 130, 80]], ["4 kwartier = ? min", 60, [100, 40, 45]]].forEach(function(f) {
    put("t13", f[0], String(f[1]), nums(f[1], f[2], 5), "1 kwartier = 15 min, een half uur = 30 min, 1 uur = 60 min.");
  });
  [[5, 75], [6, 90], [7, 105], [10, 150]].forEach(function(p) {
    put("t13", p[0] + " kwartier = ?", dur(p[1]), durs(p[1], [p[0] * 25, p[1] + 15, p[1] - 15]),
      p[0] + TIMES + "15 = " + p[1] + " min = " + dur(p[1]) + ".");
  });
})();

// ── Blok 4: duur ──────────────────────────────────────────────────
(function() {
  [8, 9, 10, 13, 14, 15].forEach(function(H) {
    // t14: binnen hetzelfde uur
    [0, 5, 10, 15, 20, 25, 30].forEach(function(a) { [35, 40, 45, 50, 55].forEach(function(b) {
      if (b - a < 15) return;
      var d = b - a;
      put("t14", "Van " + tijd(H * 60 + a) + " tot " + tijd(H * 60 + b) + ": ? min", String(d), nums(d, [b, d + 10, d - 5], 5),
        "Van :" + pad(a) + " tot :" + pad(b) + " is " + b + " " + MIN + " " + a + " = " + d + " minuten.");
    }); });
    // t15: over het hele uur heen (korter dan een uur)
    [30, 35, 40, 45, 50, 55].forEach(function(a) { [5, 10, 15, 20, 25].forEach(function(b) {
      var d = 60 - a + b, wrong = 100 - a + b; // fout: rekenen alsof een uur 100 minuten heeft
      if (d >= 60) return;
      put("t15", "Van " + tijd(H * 60 + a) + " tot " + tijd((H + 1) * 60 + b) + ": ? min", String(d), nums(d, [wrong, d + 10, d - 5], 5),
        "Tot " + (H + 1) + ":00 is " + (60 - a) + " min, daarna nog " + b + " min: samen " + d + " minuten.");
    }); });
  });
  // t16: uren en minuten (met lenen)
  [[8, 30, 11, 15], [9, 45, 12, 20], [7, 50, 9, 10], [13, 40, 16, 5], [10, 35, 13, 10], [8, 55, 10, 25], [14, 20, 17, 5], [9, 40, 11, 15],
   [12, 50, 15, 20], [7, 45, 10, 30], [15, 25, 17, 10], [8, 40, 9, 35], [10, 50, 12, 5], [13, 35, 15, 20]].forEach(function(p) {
    var d = (p[2] * 60 + p[3]) - (p[0] * 60 + p[1]), noBorrow = (p[2] - p[0]) * 60 + Math.abs(p[3] - p[1]);
    put("t16", "Van " + p[0] + ":" + pad(p[1]) + " tot " + p[2] + ":" + pad(p[3]) + ": hoe lang?", dur(d), durs(d, [noBorrow, d + 10, d - 10]),
      "Tot " + (p[0] + 1) + ":00 is " + (60 - p[1]) + " min, dan tot " + p[2] + ":" + pad(p[3]) + ". Samen " + dur(d) + ".");
  });
  // t17: van ochtend naar middag (24 uur), de duur staat altijd in de vraag
  [[10, 30, 4], [11, 15, 3], [9, 45, 5], [10, 0, 6], [11, 30, 2], [8, 15, 7], [9, 30, 4], [11, 45, 3]].forEach(function(p) {
    var s = p[0] * 60 + p[1], e = s + p[2] * 60;
    put("t17", tijd(s) + " + " + p[2] + " uur = ?", tijd(e), tijden(e, [e - 720, e - p[1], e - 60]),
      tijd(s) + " plus " + p[2] + " uur: " + p[0] + " + " + p[2] + " = " + (p[0] + p[2]) + ". Dus " + tijd(e) + " (na 12 uur tel je door).");
  });
  [[10, 45, 14, 20], [9, 15, 13, 40], [11, 30, 15, 10], [8, 50, 12, 25], [10, 20, 14, 5], [11, 40, 13, 15]].forEach(function(p) {
    var d = (p[2] * 60 + p[3]) - (p[0] * 60 + p[1]), noBorrow = (p[2] - p[0]) * 60 + Math.abs(p[3] - p[1]);
    put("t17", "Van " + p[0] + ":" + pad(p[1]) + " tot " + p[2] + ":" + pad(p[3]) + ": hoe lang?", dur(d), durs(d, [noBorrow !== d ? noBorrow : null, d + 60, d + 10, d - 10]),
      "Tot 12:00 is " + dur(720 - (p[0] * 60 + p[1])) + ", daarna nog " + dur((p[2] * 60 + p[3]) - 720) + ". Samen " + dur(d) + ".");
  });
})();

// ── Blok 5: begin- en eindtijd ────────────────────────────────────
(function() {
  var starts = [[9, 45], [8, 50], [10, 35], [13, 40], [14, 55], [7, 30], [15, 45], [11, 20]];
  var lens = [35, 50, 75, 90, 105, 40];
  starts.forEach(function(s) { lens.forEach(function(L) {
    var S = s[0] * 60 + s[1], E = S + L;
    if (s[1] + L % 60 < 60) return; // alleen met overgang naar het volgende uur
    put("t18", "Start " + tijd(S) + ", duur " + dur(L) + ". Eind?", tijd(E), tijden(E, [E - 60, E + 10, E - 10]),
      tijd(S) + " + " + dur(L) + ": eerst tot het hele uur, dan de rest. Eind " + tijd(E) + ".");
    put("t19", "Eind " + tijd(E) + ", duur " + dur(L) + ". Start?", tijd(S), tijden(S, [S + 60, S + 10, S - 10]),
      "Reken terug: " + tijd(E) + " " + MIN + " " + dur(L) + " = " + tijd(S) + ".");
  }); });
  [[8, 50], [9, 40], [10, 45], [13, 35], [14, 50], [7, 55], [15, 40], [11, 50]].forEach(function(s) { [15, 20, 25, 30, 35].forEach(function(x) {
    var T = s[0] * 60 + s[1];
    if (s[1] + x >= 60) put("t20", "Het is " + tijd(T) + ". Over " + x + " min?", tijd(T + x), tijden(T + x, [T + x - 60, T + x + 10, T + x - 10]),
      "Tot " + (s[0] + 1) + ":00 is " + (60 - s[1]) + " min, dan nog " + (x - (60 - s[1])) + " min: " + tijd(T + x) + ".");
  }); });
  [[10, 10], [9, 5], [11, 15], [14, 20], [8, 10], [13, 5], [15, 15], [12, 20]].forEach(function(s) { [15, 20, 25, 30, 35].forEach(function(x) {
    var T = s[0] * 60 + s[1];
    if (s[1] - x < 0) put("t21", "Het is " + tijd(T) + ". " + x + " min geleden?", tijd(T - x), tijden(T - x, [T - x + 60, T - x + 10, T - x - 10]),
      "Terug tot " + s[0] + ":00 is " + s[1] + " min, dan nog " + (x - s[1]) + " min terug: " + tijd(T - x) + ".");
  }); });
})();

// ── Blok 6: rekenen met duur ──────────────────────────────────────
(function() {
  [[1, 40, 2, 35], [0, 45, 1, 30], [2, 50, 1, 25], [1, 35, 0, 40], [3, 20, 1, 45], [0, 55, 0, 30], [2, 15, 1, 50], [1, 25, 1, 45],
   [0, 40, 0, 35], [2, 30, 2, 45], [1, 50, 0, 20], [3, 45, 0, 25]].forEach(function(p) {
    var a = p[0] * 60 + p[1], b = p[2] * 60 + p[3], s = a + b;
    put("t22", dur(a) + " + " + dur(b) + " = ?", dur(s), durs(s, [s - 60, s + 10, s - 10]),
      "Uren bij uren, minuten bij minuten. 60 minuten worden 1 uur: " + dur(s) + ".");
  });
  [[2, 10, 0, 45], [3, 15, 1, 40], [1, 20, 0, 35], [4, 5, 1, 30], [2, 25, 1, 50], [3, 0, 0, 45], [1, 10, 0, 25], [2, 35, 0, 50],
   [5, 20, 2, 45], [3, 30, 1, 55]].forEach(function(p) {
    var a = p[0] * 60 + p[1], b = p[2] * 60 + p[3], d = a - b, noBorrow = (p[0] - p[2]) * 60 + Math.abs(p[1] - p[3]);
    put("t23", dur(a) + " " + MIN + " " + dur(b) + " = ?", dur(d), durs(d, [noBorrow !== d ? noBorrow : null, d + 10, d - 10]),
      "Leen 1 uur = 60 min als de minuten niet genoeg zijn: " + dur(a) + " " + MIN + " " + dur(b) + " = " + dur(d) + ".");
  });
  [[4, 15], [3, 25], [2, 45], [6, 15], [3, 40], [5, 20], [4, 25], [2, 35], [3, 50], [6, 25], [5, 30], [4, 45]].forEach(function(p) {
    var v = p[0] * p[1], dec = Math.floor(v / 100) * 60 + v % 100;
    put("t24", p[0] + TIMES + p[1] + " min = ?", dur(v), durs(v, [v % 100 < 60 && Math.floor(v / 100) > 0 && dec !== v ? dec : null, v + p[1], v - p[1]]),
      p[0] + TIMES + p[1] + " = " + v + " min = " + dur(v) + ".");
  });
  [[1, 4], [1, 2], [1, 3], [1, 6], [2, 4], [2, 3], [2, 6], [3, 4], [1, 5], [2, 5], [3, 6], [1, 12]].forEach(function(p) {
    var v = p[0] * 60 / p[1], dec = p[0] * 100 / p[1];
    put("t25", p[0] + " uur over " + p[1] + ": ? min per stuk", String(v), nums(v, [dec % 1 === 0 ? dec : null, v + 10, v - 5 > 0 ? v - 5 : v + 20], 5),
      p[0] + " uur = " + p[0] * 60 + " min. " + p[0] * 60 + " : " + p[1] + " = " + v + " min.");
  });
})();

// ── Blok 7: kalender (gewoon jaar, geen schrikkeljaren) ───────────
var DAGEN = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
var MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
var MAAND_DAGEN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
(function() {
  function d7(i) { return DAGEN[((i % 7) + 7) % 7]; }
  function m12(i) { return MAANDEN[((i % 12) + 12) % 12]; }
  DAGEN.forEach(function(name, d) { [1, 2, 3, 4, 5].forEach(function(k) {
    put("t26", k + (k === 1 ? " dag" : " dagen") + " na " + name + "?", d7(d + k), four(d7(d + k), [d7(d + k - 1), d7(d + k + 1), d7(d - k)], [d7(d + k + 2), d7(d + k - 2)]),
      "Tel " + k + " verder vanaf " + name + ": " + d7(d + k) + ".", "lang");
    if (k <= 3) put("t26", k + (k === 1 ? " dag" : " dagen") + " voor " + name + "?", d7(d - k), four(d7(d - k), [d7(d - k + 1), d7(d - k - 1), d7(d + k)], [d7(d - k - 2), d7(d - k + 2)]),
      "Tel " + k + " terug vanaf " + name + ": " + d7(d - k) + ".", "lang");
  }); });
  MAANDEN.forEach(function(name, i) {
    [1, 2, 3, 4].forEach(function(k) {
      put("t27", k + (k === 1 ? " maand" : " maanden") + " na " + name + "?", m12(i + k), four(m12(i + k), [m12(i + k - 1), m12(i + k + 1), m12(i - k)]),
        "Tel " + k + " verder vanaf " + name + ": " + m12(i + k) + ".", "lang");
    });
    put("t27", "Welke maand is nummer " + (i + 1) + "?", name, four(name, [m12(i - 1), m12(i + 1), m12(i + 2)]),
      "Januari is 1, februari 2, ... december 12. Nummer " + (i + 1) + " is " + name + ".", "lang");
  });
  MAANDEN.forEach(function(name, i) {
    var q = i === 1 ? "Februari, gewoon jaar: dagen?" : "Hoeveel dagen heeft " + name + "?";
    put("t28", q, String(MAAND_DAGEN[i]), ["28", "29", "30", "31"],
      name.charAt(0).toUpperCase() + name.slice(1) + " heeft " + MAAND_DAGEN[i] + " dagen." + (i === 1 ? " In een schrikkeljaar 29, maar dit is een gewoon jaar." : ""));
  });
  // t29: datum + dagen of weken. Over een maandgrens alleen met vaste, nagekeken maanden (niet februari).
  function datum(day, mi) { return day + " " + MAANDEN[mi]; }
  function addDays(day, mi, k) { var d = day + k, m = mi; while (d > MAAND_DAGEN[m]) { d -= MAAND_DAGEN[m]; m = (m + 1) % 12; } return [d, m]; }
  [[2, 12], [4, 5], [5, 14], [9, 3], [10, 20], [0, 8], [6, 15], [8, 10]].forEach(function(p) { [[3, "3 dagen"], [7, "1 week"], [14, "2 weken"], [5, "5 dagen"]].forEach(function(k) {
    var r = addDays(p[1], p[0], k[0]), o = addDays(p[1], p[0], k[0] + 1), u = addDays(p[1], p[0], k[0] - 1);
    put("t29", datum(p[1], p[0]) + " + " + k[1] + " = ?", datum(r[0], r[1]), four(datum(r[0], r[1]), [datum(u[0], u[1]), datum(o[0], o[1]), datum(p[1] + (k[0] === 7 ? 10 : k[0] === 14 ? 20 : k[0] + 10), p[0])]),
      datum(p[1], p[0]) + " + " + k[0] + " dagen = " + datum(r[0], r[1]) + ".", "lang");
  }); });
  [[3, 28, 5, "5 dagen"], [4, 29, 3, "3 dagen"], [6, 27, 7, "1 week"], [2, 30, 4, "4 dagen"], [9, 29, 7, "1 week"], [7, 30, 3, "3 dagen"]].forEach(function(p) {
    var r = addDays(p[1], p[0], p[2]), o = addDays(p[1], p[0], p[2] + 1), u = addDays(p[1], p[0], p[2] - 1);
    put("t29", datum(p[1], p[0]) + " + " + p[3] + " = ?", datum(r[0], r[1]), four(datum(r[0], r[1]), [datum(u[0], u[1]), datum(o[0], o[1]), datum(r[0], p[0])]),
      MAANDEN[p[0]].charAt(0).toUpperCase() + MAANDEN[p[0]].slice(1) + " heeft " + MAAND_DAGEN[p[0]] + " dagen. " + datum(p[1], p[0]) + " + " + p[2] + " dagen = " + datum(r[0], r[1]) + ".", "lang");
  });
  // t30: verstreken dagen ("hoeveel dagen na"); begindag telt niet mee. De telling mét beide dagen is een foute keuze.
  [[4, 3, 10], [4, 12, 19], [2, 5, 8], [5, 1, 15], [6, 10, 24], [6, 4, 5], [3, 6, 9], [2, 2, 9], [4, 20, 21], [5, 14, 28], [5, 7, 14], [6, 1, 25]].forEach(function(p) {
    var d = p[2] - p[1];
    put("t30", "Hoeveel dagen na " + p[1] + " " + MAANDEN[p[0]] + " is " + p[2] + " " + MAANDEN[p[0]] + "?", String(d), nums(d, [d + 1, d - 1, d + 2]),
      "Tel de dagen die voorbijgaan: van " + p[1] + " naar " + p[2] + " is " + p[2] + " " + MIN + " " + p[1] + " = " + d + " dagen later.");
  });
  [[3, 28, 4, 3], [4, 29, 5, 2], [5, 27, 6, 4], [5, 30, 6, 5]].forEach(function(p) {
    var d = MAAND_DAGEN[p[0]] - p[1] + p[3];
    put("t30", "Hoeveel dagen na " + p[1] + " " + MAANDEN[p[0]] + " is " + p[3] + " " + MAANDEN[p[2]] + "?", String(d), nums(d, [d + 1, d - 1, d + 2]),
      MAANDEN[p[0]].charAt(0).toUpperCase() + MAANDEN[p[0]].slice(1) + " heeft " + MAAND_DAGEN[p[0]] + " dagen: nog " + (MAAND_DAGEN[p[0]] - p[1]) + " dagen, plus " + p[3] + " = " + d + ".");
  });
})();

// ── Blok 8: rooster en jaren ──────────────────────────────────────
(function() {
  [7, 8, 9, 16].forEach(function(H) {
    [[[15, 45], [5, 20, 30, 50]], [[0, 20, 40], [5, 25, 30, 45]], [[10, 40], [15, 25, 45, 55]]].forEach(function(cfg) {
      var mins = cfg[0];
      cfg[1].forEach(function(now) {
        if (mins.length === 3 && H > 9) return; // vraag blijft ≤ 36 tekens
        var T = H * 60 + now, next = null, prev = null, all = [];
        for (var hh = H - 1; hh <= H + 1; hh++) mins.forEach(function(m) { all.push(hh * 60 + m); });
        all.forEach(function(x) { if (x > T && next === null) next = x; if (x <= T) prev = x; });
        var after = all.filter(function(x) { return x > next; })[0];
        var label = "Bus " + mins.map(function(m) { return ":" + pad(m); }).join(", ");
        put("t31", label + ". Volgende na " + tijd(T) + "?", tijd(next), tijden(next, [prev, after, next + 60]),
          "De bus gaat elk uur om " + mins.map(function(m) { return ":" + pad(m); }).join(", ") + ". Na " + tijd(T) + " komt " + tijd(next) + ".");
      });
    });
  });
  [[1998, 2026], [2010, 2026], [1985, 2025], [2003, 2026], [1975, 2024], [2016, 2026], [1990, 2026], [2001, 2024], [1969, 2026], [2012, 2025]].forEach(function(p) {
    var d = p[1] - p[0];
    put("t32", "Hoeveel jaar na " + p[0] + " is " + p[1] + "?", String(d), nums(d, [d + 1, d - 1, d + 10]),
      p[1] + " " + MIN + " " + p[0] + " = " + d + " jaar.");
  });
  [[10, 2026], [8, 2025], [12, 2026], [7, 2024], [9, 2026], [11, 2025]].forEach(function(p) {
    var y = p[1] - p[0];
    put("t32", "Wordt " + p[0] + " in " + p[1] + ". Geboortejaar?", String(y), nums(y, [y + 1, y - 1, p[1] + p[0]]),
      "Je wordt " + p[0] + " in " + p[1] + ": " + p[1] + " " + MIN + " " + p[0] + " = " + y + ".");
  });
  // t33: alleen omrekenen (geen "welke eeuw hoort bij een jaartal")
  for (var e = 1; e <= 9; e++) {
    put("t33", e + (e === 1 ? " eeuw" : " eeuwen") + " = ? jaar", String(e * 100), nums(e * 100, [e * 10, e * 1000, e * 100 + 100], 100), "1 eeuw = 100 jaar: " + e + TIMES + "100 = " + e * 100 + ".");
    put("t33", e + " decennia = ? jaar", String(e * 10), nums(e * 10, [e * 100, e, e * 10 + 10], 10), "1 decennium = 10 jaar: " + e + TIMES + "10 = " + e * 10 + ".");
    put("t33", e * 10 + " jaar = ? decennia", String(e), nums(e, [e * 10 / 100 % 1 === 0 ? e / 10 : null, e * 10, e + 1, e + 2]), "10 jaar = 1 decennium: " + e * 10 + " : 10 = " + e + ".");
  }
  for (var c = 2; c <= 9; c++) put("t33", c * 100 + " jaar = ? eeuwen", String(c), nums(c, [c * 10, c + 1, c - 1]), "100 jaar = 1 eeuw: " + c * 100 + " : 100 = " + c + ".");
  put("t33", "1 eeuw = ? decennia", "10", nums(10, [100, 1, 12]), "1 eeuw = 100 jaar = 10 decennia van 10 jaar.");
})();

// ── Blok 9: toepassen en controleren ──────────────────────────────
(function() {
  // t34: duur schatten, vaste nagekeken lijst; afleiders in een andere eenheid of factor ≥ 10
  [["Tanden poetsen duurt ongeveer?", [2, "min"], [[2, "uur"], [2, "sec"], [20, "min"]]],
   ["Een voetbalwedstrijd duurt?", [90, "min"], [[90, "sec"], [9, "min"], [9, "uur"]]],
   ["Een nacht slapen duurt ongeveer?", [10, "uur"], [[10, "min"], [10, "sec"], [100, "uur"]]],
   ["Een schooldag duurt ongeveer?", [6, "uur"], [[6, "min"], [60, "uur"], [6, "dagen"]]],
   ["Een liedje duurt ongeveer?", [3, "min"], [[3, "uur"], [3, "sec"], [30, "min"]]],
   ["Een film duurt ongeveer?", [2, "uur"], [[2, "min"], [20, "uur"], [2, "dagen"]]],
   ["De zomervakantie duurt ongeveer?", [6, "weken"], [[6, "dagen"], [6, "uur"], [6, "jaar"]]],
   ["Een ei koken duurt ongeveer?", [8, "min"], [[8, "uur"], [8, "sec"], [80, "min"]]],
   ["Je handen wassen duurt ongeveer?", [30, "sec"], [[30, "min"], [30, "uur"], [3, "uur"]]]].forEach(function(it) {
    var ans = it[1][0] + NB + it[1][1];
    put("t34", it[0], ans, [ans].concat(it[2].map(function(d) { return d[0] + NB + d[1]; })),
      "Stel het je voor: ongeveer " + ans + ". De andere keuzes zijn veel te kort of te lang.");
  });
  // t35: kort verhaal
  [["Film", 19, 30, 105], ["Film", 20, 15, 95], ["Spel", 14, 30, 90], ["Les", 8, 45, 50], ["Trein", 14, 50, 35], ["Feest", 15, 45, 150], ["Tocht", 10, 40, 80], ["Concert", 19, 50, 70]].forEach(function(p) {
    var S = p[1] * 60 + p[2], E = S + p[3];
    put("t35", p[0] + " om " + tijd(S) + ", duurt " + dur(p[3]) + ". Einde?", tijd(E), tijden(E, [E - 60, E + 10, E - 10]),
      tijd(S) + " + " + dur(p[3]) + " = " + tijd(E) + ".");
  });
  [["Les", 8, 30, 9, 15], ["Zwemmen", 16, 40, 17, 25], ["Gym", 10, 50, 11, 35], ["Bus", 7, 45, 8, 20], ["Pauze", 12, 35, 13, 10], ["Training", 18, 45, 19, 30]].forEach(function(p) {
    var d = (p[3] * 60 + p[4]) - (p[1] * 60 + p[2]), wrong = (p[3] * 100 + p[4]) - (p[1] * 100 + p[2]);
    put("t35", p[0] + " " + p[1] + ":" + pad(p[2]) + " tot " + p[3] + ":" + pad(p[4]) + ": ? min", String(d), nums(d, [wrong, d + 10, d - 5], 5),
      "Tot " + p[3] + ":00 is " + (60 - p[2]) + " min, plus " + p[4] + " = " + d + " minuten.");
  });
  // t36: fout spotten (één foute regel tussen drie juiste)
  var GOOD = [], BAD = [];
  for (var h = 2; h <= 9; h++) {
    GOOD.push("half " + h + " = " + (h - 1) + ":30");        BAD.push(["half " + h + " = " + h + ":30", "half " + h + " = " + (h - 1) + ":30"]);
    GOOD.push("kwart voor " + h + " = " + (h - 1) + ":45"); BAD.push(["kwart voor " + h + " = " + h + ":45", "kwart voor " + h + " = " + (h - 1) + ":45"]);
    GOOD.push(h + " weken = " + h * 7 + " dagen");          BAD.push([h + " weken = " + h * 10 + " dagen", h + " weken = " + h * 7 + " dagen"]);
    GOOD.push(h + " uur = " + h * 60 + " min");             BAD.push([h + " uur = " + h * 100 + " min", h + " uur = " + h * 60 + " min"]);
  }
  [[1, 5], [2, 5], [3, 5]].forEach(function(p) {
    var good = p[0] + ",5 uur = " + p[0] + "u30";
    GOOD.push(good); BAD.push([p[0] + ",5 uur = " + p[0] + "u50", good]);
  });
  BAD.forEach(function(b, i) {
    var g3 = [], k = i * 7 + 3;
    while (g3.length < 3) { var g = GOOD[k % GOOD.length]; if (g !== b[1] && g3.indexOf(g) < 0) g3.push(g); k += 5; }
    put("t36", "Welke is FOUT?", b[0], [b[0]].concat(g3), "Goed is: " + b[1] + ".", "fout");
  });
})();

// Niet-afbrekende spatie tussen getal en eenheid in vragen en (niet fout-spot) keuzes
var UNIT_RE = /(\d) (min|uur|sec|dagen|dag|weken|week|maanden|maand|jaar|eeuwen|eeuw|decennia|kwartier)(?=[\s:.?,]|$)/g;
Object.keys(P).forEach(function(id) { P[id].forEach(function(it) {
  it.question = it.question.replace(UNIT_RE, "$1" + NB + "$2");
  if (it.kind !== "fout") it.answer = it.answer.replace(UNIT_RE, "$1" + NB + "$2");
  if (it.kind !== "fout") it.choices = it.choices.map(function(c) { return c.replace(UNIT_RE, "$1" + NB + "$2"); });
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

var G1  = "Klok lezen";
var G2  = "24-uursklok";
var G3  = "Eenheden van tijd";
var G4  = "Duur";
var G5  = "Begin- en eindtijd";
var G6  = "Rekenen met duur";
var G7  = "Kalender";
var G8  = "Rooster en jaren";
var G9  = "Toepassen";
var G10 = "Slot";

var BLOCK_GROUPS = [G1, G2, G3, G4, G5, G6, G7, G8, G9];

// [id, label, groep, desc, strategy, uitleg, voorbeeld, minCorrect]
var DEFS = [
  ["t01_half_heel", "Hele en halve uren", G1, "half 4 = 3:30", "klok lezen",
    "Half 4 betekent: een half uur vóór 4 uur. Dat is 3:30, niet 4:30. Bij half kijk je dus altijd naar het uur dat nog moet komen.",
    "half 7 = ?\nEen half uur vóór 7 uur.\nAntwoord: 6:30.", 8],
  ["t02_kwart", "Kwart over en kwart voor", G1, "kwart voor 5 = 4:45", "klok lezen",
    "Een kwartier is 15 minuten. Kwart over 3 is 15 minuten na 3 uur: 3:15. Kwart voor 3 is 15 minuten vóór 3 uur: 2:45.",
    "kwart voor 9 = ?\n15 minuten vóór 9 uur.\nAntwoord: 8:45.", 8],
  ["t03_vijf_tien", "Vijf en tien over of voor", G1, "tien voor 4 = 3:50", "klok lezen",
    "Over: na het hele uur. Voor: vóór het hele uur. Tien over 4 is 4:10, tien voor 4 is 3:50.",
    "vijf voor 8 = ?\n5 minuten vóór 8 uur.\nAntwoord: 7:55.", 8],
  ["t04_rond_half", "Rond half", G1, "tien voor half 5 = 4:20", "klok lezen",
    "Rond half reken je vanaf half. Half 5 is 4:30. Tien voor half 5 is 10 minuten eerder: 4:20. Vijf over half 5 is 5 minuten later: 4:35.",
    "tien over half 3 = ?\nHalf 3 = 2:30, plus 10 minuten.\nAntwoord: 2:40.", 8],
  ["t05_in_woorden", "Tijd in woorden", G1, "3:40 = tien over half 4", "klok lezen",
    "Tot kwart over zeg je over of voor het uur. Van 3:20 tot 3:40 reken je vanaf half 4. Vanaf kwart voor zeg je voor het volgende uur.",
    "3:25 in woorden?\nHalf 4 is 3:30, 5 minuten eerder.\nAntwoord: vijf voor half 4.", 8],
  ["t06_middag_avond", "'s Middags en 's avonds", G2, "3 uur 's middags = 15:00", "24 uur",
    "Op een digitale klok tel je na 12 uur 's middags door: 1 uur 's middags is 13:00, 7 uur 's avonds is 19:00. Je telt er 12 bij op.",
    "4 uur 's middags = ?\n4 + 12 = 16.\nAntwoord: 16:00.", 8],
  ["t07_nacht_ochtend", "'s Nachts en 's ochtends", G2, "12 uur 's nachts = 0:00", "24 uur",
    "Om middernacht begint een nieuwe dag: 12 uur 's nachts is 0:00. 12 uur 's middags is 12:00. 's Nachts en 's ochtends blijft het uur gewoon zo: 7 uur 's ochtends is 7:00.",
    "half 1 's nachts = ?\nEen half uur na middernacht.\nAntwoord: 0:30.", 8],
  ["t08_woorden_24uur", "Woorden en 24 uur", G2, "kwart over 7 's avonds = 19:15", "24 uur",
    "Zet eerst de woorden om naar de klok (kwart over 7 = 7:15). Is het 's middags of 's avonds, tel dan 12 bij het uur op: 19:15.",
    "half 9 's avonds = ?\nHalf 9 = 8:30, plus 12 uur.\nAntwoord: 20:30.", 8],
  ["t09_uren_minuten", "Uren en minuten", G3, "90 min = 1u30", "omrekenen",
    "1 uur is 60 minuten, niet 100. 2 uur = 120 min. Andersom: haal er steeds 60 af. 90 min = 1 uur en 30 min = 1u30.",
    "150 min = ?\n150 − 60 − 60 = 30.\nAntwoord: 2u30.", 8],
  ["t10_minuten_seconden", "Minuten en seconden", G3, "2 min = 120 sec", "omrekenen",
    "1 minuut is 60 seconden. 3 min = 180 sec. Andersom deel je door 60.",
    "5 min = ? sec\n5 × 60.\nAntwoord: 300.", 8],
  ["t11_dagen_weken", "Dagen en weken", G3, "3 weken = 21 dagen", "omrekenen",
    "1 week is 7 dagen. 3 weken = 21 dagen. Andersom deel je door 7.",
    "2 weken 3 dagen = ? dagen\n14 + 3.\nAntwoord: 17.", 8],
  ["t12_vaste_feiten", "Vaste tijdsfeiten", G3, "1 dag = 24 uur", "weten",
    "1 dag = 24 uur, 1 week = 7 dagen, 1 jaar = 12 maanden, een gewoon jaar = 365 dagen. Een jaar is ongeveer 52 weken: 52 × 7 = 364, net iets minder.",
    "1 jaar = ? maanden\nJanuari tot en met december.\nAntwoord: 12.", 8],
  ["t13_kwartier", "Kwartier en half uur", G3, "3 kwartier = 45 min", "omrekenen",
    "Een kwartier is een kwart uur: 15 minuten. Een half uur is 30 minuten. 3 kwartier = 45 minuten.",
    "5 kwartier = ?\n5 × 15 = 75 min.\nAntwoord: 1u15.", 8],
  ["t14_duur_binnen_uur", "Duur binnen het uur", G4, "Van 9:10 tot 9:45 = 35 min", "verschil",
    "Blijft het uur gelijk, dan trek je alleen de minuten af. Van 9:10 tot 9:45: 45 − 10 = 35 minuten.",
    "Van 14:05 tot 14:40: ? min\n40 − 5.\nAntwoord: 35.", 8],
  ["t15_duur_over_uur", "Duur over het hele uur", G4, "Van 9:45 tot 10:20 = 35 min", "aanvullen",
    "Ga eerst naar het hele uur, dan verder. Van 9:45 tot 10:00 is 15 min, daarna nog 20 min: samen 35. Niet 1020 − 945 = 75: een uur heeft 60 minuten, geen 100.",
    "Van 8:50 tot 9:15: ? min\n10 + 15.\nAntwoord: 25.", 8],
  ["t16_duur_uren", "Duur in uren en minuten", G4, "Van 8:30 tot 11:15 = 2u45", "aanvullen",
    "Vul eerst aan tot het hele uur, tel dan de hele uren, dan de rest. Van 8:30 tot 9:00 is 30 min, tot 11:00 nog 2 uur, dan 15 min. Samen 2u45.",
    "Van 7:50 tot 9:10: hoe lang?\n10 min + 1 uur + 10 min.\nAntwoord: 1u20.", 8],
  ["t17_ochtend_middag", "Van ochtend naar middag", G4, "10:30 + 4 uur = 14:30", "24 uur",
    "Na 12:00 tel je gewoon door: 13:00, 14:00, ... 10:30 + 4 uur = 14:30. Rekenen van ochtend naar middag: eerst tot 12:00, dan verder.",
    "11:15 + 3 uur = ?\n11 + 3 = 14.\nAntwoord: 14:15.", 8],
  ["t18_eindtijd", "Eindtijd", G5, "Start 9:45, 1u30: eind 11:15", "vooruit rekenen",
    "Tel de duur bij de begintijd op. Ga eerst naar het hele uur en tel daarna verder. 9:45 + 1u30: 9:45 + 15 min = 10:00, dan nog 1u15: 11:15.",
    "Start 8:50, duur 40 min. Eind?\n10 min tot 9:00, dan nog 30.\nAntwoord: 9:30.", 8],
  ["t19_begintijd", "Begintijd", G5, "Eind 11:15, 1u30: start 9:45", "terug rekenen",
    "Reken terug: haal de duur van de eindtijd af. Ga eerst terug naar het hele uur. 11:15 − 1u30: terug naar 11:00 is 15 min, dan nog 1u15 terug: 9:45.",
    "Eind 10:20, duur 35 min. Start?\n20 min terug is 10:00, dan nog 15.\nAntwoord: 9:45.", 8],
  ["t20_later", "Hoe laat over ...", G5, "8:50 + 25 min = 9:15", "vooruit rekenen",
    "Ga eerst naar het hele uur en tel daarna de rest erbij. 8:50 + 25 min: 10 min tot 9:00, dan nog 15: 9:15.",
    "Het is 10:45. Over 30 min?\n15 min tot 11:00, dan nog 15.\nAntwoord: 11:15.", 8],
  ["t21_eerder", "Hoe laat ... geleden", G5, "10:10 − 25 min = 9:45", "terug rekenen",
    "Ga eerst terug naar het hele uur en daarna verder terug. 10:10 − 25 min: 10 min terug is 10:00, dan nog 15: 9:45.",
    "Het is 13:05. 15 min geleden?\n5 min terug is 13:00, dan nog 10.\nAntwoord: 12:50.", 8],
  ["t22_duur_optellen", "Duur optellen", G6, "1u40 + 2u35 = 4u15", "uren en minuten",
    "Tel uren bij uren en minuten bij minuten. Zijn het 60 minuten of meer, dan wordt 60 minuten 1 uur. 40 + 35 = 75 min = 1u15 erbij.",
    "45 min + 30 min = ?\n75 min = 1 uur en 15 min.\nAntwoord: 1u15.", 8],
  ["t23_duur_aftrekken", "Duur aftrekken", G6, "2u10 − 45 min = 1u25", "uren en minuten",
    "Zijn er te weinig minuten, leen dan 1 uur = 60 minuten. 2u10 − 45 min: 1u70 − 45 min = 1u25.",
    "3u15 − 1u40 = ?\n2u75 − 1u40.\nAntwoord: 1u35.", 8],
  ["t24_duur_keer", "Duur keer", G6, "4 × 15 min = 1 uur", "vermenigvuldigen",
    "Reken eerst in minuten en zet het dan om naar uren. 3 × 25 min = 75 min = 1u15.",
    "4 × 20 min = ?\n80 min = 1 uur en 20 min.\nAntwoord: 1u20.", 8],
  ["t25_duur_verdelen", "Duur verdelen", G6, "1 uur over 4 = 15 min", "delen",
    "Zet de uren eerst om naar minuten en deel dan. 1 uur = 60 min. 60 : 4 = 15 min. Niet 100 : 4: een uur heeft 60 minuten.",
    "2 uur over 3: ? min per stuk\n120 : 3.\nAntwoord: 40.", 8],
  ["t26_dagen_week", "Dagen van de week", G7, "3 dagen na vrijdag = maandag", "doortellen",
    "De week: maandag, dinsdag, woensdag, donderdag, vrijdag, zaterdag, zondag. Na zondag begint het weer bij maandag. Tel de dagen één voor één.",
    "2 dagen na zaterdag?\nZondag, maandag.\nAntwoord: maandag.", 8],
  ["t27_maanden", "Maanden", G7, "2 maanden na november = januari", "doortellen",
    "De 12 maanden: januari, februari, maart, april, mei, juni, juli, augustus, september, oktober, november, december. Na december begint het weer bij januari.",
    "3 maanden na oktober?\nNovember, december, januari.\nAntwoord: januari.", 8],
  ["t28_dagen_maand", "Dagen per maand", G7, "april heeft 30 dagen", "weten",
    "30 dagen: april, juni, september en november. Februari heeft in een gewoon jaar 28 dagen. Alle andere maanden hebben 31 dagen.",
    "Hoeveel dagen heeft juni?\nJuni hoort bij de 30.\nAntwoord: 30.", 8],
  ["t29_datum_plus", "Datum verder", G7, "12 maart + 1 week = 19 maart", "doortellen",
    "1 week is 7 dagen. Tel de dagen bij de datum op. Kom je voorbij het einde van de maand, ga dan door in de volgende maand: 28 april + 5 dagen = 3 mei (april heeft 30 dagen).",
    "10 juni + 2 weken = ?\n10 + 14 = 24.\nAntwoord: 24 juni.", 8],
  ["t30_dagen_na", "Hoeveel dagen later", G7, "Na 3 mei is 10 mei: 7 dagen", "verschil",
    "Hoeveel dagen na 3 mei is 10 mei? Tel de dagen die voorbijgaan: 10 − 3 = 7 dagen. De begindag tel je niet mee; met beide dagen erbij (8) tel je er één te veel.",
    "Hoeveel dagen na 4 juni is 11 juni?\n11 − 4.\nAntwoord: 7.", 8],
  ["t31_rooster", "Rooster", G8, "Bus :15 en :45, na 8:20 komt 8:45", "rooster lezen",
    "Een bus die elk uur om :15 en :45 rijdt, vertrekt om 8:15, 8:45, 9:15, ... Zoek het eerste vertrek ná de gegeven tijd.",
    "Bus :00, :20, :40. Na 7:25?\n7:20 is al geweest.\nAntwoord: 7:40.", 8],
  ["t32_jaartallen", "Jaartallen", G8, "Na 1998 is 2026: 28 jaar", "verschil",
    "Het verschil tussen twee jaartallen reken je uit met aftrekken: 2026 − 1998 = 28 jaar. Wie in 2026 10 wordt, is geboren in 2026 − 10 = 2016.",
    "Hoeveel jaar na 2010 is 2026?\n2026 − 2010.\nAntwoord: 16.", 8],
  ["t33_decennium_eeuw", "Decennium en eeuw", G8, "1 eeuw = 100 jaar", "omrekenen",
    "Een decennium is 10 jaar. Een eeuw is 100 jaar. Een eeuw heeft dus 10 decennia.",
    "3 eeuwen = ? jaar\n3 × 100.\nAntwoord: 300.", 8],
  ["t34_duur_schatten", "Duur schatten", G9, "Tanden poetsen: ongeveer 2 min", "voorstellen",
    "Stel je voor hoe lang iets duurt. Een liedje duurt een paar minuten, een film een paar uur. Een antwoord dat veel te kort of veel te lang is, kan niet kloppen.",
    "Een film duurt ongeveer?\nLanger dan een les, korter dan een dag.\nAntwoord: 2 uur.", 8],
  ["t35_kort_verhaal", "Kort verhaal", G9, "Film om 19:30, 1u45: einde 21:15", "toepassen",
    "Zoek uit wat gevraagd wordt: een eindtijd of hoe lang iets duurt. Reken dan via het hele uur.",
    "Film om 20:15, duurt 1u35. Einde?\n20:15 + 45 min = 21:00, dan nog 50.\nAntwoord: 21:50.", 8],
  ["t36_fout_spotten", "Fout spotten: tijd", G9, "half 4 = 4:30 is fout", "controleren",
    "Veel gemaakte fouten: half 4 = 4:30 (goed is 3:30), 1 uur = 100 min (goed is 60), 2 weken = 20 dagen (goed is 14) en 1,5 uur = 1u50 (goed is 1u30).",
    "Welke is FOUT?\nkwart voor 6 = 6:45 → goed is 5:45.\nDie is fout.", 12],
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
    // Pool via het korte ID (t01), stapel per volledige skill-ID
    make:       function() { return pick(poolId, d[0]); },
  };
});

// ─────────────────────────────────────────────────────────────────
// SKILLS MET VRAAGVERLOOP + t37 SNELHEIDSRONDE
// ─────────────────────────────────────────────────────────────────

var SKILLS = createSkills("tijd", RAW_SKILLS);
var MIXER  = createMixer(RAW_SKILLS, BLOCK_GROUPS, SKILLS.byId);

export var TIJD_SKILLS = SKILLS.list;

registerSkillId("tijd", "t37_snelheid");

TIJD_SKILLS.push({
  id:         "t37_snelheid",
  label:      "Snelheidsronde",
  group:      G10,
  desc:       "Gemengd: klok, duur en kalender",
  strategy:   "snel",
  tip:        "Kijk eerst wat er gevraagd wordt: een tijdstip, een duur of een datum. Reken dan via het hele uur of tel de dagen.",
  uitleg:     "In de snelheidsronde komen alle soorten tijdvragen door elkaar voorbij. Kies per vraag de aanpak die je hebt geleerd.",
  voorbeeld:  "Gemengd, bijvoorbeeld:\nhalf 4 = ?, 90 min = ?, 2 dagen na vrijdag",
  minCorrect: 15,
  generate:   MIXER.generate,
});

export var TIJD_ORDER = TIJD_SKILLS.map(function(s) { return s.id; });

// Voor tests: de vaste pools (alleen lezen)
export var TIJD_POOLS = P;
