// Onderdeel Kommagetallen: skills, volgorde en kommagetal-specifieke generatoren (ontwerp B1).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Het vraagverloop (rekenmoment, geschiedenis, subtypen, stapels, gemengde ronde) staat in ./flow.js.
// Alle waarden worden intern in DUIZENDSTEN berekend (gehele getallen, nooit kommagetallen in JS).
// Notatie (B1):
//   N1 komma, voorloopnul, kortste vorm ("0,5", "2,5", "1")
//   N2 een nul aan het eind alleen in k12 (gelijkwaardig, "0,50") en k14/k15 (expliciet
//      "afgerond op tienden": "2,0", "4,0")
//   N3 basis twee decimalen; duizendsten alleen in k02, k03, k08 (1/8) en k19. Bewuste
//      foutnotatie alleen als afleider: k15 "3,10" (overgangsfout) en k16 "3,450" (nul erachter)
// Elke vraag heeft 4 keuzes met 4 verschillende WAARDEN (nooit "0,5" en "0,50" samen) en precies
// één juist antwoord. Antwoorden en keuzes ≤ 5 tekens; fout-spot-regels ≤ 16 tekens.

import { rnd, shuffle, gcd } from "./helpers.js";
import { registerSkillId, createSkills, createMixer, deckPick } from "./flow.js";

var MIN    = "−";
var TIMES  = " × ";
var DIV    = " : ";
var APPROX = "≈";
var FULL   = "■";
var EMPTY  = "□";

var T = 100;   // één tiende in duizendsten
var H = 10;    // één honderdste in duizendsten
var ONE = 1000;

var MAX_LEN = 5;
var MAX_ROW = 16;

// ─────────────────────────────────────────────────────────────────
// NOTATIE-HELPERS (waarden in duizendsten)
// ─────────────────────────────────────────────────────────────────

// Kortste vorm: 2500 -> "2,5", 3000 -> "3", 125 -> "0,125"
function fmt(v) {
  var e = Math.floor(v / ONE);
  var r = v % ONE;
  if (r === 0) return String(e);
  var d = String(r);
  while (d.length < 3) d = "0" + d;
  while (d.charAt(d.length - 1) === "0") d = d.slice(0, -1);
  return e + "," + d;
}

// Vast aantal decimalen: (500, 2) -> "0,50", (4000, 1) -> "4,0"
function fmtD(v, decimals) {
  var e = Math.floor(v / ONE);
  var d = String(v % ONE);
  while (d.length < 3) d = "0" + d;
  return e + "," + d.slice(0, decimals);
}

// Aantal decimalen in een tekst
function decs(s) {
  var i = s.indexOf(",");
  return i < 0 ? 0 : s.length - i - 1;
}

function pickFrom(list) { return list[rnd(0, list.length - 1)]; }

// Vier keuzes, uniek in WAARDE: het antwoord + de eerste 3 geldige kandidaten, daarna reserve.
// Een kandidaat is een waarde (wordt fmt) of { v: waarde, s: tekst } voor een bewuste foutnotatie.
// Kandidaten ≤ 0, langer dan 5 tekens of met te veel decimalen vallen af.
function valueChoices(ansV, ansS, cands, maxDec) {
  var md   = maxDec || 2;
  var out  = [ansS];
  var seen = {};
  seen[ansV] = true;
  function add(c) {
    if (out.length >= 4 || c === null || c === undefined) return;
    var isObj = typeof c === "object";
    var v = isObj ? c.v : c;
    var s = isObj ? c.s : fmt(v);
    if (typeof v !== "number" || v <= 0 || v % 1 !== 0 || seen[v] || s.length > MAX_LEN) return;
    if (!isObj && decs(s) > md) return;
    seen[v] = true;
    out.push(s);
  }
  cands.forEach(add);
  for (var k = 1; k < 40 && out.length < 4; k++) { add(ansV + k * T); add(ansV - k * T); }
  return shuffle(out);
}

function numQ(question, ansV, cands, terms, maxDec) {
  var s = fmt(ansV);
  return { terms: terms, question: question, answer: s, choices: valueChoices(ansV, s, cands, maxDec) };
}

// Keuzevraag met vaste teksten (cijfers, breuken, getallen); answer is één van de teksten
function textQ(question, answer, others, terms) {
  return { terms: terms, question: question, answer: answer, choices: shuffle([answer].concat(others)) };
}

// ─────────────────────────────────────────────────────────────────
// VASTE LIJSTEN MET MOGELIJKE VRAGEN (B1)
// ─────────────────────────────────────────────────────────────────

var DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// k01: [vorm, tienden]
var ITEMS_STROOK = [];
for (var sn = 1; sn <= 9; sn++) { ITEMS_STROOK.push([0, sn]); ITEMS_STROOK.push([1, sn]); }

// k02/k03: [heel, tienden, honderdsten] met drie verschillende cijfers, niet 0
var ITEMS_CIJFERS = [];
DIGITS.forEach(function(e) { DIGITS.forEach(function(t) { DIGITS.forEach(function(h) {
  if (e !== t && e !== h && t !== h) ITEMS_CIJFERS.push([e, t, h]);
}); }); });

// k06: [vorm, tienden]
var ITEMS_TIENDEN_BREUK = [];
for (var tn = 1; tn <= 9; tn++) { ITEMS_TIENDEN_BREUK.push([0, tn]); ITEMS_TIENDEN_BREUK.push([1, tn]); }

// k07: honderdsten 1–99 zonder tientallen
var ITEMS_HONDERDSTEN = [];
for (var hn = 1; hn <= 99; hn++) { if (hn % 10 !== 0) ITEMS_HONDERDSTEN.push(hn); }

// k08: bekende breuken [teller, noemer, waarde]; 1/8 = 0,125 is de enige met duizendsten
var KNOWN = [[1, 2, 500], [1, 4, 250], [3, 4, 750], [1, 5, 200], [2, 5, 400], [3, 5, 600], [4, 5, 800], [1, 10, 100], [1, 8, 125]];
var ITEMS_BEKEND = [];
KNOWN.forEach(function(k, i) { ITEMS_BEKEND.push([0, i]); ITEMS_BEKEND.push([1, i]); });

// k09: 0,05 – 0,95 in stappen van 0,05 (in honderdsten)
var ITEMS_NAAR_BREUK = [];
for (var bh = 5; bh <= 95; bh += 5) ITEMS_NAAR_BREUK.push(bh);
// Familie van breuken in eenvoudigste vorm met noemer 2, 4, 5, 10, 20 (afleiders k09)
var FAM = [];
[2, 4, 5, 10, 20].forEach(function(dn) { for (var nn = 1; nn < dn; nn++) { if (gcd(nn, dn) === 1) FAM.push([nn, dn]); } });

// k15: [heel, honderdsten-cijfer 6–9] → x,96 – x,99
var ITEMS_OVERGANG = [];
for (var oe = 0; oe <= 19; oe++) {
  for (var oh = 6; oh <= 9; oh++) { if (fmt(oe * ONE + 900 + oh * H).length <= MAX_LEN) ITEMS_OVERGANG.push([oe, oh]); }
}

// k31: getallen rond een heel getal (± 0,1 of 0,2)
var NEAR = [];
for (var ne = 1; ne <= 9; ne++) { [-200, -100, 100, 200].forEach(function(d) { NEAR.push(ne * ONE + d); }); }

// k33: context zonder eenheden omrekenen
var CTX = [["flessen van", "liter"], ["planken van", "meter"], ["zakken van", "kilo"]];

// k34: fout spotten optellen. A: tienden als honderdsten opgeteld; B: overgang als "0,13".
function sumLine(a, b, s) { return fmt(a) + " + " + fmt(b) + " = " + s; }
var FOUT34_A = [], FOUT34_B = [], GOED34 = [];
DIGITS.forEach(function(a) {
  for (var hb = 11; hb <= 99; hb++) {
    if (hb % 10 === 0) continue;
    var wrong = sumLine(a * T, hb * H, fmt(a * H + hb * H));
    if (wrong.length <= MAX_ROW) FOUT34_A.push({ s: wrong, t: [a * T, hb * H] });
    var good = sumLine(a * T, hb * H, fmt(a * T + hb * H));
    if (good.length <= MAX_ROW) GOED34.push(good);
  }
});
DIGITS.forEach(function(a) {
  for (var b = 10 - a; b <= 9; b++) {
    FOUT34_B.push({ s: sumLine(a * T, b * T, "0," + (a + b)), t: [a * T, b * T] });
    GOED34.push(sumLine(a * T, b * T, fmt((a + b) * T)));
  }
});

// k35: fout spotten × 10 en : 10. A: nul erachter (1,8 × 10 = 1,80); B: nul ertussen (48 : 10 = 4,08)
var FOUT35_A = [], FOUT35_B = [], GOED35 = [];
for (var fv = 1100; fv <= 9900; fv += 100) {
  if (fv % ONE === 0) continue;
  FOUT35_A.push({ s: fmt(fv) + TIMES + "10 = " + fmt(fv) + "0", t: [fv, 0] });
  GOED35.push(fmt(fv) + TIMES + "10 = " + fmt(fv * 10));
}
for (var fw = 11; fw <= 99; fw++) {
  if (fw % 10 === 0) continue;
  FOUT35_B.push({ s: fw + DIV + "10 = " + Math.floor(fw / 10) + ",0" + (fw % 10), t: [fw * ONE, 1] });
  GOED35.push(fw + DIV + "10 = " + fmt(fw * 100));
}

// ─────────────────────────────────────────────────────────────────
// SKILL DEFINITIONS
// ─────────────────────────────────────────────────────────────────

var G1  = "Begrijpen";
var G2  = "Breuk en kommagetal";
var G3  = "Vergelijken";
var G4  = "Afronden";
var G5  = "Keer en delen door 10, 100, 1000";
var G6  = "Optellen en aftrekken";
var G7  = "Vermenigvuldigen en delen";
var G8  = "Toepassen";
var G9  = "Controleren";
var G10 = "Slot";

var BLOCK_GROUPS = [G1, G2, G3, G4, G5, G6, G7, G8, G9];

var PLACE = ["tienden", "honderdsten", "duizendsten"];

// Fout-spot-vraag: één foute regel + 3 verschillende juiste regels
function errorQ(wrong, goodList, terms) {
  var good = [];
  var pool = shuffle(goodList);
  for (var i = 0; i < pool.length && good.length < 3; i++) {
    if (pool[i] !== wrong.s && good.indexOf(pool[i]) === -1) good.push(pool[i]);
  }
  return {
    terms:          terms,
    question:       "Welke som is FOUT?",
    answer:         wrong.s,
    choices:        shuffle([wrong.s].concat(good)),
    isErrorSpotter: true,
    // Langere regels: kleinere knopletter (bestaande vlag, zie PracticeScreen)
    smallChoices:   true,
  };
}

var RAW_SKILLS = [

  // ── BLOK 1: BEGRIJPEN ──────────────────────────────────────────

  {
    id: "k01_tienden_strook",
    label: "Tienden op een strook",
    group: G1,
    desc: "■■■□□ □□□□□ = 0,3",
    strategy: "tellen",
    tip: function(t) { return "2 rijen van 5 = 10 vakjes. Elk vakje is 0,1. " + t[1] + " vakjes is " + fmt(t[1] * T) + "."; },
    uitleg: "Verdeel een geheel in 10 gelijke stukken: hier 2 rijen van 5 = 10 vakjes. Eén vakje is een tiende: 0,1. Drie vakjes is 0,3. Het cijfer achter de komma telt de tienden.",
    voorbeeld: "■■■■■\n■■□□□\n7 van de 10 vakjes.\nAntwoord: 0,7.",
    minCorrect: 8,
    deck: true,
    make: function() {
      var it = deckPick("k01_tienden_strook", ITEMS_STROOK);
      var n = it[1];
      if (it[0] === 0) {
        // 2 rijen van 5: één rij van 10 vakjes past niet in de vraagkaart (kolomweergave, 44 px)
        var cells = FULL.repeat(n) + EMPTY.repeat(10 - n);
        var q = cells.slice(0, 5) + "\n" + cells.slice(5) + "\nWelk deel?";
        return numQ(q, n * T, [(10 - n) * T, n * H, n * ONE, (n + 1) * T], it);
      }
      return numQ(fmt(n * T) + " = hoeveel tienden?", n * ONE, [n * 10 * ONE, (10 - n) * ONE, (n + 1) * ONE, (n - 1) * ONE], it);
    },
  },

  {
    id: "k02_plaats_cijfer",
    label: "Plaats van een cijfer",
    group: G1,
    desc: "In 4,73 staat 7 op de tienden",
    strategy: "plaatswaarde",
    tip: function(t) { return "Direct achter de komma staan de tienden, daarna de honderdsten, daarna de duizendsten."; },
    uitleg: "Achter de komma heeft elke plaats een naam. De eerste plaats na de komma zijn de tienden, de tweede de honderdsten, de derde de duizendsten. In 4,73 staat 7 op de tienden en 3 op de honderdsten.",
    voorbeeld: "4,73: cijfer op de honderdsten?\nDe tweede plaats na de komma.\nAntwoord: 3.",
    minCorrect: 8,
    subtypes: 5,
    // Subtypen: tienden, honderdsten, tienden, honderdsten, duizendsten (duizendsten blijft uitzondering)
    make: function(sub) {
      var p = pickFrom(ITEMS_CIJFERS);
      var e = p[0], t = p[1], h = p[2];
      var rest = DIGITS.filter(function(x) { return x !== e && x !== t && x !== h; });
      if (sub === 4) {
        var d = pickFrom(rest);
        var num3 = e + "," + t + h + d;
        return textQ(num3 + ": cijfer op de duizendsten?", String(d), [String(e), String(t), String(h)], [2, num3]);
      }
      var place = sub % 2;
      var num = e + "," + t + h;
      var ans = place === 0 ? t : h;
      var others = [e, place === 0 ? h : t, pickFrom(rest)].map(String);
      return textQ(num + ": cijfer op de " + PLACE[place] + "?", String(ans), others, [place, num]);
    },
  },

  {
    id: "k03_waarde_cijfer",
    label: "Waarde van een cijfer",
    group: G1,
    desc: "De 3 in 2,35 is 0,3 waard",
    strategy: "plaatswaarde",
    tip: function(t) { return "Op de " + PLACE[t[0]] + " is een cijfer " + (t[0] === 0 ? "tienden" : "honderdsten") + " waard: " + t[1] + " " + PLACE[t[0]] + " = " + fmt(t[0] === 0 ? t[1] * T : t[1] * H) + "."; },
    uitleg: "Een cijfer is meer of minder waard, afhankelijk van de plaats. In 2,35 staat de 3 op de tienden: hij is 0,3 waard. De 5 staat op de honderdsten: hij is 0,05 waard.",
    voorbeeld: "Wat is de 8 waard in 1,48?\nDe 8 staat op de honderdsten.\nAntwoord: 0,08.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: cijfer op de tienden, cijfer op de honderdsten
    make: function(sub) {
      var p = pickFrom(ITEMS_CIJFERS);
      var e = p[0], t = p[1], h = p[2];
      var num = e + "," + t + h;
      if (sub === 0) return numQ("Wat is de " + t + " waard in " + num + "?", t * T, [t * ONE, t * H, t * 10 * ONE], [0, t]);
      return numQ("Wat is de " + h + " waard in " + num + "?", h * H, [h * T, h * ONE, h], [1, h], 3);
    },
  },

  {
    id: "k04_samenstellen",
    label: "Getal samenstellen",
    group: G1,
    desc: "2 + 0,4 + 0,07 = 2,47",
    strategy: "plaatswaarde",
    tip: function(t) { return t[0] + " hele, " + t[1] + " tienden en " + t[2] + " honderdsten: " + fmt(t[0] * ONE + t[1] * T + t[2] * H) + "."; },
    uitleg: "Zet elk deel op zijn plaats. 2 + 0,4 + 0,07: de 2 voor de komma, de 4 op de tienden, de 7 op de honderdsten. Samen 2,47.",
    voorbeeld: "3 + 0,2 + 0,05 = ?\n3 hele, 2 tienden, 5 honderdsten.\nAntwoord: 3,25.",
    minCorrect: 8,
    make: function() {
      var e = rnd(1, 9), t, h;
      do { t = rnd(1, 9); h = rnd(1, 9); } while (t === h);
      var v = e * ONE + t * T + h * H;
      return numQ(e + " + 0," + t + " + 0,0" + h + " = ?", v, [e * ONE + h * T + t * H, e * ONE + t * T, (e * 10 + t) * ONE + h * T], [e, t, h]);
    },
  },

  {
    id: "k05_getallenlijn",
    label: "Midden op de getallenlijn",
    group: G1,
    desc: "Midden tussen 2,4 en 2,5 = 2,45",
    strategy: "getallenlijn",
    tip: function(t) { return "Tussen " + fmt(t[0]) + " en " + fmt(t[0] + T) + " passen 10 honderdsten. Het midden is 5 honderdsten verder: " + fmt(t[0] + 50) + "."; },
    uitleg: "Tussen twee tienden liggen 10 honderdsten. Tussen 2,4 en 2,5 liggen 2,41, 2,42, ... 2,49. Het midden is 5 honderdsten verder: 2,45.",
    voorbeeld: "Midden tussen 0,7 en 0,8?\n0,70 ... 0,80, het midden is 0,75.\nAntwoord: 0,75.",
    minCorrect: 8,
    make: function() {
      var a = rnd(1, 98) * T;
      var m = a + 50;
      return numQ("Midden tussen " + fmt(a) + " en " + fmt(a + T) + "?", m, [a + 500, m + T, m - T, a + 5], [a]);
    },
  },

  // ── BLOK 2: BREUK EN KOMMAGETAL ────────────────────────────────

  {
    id: "k06_tienden_breuk",
    label: "Tienden als breuk",
    group: G2,
    desc: "3/10 = 0,3",
    strategy: "omzetten",
    tip: function(t) { return t[1] + "/10 is " + t[1] + " tienden: " + fmt(t[1] * T) + "."; },
    uitleg: "Een tiende is 1/10, en dat schrijf je als 0,1. 3/10 is 3 tienden: 0,3. Andersom: 0,7 is 7 tienden, dus 7/10.",
    voorbeeld: "0,6 = ?/10\n6 tienden.\nAntwoord: 6.",
    minCorrect: 8,
    deck: true,
    make: function() {
      var it = deckPick("k06_tienden_breuk", ITEMS_TIENDEN_BREUK);
      var n = it[1];
      if (it[0] === 0) return numQ(n + "/10 = ?", n * T, [n * H, n * ONE, n * ONE + T], it);
      return numQ(fmt(n * T) + " = ?/10", n * ONE, [n * 10 * ONE, (10 - n) * ONE, (n + 1) * ONE], it);
    },
  },

  {
    id: "k07_honderdsten",
    label: "Honderdsten",
    group: G2,
    desc: "7/100 = 0,07",
    strategy: "omzetten",
    tip: function(t) { return t[0] + "/100 is " + t[0] + " honderdsten: " + fmt(t[0] * H) + ". Honderdsten hebben twee plaatsen achter de komma."; },
    uitleg: "Een honderdste is 1/100 en dat schrijf je als 0,01. Honderdsten gebruiken twee plaatsen achter de komma. 26/100 = 0,26 en 7/100 = 0,07, met een 0 op de tienden.",
    voorbeeld: "9/100 = ?\n9 honderdsten, 0 tienden.\nAntwoord: 0,09.",
    minCorrect: 8,
    make: function() {
      var n = pickFrom(ITEMS_HONDERDSTEN);
      var swap = n < 10 ? (n * 10 + 1) * H : ((n % 10) * 10 + Math.floor(n / 10)) * H;
      return numQ(n + "/100 = ?", n * H, [n * T, n * ONE, swap], [n]);
    },
  },

  {
    id: "k08_bekende_breuken",
    label: "Bekende breuken",
    group: G2,
    desc: "1/4 = 0,25",
    strategy: "onthouden",
    tip: function(t) { return t[0] + "/" + t[1] + " = " + fmt(t[2]) + "."; },
    uitleg: "Sommige breuken kom je vaak tegen. Onthoud ze: 1/2 = 0,5, 1/4 = 0,25, 3/4 = 0,75, 1/5 = 0,2, 1/10 = 0,1. Ook 1/8 = 0,125 (de helft van 0,25).",
    voorbeeld: "3/4 = ?\n3 keer 0,25.\nAntwoord: 0,75.",
    minCorrect: 8,
    deck: true,
    make: function() {
      var it = deckPick("k08_bekende_breuken", ITEMS_BEKEND);
      var k = KNOWN[it[1]];
      var s = k[0] + "/" + k[1];
      if (it[0] === 0) {
        // Afleiders: noemer als kommagetal (1/4 -> 0,4), "1,4", "0,14", daarna ± 0,1
        var c = [k[1] < 10 ? k[1] * T : null, k[1] < 10 ? k[0] * ONE + k[1] * T : null, k[1] < 10 ? k[0] * T + k[1] * H : null, k[2] + T, k[2] - T];
        return numQ(s + " = ?", k[2], c, k, 3);
      }
      var others = KNOWN.filter(function(o) { return o[2] !== k[2]; })
        .sort(function(x, y) { return Math.abs(x[2] - k[2]) - Math.abs(y[2] - k[2]); })
        .slice(0, 3).map(function(o) { return o[0] + "/" + o[1]; });
      return textQ(fmt(k[2]) + " = ?", s, others, k);
    },
  },

  {
    id: "k09_komma_naar_breuk",
    label: "Kommagetal naar breuk",
    group: G2,
    desc: "0,4 = 2/5",
    strategy: "vereenvoudigen",
    tip: function(t) { var g = gcd(t[0], 100); return fmt(t[0] * H) + " = " + t[0] + "/100 = " + (t[0] / g) + "/" + (100 / g) + "."; },
    uitleg: "Schrijf het kommagetal eerst als breuk met 10 of 100 onder de streep, en vereenvoudig dan. 0,4 = 4/10 = 2/5. 0,25 = 25/100 = 1/4.",
    voorbeeld: "0,6 = ? (eenvoudigst)\n0,6 = 6/10 = 3/5.\nAntwoord: 3/5.",
    minCorrect: 8,
    deck: true,
    make: function() {
      var hh = deckPick("k09_komma_naar_breuk", ITEMS_NAAR_BREUK);
      var g = gcd(hh, 100);
      var fr = (hh / g) + "/" + (100 / g);
      var digit = hh % 10 === 0 ? hh / 10 : hh;
      // Afleiders: "1/cijfer" (typische fout) en de dichtstbijzijnde breuken uit de familie;
      // allemaal in eenvoudigste vorm en met een andere waarde (dus nooit 4/10 naast 2/5)
      var fam = FAM.slice().sort(function(x, y) { return Math.abs(x[0] / x[1] - hh / 100) - Math.abs(y[0] / y[1] - hh / 100); });
      var cands = (digit > 1 ? ["1/" + digit] : []).concat(fam.map(function(f) { return f[0] + "/" + f[1]; }));
      var seen = {};
      seen[hh / 100] = true;
      var others = [];
      cands.forEach(function(c) {
        var p = c.split("/");
        var v = +p[0] / +p[1];
        if (others.length < 3 && !seen[v] && c.length <= MAX_LEN && +p[0] < +p[1]) { seen[v] = true; others.push(c); }
      });
      return textQ(fmt(hh * H) + " = ? (eenvoudigst)", fr, others, [hh]);
    },
  },

  // ── BLOK 3: VERGELIJKEN ────────────────────────────────────────

  {
    id: "k10_grootste_kleinste",
    label: "Grootste of kleinste",
    group: G3,
    desc: "0,2 is groter dan 0,14",
    strategy: "vergelijken",
    tip: function() { return "Vergelijk eerst de hele getallen, dan de tienden, dan de honderdsten. Een langer getal is niet altijd groter: 0,2 is meer dan 0,14."; },
    uitleg: "Vergelijk plaats voor plaats van links naar rechts. 0,2 en 0,14: de tienden zijn 2 en 1, dus 0,2 is groter. Het aantal cijfers achter de komma zegt niets over hoe groot een getal is.",
    voorbeeld: "Welk getal is het grootst?\n0,3  0,25  0,03  0,2\nAntwoord: 0,3.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: grootst, kleinst
    make: function(sub) {
      var e = rnd(0, 9), t = rnd(2, 9), h = rnd(1, 9);
      var set = [e * ONE + t * T, e * ONE + (t - 1) * T + h * H, e * ONE + t * H, e * ONE + (t - 1) * T];
      var best = sub === 0 ? Math.max.apply(null, set) : Math.min.apply(null, set);
      var others = set.filter(function(x) { return x !== best; }).map(fmt);
      return textQ(sub === 0 ? "Welk getal is het grootst?" : "Welk getal is het kleinst?", fmt(best), others, [sub]);
    },
  },

  {
    id: "k11_ertussen",
    label: "Wat ligt ertussen",
    group: G3,
    desc: "0,35 ligt tussen 0,3 en 0,4",
    strategy: "getallenlijn",
    tip: function(t) { return "Tussen " + fmt(t[0]) + " en " + fmt(t[0] + T) + " liggen de getallen " + fmt(t[0] + H) + " tot en met " + fmt(t[0] + 9 * H) + "."; },
    uitleg: "Tussen twee tienden liggen honderdsten. Tussen 0,3 en 0,4 liggen 0,31, 0,32, ... 0,39. 0,43 hoort daar niet bij: die ligt na 0,4.",
    voorbeeld: "Wat ligt tussen 1,6 en 1,7?\n1,61 ... 1,69.\nAntwoord bv.: 1,65.",
    minCorrect: 8,
    make: function() {
      var e = rnd(0, 9), t = rnd(0, 8), h = rnd(1, 9);
      var lo = e * ONE + t * T, hi = lo + T, ans = lo + h * H;
      // Afleiders liggen gegarandeerd BUITEN het interval
      var cands = [lo + T + h * H, lo - T + h * H, e * ONE + h * T, lo + h].filter(function(x) { return x > 0 && (x <= lo || x >= hi); });
      for (var k = 2; cands.length < 6; k++) { cands.push(ans + k * 2 * T); }
      return numQ("Wat ligt tussen " + fmt(lo) + " en " + fmt(hi) + "?", ans, cands, [lo]);
    },
  },

  {
    id: "k12_gelijkwaardig",
    label: "Gelijkwaardig",
    group: G3,
    desc: "0,5 = 0,50",
    strategy: "notatie",
    tip: function(t) { return "Een nul achteraan verandert de waarde niet: " + fmt(t[0]) + " = " + fmtD(t[0], 2) + ". Een nul direct na de komma wel: " + Math.floor(t[0] / ONE) + ",0" + ((t[0] % ONE) / T) + " is iets anders."; },
    uitleg: "Zet je een nul achter het laatste cijfer na de komma, dan blijft de waarde gelijk: 0,5 = 0,50 (5 tienden = 50 honderdsten). Een nul direct na de komma verandert wél iets: 0,05 is maar 5 honderdsten.",
    voorbeeld: "Welke is gelijk aan 0,7?\n0,7 = 0,70.\nAntwoord: 0,70.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: zoek de schrijfwijze met een nul erachter; zoek de kortste schrijfwijze
    make: function(sub) {
      var e = rnd(0, 9), t = rnd(1, 9);
      var v = e * ONE + t * T;
      var zeroIn = e + ",0" + t;          // andere waarde
      var tt = e + "," + t + t;           // andere waarde
      if (sub === 0) return textQ("Welke is gelijk aan " + fmt(v) + "?", fmtD(v, 2), [zeroIn, (e * 10 + t) + ",0", tt], [v]);
      return textQ("Welke is gelijk aan " + fmtD(v, 2) + "?", fmt(v), [zeroIn, String(e * 10 + t), tt], [v]);
    },
  },

  // ── BLOK 4: AFRONDEN ───────────────────────────────────────────

  {
    id: "k13_afronden_heel",
    label: "Afronden op een heel getal",
    group: G4,
    desc: "3,6 ≈ 4",
    strategy: "afronden",
    tip: function(t) { return "Kijk alleen naar de tienden: " + Math.floor((t[0] % ONE) / T) + (t[0] % ONE >= 500 ? " is 5 of meer, dus naar boven." : " is minder dan 5, dus naar beneden."); },
    uitleg: "Bij afronden op een heel getal kijk je alleen naar het cijfer op de tienden. 5 of meer: naar boven. Minder dan 5: naar beneden. 3,46 wordt 3, want de tienden zijn 4. Niet eerst naar 3,5 afronden.",
    voorbeeld: "7,28 afgerond op heel getal?\nTienden: 2, minder dan 5.\nAntwoord: 7.",
    minCorrect: 8,
    make: function() {
      var v;
      do { v = rnd(101, 1999) * 10; } while (v % ONE === 500 || v % ONE === 0);
      var r = Math.round(v / ONE);
      var other = Math.floor(v / ONE) === r ? r + 1 : r - 1;
      var twice = Math.round(Math.round(v / T) / 10);
      return numQ(fmt(v) + " afgerond op heel getal?", r * ONE, [other * ONE, twice * ONE, (r + 1) * ONE, (r - 1) * ONE, (r + 2) * ONE], [v]);
    },
  },

  {
    id: "k14_afronden_tienden",
    label: "Afronden op tienden",
    group: G4,
    desc: "2,47 ≈ 2,5",
    strategy: "afronden",
    tip: function(t) { var h = (t[0] % T) / H; return "Kijk naar de honderdsten: " + h + (h >= 5 ? " is 5 of meer, dus de tienden 1 omhoog." : " is minder dan 5, dus de tienden blijven."); },
    uitleg: "Bij afronden op tienden houd je één cijfer achter de komma over. Kijk naar het cijfer op de honderdsten: 5 of meer, dan gaan de tienden 1 omhoog; minder dan 5, dan blijven ze. 2,47 wordt 2,5. 2,43 wordt 2,4.",
    voorbeeld: "6,82 afgerond op tienden?\nHonderdsten: 2, minder dan 5.\nAntwoord: 6,8.",
    minCorrect: 8,
    make: function() {
      var e, t, h, v;
      do { e = rnd(0, 19); t = rnd(0, 8); h = rnd(1, 9); v = e * ONE + t * T + h * H; } while (h === 5 || v < T || fmt(v).length > MAX_LEN);
      var r = Math.round(v / T) * T;
      var other = r > v ? r - T : r + T;
      var whole = Math.round(v / ONE) * ONE;
      // "Op tienden" expliciet gevraagd: antwoord en afleiders met één decimaal; afronden op heel getal
      // als afleider in de kortste vorm (anders zou "2" en "2,0" dezelfde waarde zijn)
      var out = [fmtD(r, 1)], seen = {};
      seen[r] = true;
      [other, whole, r + T, r - T, r + 2 * T].forEach(function(x) {
        if (out.length >= 4 || x < 0 || seen[x]) return;
        seen[x] = true;
        out.push(x === whole && x !== other ? fmt(x) : fmtD(x, 1));
      });
      return { terms: [v], question: fmt(v) + " afgerond op tienden?", answer: fmtD(r, 1), choices: shuffle(out) };
    },
  },

  {
    id: "k15_afronden_overgang",
    label: "Afronden met overgang",
    group: G4,
    desc: "3,96 ≈ 4,0",
    strategy: "afronden",
    tip: function(t) { return "9 tienden + 1 tiende = 10 tienden = 1 hele. Dus " + fmt(t[0]) + " wordt " + fmtD(Math.floor(t[0] / ONE) * ONE + ONE, 1) + " en niet " + Math.floor(t[0] / ONE) + ",10."; },
    uitleg: "Moet je bij 9 tienden er nog 1 bij doen, dan worden het 10 tienden: dat is 1 hele. 3,96 afgerond op tienden: 9 tienden + 1 = 10 tienden = 1 hele erbij. Dus 3,96 wordt 4,0 en niet 3,10.",
    voorbeeld: "5,98 afgerond op tienden?\n9 tienden + 1 = 1 hele erbij.\nAntwoord: 6,0.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_OVERGANG);
      var e = p[0], v = e * ONE + 900 + p[1] * H, r = (e + 1) * ONE;
      // Afleiders: overgangsfout (e,10 — waarde e,1), afgekapt (e,9), te ver (e+1,1). Alle waarden verschillend.
      var choices = [fmtD(r, 1), e + ",10", fmtD(e * ONE + 900, 1), fmtD(r + T, 1)];
      return { terms: [v], question: fmt(v) + " afgerond op tienden?", answer: fmtD(r, 1), choices: shuffle(choices) };
    },
  },

  // ── BLOK 5: KEER EN DELEN DOOR 10, 100, 1000 ───────────────────

  {
    id: "k16_keer_10",
    label: "Keer 10",
    group: G5,
    desc: "3,45 × 10 = 34,5",
    strategy: "komma verschuiven",
    tip: function(t) { return "Keer 10: elk cijfer schuift één plaats naar links, de komma dus één plaats naar rechts. " + fmt(t[0]) + " × 10 = " + fmt(t[0] * 10) + "."; },
    uitleg: "Keer 10 maakt elk cijfer 10 keer zo veel waard: de komma schuift één plaats naar rechts. 3,45 × 10 = 34,5. Een nul erachter zetten (3,450) verandert niets aan de waarde, dat is dus fout.",
    voorbeeld: "0,7 × 10 = ?\nDe komma één plaats naar rechts.\nAntwoord: 7.",
    minCorrect: 8,
    make: function() {
      var v, ans, core;
      do { v = rnd(11, 999) * 10; ans = v * 10; core = fmt(v) + "0"; } while (v % T === 0 || fmt(ans).length > MAX_LEN || core.length > MAX_LEN);
      // Afleider "nul erachter" (waarde = het getal zelf): bewuste foutnotatie, nooit goed
      return numQ(fmt(v) + TIMES + "10 =", ans, [{ v: v, s: core }, v * 100, ans + ONE, ans - ONE], [v, 10]);
    },
  },

  {
    id: "k17_keer_100_1000",
    label: "Keer 100 en 1000",
    group: G5,
    desc: "0,36 × 100 = 36",
    strategy: "komma verschuiven",
    tip: function(t) { return "Keer " + t[1] + ": de komma schuift " + (t[1] === 100 ? "twee" : "drie") + " plaatsen naar rechts. " + fmt(t[0]) + " × " + t[1] + " = " + fmt(t[0] * t[1]) + "."; },
    uitleg: "Keer 100: de komma schuift twee plaatsen naar rechts. Keer 1000: drie plaatsen. Is er geen cijfer meer, dan vul je een nul aan. 0,36 × 100 = 36. 4,2 × 1000 = 4200.",
    voorbeeld: "1,5 × 100 = ?\nDe komma twee plaatsen naar rechts: 150.\nAntwoord: 150.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: × 100, × 1000
    make: function(sub) {
      var f = sub === 0 ? 100 : 1000;
      var v, ans;
      do { v = rnd(11, 999) * 10; ans = v * f; } while (v % T === 0 || fmt(ans).length > MAX_LEN);
      return numQ(fmt(v) + TIMES + f + " =", ans, [v * 10, f === 100 ? v * 1000 : v * 100, ans + ONE * (f / 100)], [v, f]);
    },
  },

  {
    id: "k18_delen_10",
    label: "Delen door 10",
    group: G5,
    desc: "3,2 : 10 = 0,32",
    strategy: "komma verschuiven",
    tip: function(t) { return "Delen door 10: de komma schuift één plaats naar links. " + fmt(t[0]) + " : 10 = " + fmt(t[0] / 10) + "."; },
    uitleg: "Delen door 10 maakt elk cijfer 10 keer zo weinig waard: de komma schuift één plaats naar links. 45 : 10 = 4,5. 3,2 : 10 = 0,32. Een nul ertussen zetten (3,02) is fout.",
    voorbeeld: "6,8 : 10 = ?\nDe komma één plaats naar links.\nAntwoord: 0,68.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: heel getal : 10, kommagetal met tienden : 10
    make: function(sub) {
      var v;
      if (sub === 0) { do { v = rnd(11, 99) * ONE; } while (v % (10 * ONE) === 0); }
      else { do { v = rnd(1, 99) * T; } while (v % ONE === 0); }
      var ans = v / 10;
      var zeroIn = sub === 0 ? Math.floor(v / (10 * ONE)) * ONE + ((v / ONE) % 10) * H : Math.floor(v / ONE) * ONE + (v % ONE) / 10;
      return numQ(fmt(v) + DIV + "10 =", ans, [zeroIn, v * 10, v], [v]);
    },
  },

  {
    id: "k19_delen_100_1000",
    label: "Delen door 100 en 1000",
    group: G5,
    desc: "7 : 100 = 0,07",
    strategy: "komma verschuiven",
    tip: function(t) { return "Delen door " + t[1] + ": de komma schuift " + (t[1] === 100 ? "twee" : "drie") + " plaatsen naar links. Vul aan met nullen: " + (t[0] / ONE) + " : " + t[1] + " = " + fmt(t[0] / t[1]) + "."; },
    uitleg: "Delen door 100: de komma schuift twee plaatsen naar links. Delen door 1000: drie plaatsen. Zijn er te weinig cijfers, zet dan nullen ervoor. 7 : 100 = 0,07. 45 : 1000 = 0,045.",
    voorbeeld: "38 : 100 = ?\nDe komma twee plaatsen naar links.\nAntwoord: 0,38.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: : 100, : 1000 (duizendsten toegestaan in deze skill)
    make: function(sub) {
      var w;
      if (sub === 0) {
        do { w = rnd(1, 99); } while (w % 10 === 0);
        return numQ(w + DIV + "100 =", w * H, [w * T, w, w * 100 * ONE], [w * ONE, 100], 3);
      }
      do { w = rnd(1, 999); } while (w % 10 === 0);
      return numQ(w + DIV + "1000 =", w, [w * H, w * T, w * ONE], [w * ONE, 1000], 3);
    },
  },

  // ── BLOK 6: OPTELLEN EN AFTREKKEN ──────────────────────────────

  {
    id: "k20_plus_tienden",
    label: "Tienden optellen",
    group: G6,
    desc: "2,4 + 1,3 = 3,7",
    strategy: "splitsen",
    tip: function(t) { return "Hele bij hele, tienden bij tienden: " + fmt(t[0]) + " + " + fmt(t[1]) + " = " + fmt(t[0] + t[1]) + "."; },
    uitleg: "Tel de hele getallen bij elkaar en de tienden bij elkaar. 2,4 + 1,3: 2 + 1 = 3 en 4 + 3 = 7 tienden. Samen 3,7.",
    voorbeeld: "0,5 + 0,3 = ?\n5 + 3 = 8 tienden.\nAntwoord: 0,8.",
    minCorrect: 8,
    make: function() {
      var e1 = rnd(0, 5), e2 = rnd(0, 4), a = rnd(1, 8), b = rnd(1, 9 - a);
      var x = e1 * ONE + a * T, y = e2 * ONE + b * T, s = x + y;
      return numQ(fmt(x) + " + " + fmt(y) + " =", s, [(e1 + e2) * ONE + (a + b) * H, s + ONE, s + T, s - T], [x, y]);
    },
  },

  {
    id: "k21_plus_overgang",
    label: "Tienden optellen met overgang",
    group: G6,
    desc: "0,7 + 0,6 = 1,3",
    strategy: "overgang",
    tip: function(t) { var a = (t[0] % ONE) / T, b = (t[1] % ONE) / T; return a + " + " + b + " = " + (a + b) + " tienden = 1 hele en " + (a + b - 10) + " tienden."; },
    uitleg: "Zijn de tienden samen 10 of meer, dan maak je er een hele van. 0,7 + 0,6: 7 + 6 = 13 tienden = 1 hele en 3 tienden = 1,3. Fout is 0,13: dat zijn 13 honderdsten.",
    voorbeeld: "1,8 + 0,5 = ?\n8 + 5 = 13 tienden = 1,3. Plus 1.\nAntwoord: 2,3.",
    minCorrect: 8,
    make: function() {
      var e1 = rnd(0, 5), e2 = rnd(0, 4), a = rnd(1, 9), b = rnd(10 - a, 9);
      var x = e1 * ONE + a * T, y = e2 * ONE + b * T, s = x + y;
      var err = fmt((e1 + e2) * ONE) + "," + (a + b);   // fout: "0,13"
      return numQ(fmt(x) + " + " + fmt(y) + " =", s, [{ v: (e1 + e2) * ONE + (a + b) * H, s: err }, s - ONE, s + T, s - T], [x, y]);
    },
  },

  {
    id: "k22_plus_ongelijk",
    label: "Optellen met ongelijke decimalen",
    group: G6,
    desc: "1,25 + 0,5 = 1,75",
    strategy: "plaatswaarde",
    tip: function(t) { return "Zet de tienden onder de tienden: " + fmt(t[1]) + " = " + fmtD(t[1], 2) + ". " + fmt(t[0]) + " + " + fmtD(t[1], 2) + " = " + fmt(t[0] + t[1]) + "."; },
    uitleg: "Tel tienden bij tienden en honderdsten bij honderdsten. 1,25 + 0,5: schrijf 0,5 als 0,50. 1,25 + 0,50 = 1,75. Fout is 1,30: dan tel je de 5 tienden op bij de honderdsten.",
    voorbeeld: "2,14 + 0,3 = ?\n2,14 + 0,30.\nAntwoord: 2,44.",
    minCorrect: 12,
    make: function() {
      var x, b, s;
      do { x = rnd(101, 499) * 10; b = rnd(1, 9); s = x + b * T; } while (x % T === 0 || s % T === 0);
      var y = b * T;
      return numQ(fmt(x) + " + " + fmt(y) + " =", s, [x + b * H, s + T, s - T, s + ONE], [x, y]);
    },
  },

  {
    id: "k23_min_tienden",
    label: "Tienden aftrekken",
    group: G6,
    desc: "2,5 − 0,8 = 1,7",
    strategy: "lenen",
    tip: function(t) { return fmt(t[0]) + " " + MIN + " " + fmt(t[1]) + " = " + fmt(t[0] - t[1]) + ". Zijn er te weinig tienden, wissel dan 1 hele in voor 10 tienden."; },
    uitleg: "Trek tienden van tienden af. Zijn er te weinig, wissel dan 1 hele in voor 10 tienden. 2,5 − 0,8: 2,5 = 1 hele en 15 tienden. 15 − 8 = 7. Antwoord 1,7. Fout is 2,3 (8 − 5 omgedraaid).",
    voorbeeld: "3,2 − 0,6 = ?\n3,2 = 2 hele en 12 tienden. 12 − 6 = 6.\nAntwoord: 2,6.",
    minCorrect: 8,
    make: function() {
      var x, b, s;
      do { x = rnd(11, 99) * T; b = rnd(1, 9); s = x - b * T; } while (x % ONE === 0 || s <= 0 || s % ONE === 0);
      var y = b * T;
      var swapErr = Math.floor(x / ONE) * ONE + Math.abs((x % ONE) / T - b) * T;
      return numQ(fmt(x) + " " + MIN + " " + fmt(y) + " =", s, [swapErr, s + ONE, s + T, s - T], [x, y]);
    },
  },

  {
    id: "k24_min_ongelijk",
    label: "Aftrekken met ongelijke decimalen",
    group: G6,
    desc: "3 − 0,25 = 2,75",
    strategy: "plaatswaarde",
    tip: function(t) { return "Schrijf beide getallen met twee decimalen: " + fmtD(t[0], 2) + " " + MIN + " " + fmtD(t[1], 2) + " = " + fmt(t[0] - t[1]) + "."; },
    uitleg: "Geef beide getallen evenveel cijfers achter de komma. 3 − 0,25 = 3,00 − 0,25 = 2,75. 1,2 − 0,05 = 1,20 − 0,05 = 1,15. Fout is: de honderdsten als tienden behandelen.",
    voorbeeld: "2,4 − 0,15 = ?\n2,40 − 0,15.\nAntwoord: 2,25.",
    minCorrect: 12,
    make: function() {
      var x, y, s;
      do { x = rnd(10, 99) * T; y = rnd(1, 99) * H; s = x - y; } while (y % T === 0 || s <= 0);
      var mis = x - (y % T) * 10 - Math.floor(y / T) * T;
      return numQ(fmt(x) + " " + MIN + " " + fmt(y) + " =", s, [mis > 0 ? mis : null, s + T, s - T, s + ONE, x + y], [x, y]);
    },
  },

  {
    id: "k25_aanvullen",
    label: "Aanvullen tot een heel getal",
    group: G6,
    desc: "0,35 + 0,65 = 1",
    strategy: "aanvullen",
    tip: function(t) { return "Vul " + fmt(t[0]) + " aan tot " + fmt(t[1]) + ": eerst tot het volgende tiende, dan tot de hele. Samen " + fmt(t[1] - t[0]) + "."; },
    uitleg: "Aanvullen tot een heel getal: hoeveel mist er nog? 0,35 + 0,05 = 0,4 en 0,4 + 0,6 = 1. Samen 0,65. Pas op: het is niet 0,75 (elk cijfer tot 10 aanvullen).",
    voorbeeld: "2,8 + ? = 3\n2,8 + 0,2 = 3.\nAntwoord: 0,2.",
    minCorrect: 8,
    make: function() {
      var x;
      do { x = rnd(1, 999) * H; } while (x % ONE === 0);
      var tgt = Math.ceil(x / ONE) * ONE, g = tgt - x;
      return numQ(fmt(x) + " + ? = " + fmt(tgt), g, [g + T, g + ONE, g - T, g + H], [x, tgt]);
    },
  },

  // ── BLOK 7: VERMENIGVULDIGEN EN DELEN ──────────────────────────

  {
    id: "k26_heel_x_tienden",
    label: "Heel getal keer tienden",
    group: G7,
    desc: "3 × 0,4 = 1,2",
    strategy: "tafels",
    tip: function(t) { return t[0] + " × " + (t[1] / T) + " tienden = " + (t[0] * t[1] / T) + " tienden = " + fmt(t[0] * t[1]) + "."; },
    uitleg: "Reken met tienden alsof het hele dingen zijn. 3 × 0,4 = 3 × 4 tienden = 12 tienden = 1,2. Fout is 0,12: dat zijn 12 honderdsten.",
    voorbeeld: "5 × 0,3 = ?\n5 × 3 tienden = 15 tienden.\nAntwoord: 1,5.",
    minCorrect: 8,
    make: function() {
      var n = rnd(2, 9), q;
      do { q = rnd(1, 29) * T; } while (q % ONE === 0);
      var s = n * q;
      return numQ(n + TIMES + fmt(q) + " =", s, [(n * q / T) * H, s * 10, s + T, s - T, s + q], [n, q]);
    },
  },

  {
    id: "k27_heel_x_honderdsten",
    label: "Heel getal keer honderdsten",
    group: G7,
    desc: "4 × 0,25 = 1",
    strategy: "tafels",
    tip: function(t) { return t[0] + " × " + (t[1] / H) + " honderdsten = " + (t[0] * t[1] / H) + " honderdsten = " + fmt(t[0] * t[1]) + "."; },
    uitleg: "Reken met honderdsten. 4 × 0,25 = 4 × 25 honderdsten = 100 honderdsten = 1. 3 × 0,15 = 45 honderdsten = 0,45.",
    voorbeeld: "2 × 0,35 = ?\n2 × 35 honderdsten = 70 honderdsten.\nAntwoord: 0,7.",
    minCorrect: 8,
    make: function() {
      var n = rnd(2, 9), q;
      do { q = rnd(1, 99) * H; } while (q % T === 0);
      var s = n * q;
      return numQ(n + TIMES + fmt(q) + " =", s, [s % 100 === 0 ? s / 10 : null, s * 10, s + T, s - T, s + q], [n, q]);
    },
  },

  {
    id: "k28_komma_delen",
    label: "Kommagetal delen",
    group: G7,
    desc: "4,8 : 4 = 1,2",
    strategy: "delen",
    tip: function(t) { return (t[0] * t[1] / T) + " tienden : " + t[0] + " = " + (t[1] / T) + " tienden = " + fmt(t[1]) + "."; },
    uitleg: "Deel het kommagetal alsof het tienden zijn. 4,8 : 4 = 48 tienden : 4 = 12 tienden = 1,2. Controle: 4 × 1,2 = 4,8.",
    voorbeeld: "2,4 : 3 = ?\n24 tienden : 3 = 8 tienden.\nAntwoord: 0,8.",
    minCorrect: 8,
    make: function() {
      var d = rnd(2, 9), q;
      do { q = rnd(1, 29) * T; } while (q % ONE === 0);
      var tot = d * q;
      return numQ(fmt(tot) + DIV + d + " =", q, [q * 10, q % 100 === 0 ? q / 10 : null, q + T, q - T], [d, q]);
    },
  },

  {
    id: "k29_tienden_x_tienden",
    label: "Tienden keer tienden",
    group: G7,
    desc: "0,5 × 0,4 = 0,2",
    strategy: "decimalen tellen",
    tip: function(t) { return t[0] + " × " + t[1] + " = " + (t[0] * t[1]) + ". Twee keer een tiende geeft honderdsten: 0," + t[0] + " × 0," + t[1] + " = " + fmt(t[0] * t[1] * H) + "."; },
    uitleg: "Tiende keer tiende geeft honderdsten. Reken eerst zonder komma: 5 × 4 = 20. Er staan samen twee cijfers achter de komma, dus 20 honderdsten = 0,20 = 0,2.",
    voorbeeld: "0,3 × 0,7 = ?\n3 × 7 = 21, twee plaatsen.\nAntwoord: 0,21.",
    minCorrect: 12,
    make: function() {
      var a = rnd(1, 9), b = rnd(1, 9), p = a * b * H;
      return numQ("0," + a + TIMES + "0," + b + " =", p, [p * 10, p * 100 <= 99 * ONE ? p * 100 : null, p + T, (a + b) * T < 10 * ONE ? (a + b) * T : null], [a, b]);
    },
  },

  // ── BLOK 8: TOEPASSEN ──────────────────────────────────────────

  {
    id: "k30_missend",
    label: "Missend getal",
    group: G8,
    desc: "? + 0,75 = 2",
    strategy: "aanvullen",
    tip: function(t) { return fmt(t[1]) + " " + MIN + " " + fmt(t[0]) + " = " + fmt(t[1] - t[0]) + "."; },
    uitleg: "Zoek het getal dat mist: het totaal min het getal dat je wel weet. ? + 0,75 = 2: 2 − 0,75 = 1,25. Controle: 1,25 + 0,75 = 2.",
    voorbeeld: "0,5 + ? = 3\n3 − 0,5 = 2,5.\nAntwoord: 2,5.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: ontbrekend eerste getal, ontbrekend tweede getal
    make: function(sub) {
      var x, tgt, m;
      do { x = rnd(1, 39) * 250; tgt = rnd(1, 10) * ONE; m = tgt - x; } while (m <= 0 || x % ONE === 0);
      var q = sub === 0 ? "? + " + fmt(x) + " = " + fmt(tgt) : fmt(x) + " + ? = " + fmt(tgt);
      return numQ(q, m, [m + T, m + ONE, m - T, m + 2 * H], [x, tgt]);
    },
  },

  {
    id: "k31_schatten",
    label: "Schatten",
    group: G8,
    desc: "3,9 + 5,2 ≈ 9",
    strategy: "afronden",
    tip: function(t) { return "Rond elk getal af op een heel getal: " + fmt(t[0]) + " " + APPROX + " " + Math.round(t[0] / ONE) + " en " + fmt(t[1]) + " " + APPROX + " " + Math.round(t[1] / ONE) + "."; },
    uitleg: "Bij schatten rond je elk getal af op een heel getal en reken je daarmee. 3,9 is bijna 4, 5,2 is bijna 5. Samen ongeveer 9.",
    voorbeeld: "Ongeveer: 6,8 + 2,1 ≈ ?\n7 + 2.\nAntwoord: 9.",
    minCorrect: 8,
    make: function() {
      var a = pickFrom(NEAR), b = pickFrom(NEAR);
      var est = Math.round(a / ONE) + Math.round(b / ONE);
      var opts = [est + 1, est - 1, est + 2, est + 3].filter(function(x) { return x > 0; }).slice(0, 3);
      return textQ("Ongeveer: " + fmt(a) + " + " + fmt(b) + " " + APPROX + " ?", String(est), opts.map(String), [a, b]);
    },
  },

  {
    id: "k32_helft_dubbel",
    label: "Helft en dubbel",
    group: G8,
    desc: "De helft van 3,4 = 1,7",
    strategy: "halveren",
    tip: function(t) { return t[1] === 0 ? "De helft: " + fmt(t[0]) + " : 2 = " + fmt(t[0] / 2) + "." : "Het dubbele: " + fmt(t[0]) + " + " + fmt(t[0]) + " = " + fmt(t[0] * 2) + "."; },
    uitleg: "De helft is delen door 2, het dubbele is keer 2. De helft van 2,7: de helft van 2 = 1 en de helft van 0,7 = 0,35, samen 1,35. Het dubbele van 2,65: 5,30 = 5,3; vergeet de overgang niet (65 + 65 = 130 honderdsten).",
    voorbeeld: "Het dubbele van 1,45 = ?\n1,45 + 1,45 = 2,90.\nAntwoord: 2,9.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: helft, dubbel
    make: function(sub) {
      var v;
      if (sub === 0) {
        do { v = rnd(2, 98) * T; } while (v % ONE === 0);
        var hf = v / 2;
        // Afleiders: komma verschoven (× 10), het getal zelf, ± 0,1
        return numQ("De helft van " + fmt(v) + " =", hf, [hf * 10 <= 99 * ONE ? hf * 10 : null, v, hf + T, hf - T], [v, 0]);
      }
      do { v = rnd(11, 499) * H; } while (v % T === 0);
      var db = v * 2;
      // Afleiders: overgang vergeten, het getal zelf, ± 0,1
      var noCarry = Math.floor(v / ONE) * 2 * ONE + ((v % ONE) * 2) % ONE;
      return numQ("Het dubbele van " + fmt(v) + " =", db, [noCarry, v, db + T, db - T], [v, 1]);
    },
  },

  {
    id: "k33_kort_toepassen",
    label: "Kort toepassen",
    group: G8,
    desc: "3 flessen van 1,5 liter: 4,5 liter",
    strategy: "toepassen",
    tip: function(t) { return t[0] + " × " + fmt(t[1]) + " = " + fmt(t[0] * t[1]) + "."; },
    uitleg: "Heb je meer van hetzelfde, dan reken je aantal keer de maat. 3 flessen van 1,5 liter: 3 × 1,5 = 4,5 liter.",
    voorbeeld: "4 planken van 0,8 meter: samen?\n4 × 0,8 = 3,2.\nAntwoord: 3,2.",
    minCorrect: 8,
    make: function() {
      var c = pickFrom(CTX), n = rnd(2, 6), q;
      do { q = rnd(2, 25) * T; } while (q % ONE === 0);
      var s = n * q;
      return numQ(n + " " + c[0] + " " + fmt(q) + " " + c[1] + ": samen?", s, [(n * q / T) * H, s + q, s - q, s + T], [n, q]);
    },
  },

  // ── BLOK 9: CONTROLEREN ────────────────────────────────────────

  {
    id: "k34_fout_optellen",
    label: "Fout spotten: optellen",
    group: G9,
    desc: "0,7 + 0,6 = 0,13 is fout",
    strategy: "controleren",
    tip: function(t) { return "Tienden bij tienden, honderdsten bij honderdsten: " + fmt(t[0]) + " + " + fmt(t[1]) + " = " + fmt(t[0] + t[1]) + "."; },
    uitleg: "Controleer of tienden bij tienden zijn opgeteld en honderdsten bij honderdsten. Veel gemaakte fouten: 0,1 + 0,19 = 0,2 (de tiende telt als honderdste; goed is 0,29) en 0,7 + 0,6 = 0,13 (13 tienden zijn 1,3).",
    voorbeeld: "Welke som is FOUT?\n0,8 + 0,5 = 0,13 → 13 tienden is 1,3.\nDie is fout.",
    minCorrect: 12,
    subtypes: 2,
    // Subtypen = fouttype: A tienden als honderdsten, B overgang als "0,13"
    make: function(sub) {
      var w = pickFrom(sub === 0 ? FOUT34_A : FOUT34_B);
      return errorQ(w, GOED34, w.t);
    },
  },

  {
    id: "k35_fout_keer_delen",
    label: "Fout spotten: keer en delen door 10",
    group: G9,
    desc: "2,3 × 10 = 2,30 is fout",
    strategy: "controleren",
    tip: function(t) { return t[1] === 0 ? "Keer 10: de komma één plaats naar rechts. " + fmt(t[0]) + " × 10 = " + fmt(t[0] * 10) + "." : "Delen door 10: de komma één plaats naar links. " + fmt(t[0]) + " : 10 = " + fmt(t[0] / 10) + "."; },
    uitleg: "Keer 10 schuift de komma één plaats naar rechts, delen door 10 één plaats naar links. Veel gemaakte fouten: 1,8 × 10 = 1,80 (een nul erachter verandert niets; goed is 18) en 48 : 10 = 4,08 (goed is 4,8).",
    voorbeeld: "Welke som is FOUT?\n3,6 × 10 = 3,60 → goed is 36.\nDie is fout.",
    minCorrect: 12,
    subtypes: 2,
    // Subtypen = fouttype: A nul erachter, B nul ertussen
    make: function(sub) {
      var w = pickFrom(sub === 0 ? FOUT35_A : FOUT35_B);
      return errorQ(w, GOED35, w.t);
    },
  },

  {
    id: "k36_over_de_grens",
    label: "Over de grens tellen",
    group: G9,
    desc: "2,99 + 0,01 = 3",
    strategy: "doortellen",
    tip: function(t) { return t[1] === 0 ? "Eén honderdste erbij: " + fmt(t[0]) + " + 0,01 = " + fmt(t[0] + H) + "." : "Eén tiende eraf: " + fmt(t[0]) + " " + MIN + " 0,1 = " + fmt(t[0] - T) + "."; },
    uitleg: "Tel je door over een grens, dan schuift het cijfer ervoor op. 2,99 + 0,01: 99 + 1 = 100 honderdsten = 1 hele, dus 3. 4 − 0,1: 4 = 3 hele en 10 tienden, min 1 tiende = 3,9.",
    voorbeeld: "1,09 + 0,01 = ?\n9 + 1 = 10 honderdsten = 1 tiende.\nAntwoord: 1,1.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: + 0,01 over een grens, heel getal − 0,1
    make: function(sub) {
      if (sub === 0) {
        var v = rnd(10, 99) * T + 90;
        var s = v + H;
        return numQ(fmt(v) + " + 0,01 =", s, [v + T, s + T, s - T, s + ONE], [v, 0]);
      }
      var w = rnd(1, 10) * ONE, r = w - T;
      return numQ(fmt(w) + " " + MIN + " 0,1 =", r, [w - H, w + 900, r - ONE, r + 2 * T], [w, 1]);
    },
  },
];

// ─────────────────────────────────────────────────────────────────
// SKILLS MET VRAAGVERLOOP + k37 SNELHEIDSRONDE
// ─────────────────────────────────────────────────────────────────

var SKILLS = createSkills("kommagetallen", RAW_SKILLS);
var MIXER  = createMixer(RAW_SKILLS, BLOCK_GROUPS, SKILLS.byId);

export var KOMMA_SKILLS = SKILLS.list;

registerSkillId("kommagetallen", "k37_snelheid");

KOMMA_SKILLS.push({
  id:         "k37_snelheid",
  label:      "Snelheidsronde",
  group:      G10,
  desc:       "Gemengd: alle soorten kommagetallen",
  strategy:   "snel",
  tip:        "Kijk eerst wat voor som het is: plaatswaarde, afronden, komma verschuiven of rekenen. Kies dan de handigste aanpak.",
  uitleg:     "In de snelheidsronde komen alle soorten kommagetal-sommen door elkaar voorbij. Kies per som de aanpak die je hebt geleerd.",
  voorbeeld:  "Gemengd, bijvoorbeeld:\n3,45 × 10, 0,7 + 0,6, 1/4 = ?",
  minCorrect: 15,
  generate:   MIXER.generate,
});

export var KOMMA_ORDER = KOMMA_SKILLS.map(function(s) { return s.id; });
