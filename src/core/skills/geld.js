// Onderdeel Geld: skills, volgorde en geld-specifieke generatoren (ontwerp B1).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Het vraagverloop (rekenmoment, geschiedenis, subtypen, stapels, gemengde ronde) staat in ./flow.js.
// Alle bedragen worden intern in centen berekend (gehele getallen, nooit kommagetallen).
// Notatie (B1):
//   N1 bedrag "€ 2,50" met een niet-afbrekende spatie (U+00A0), ook in de vraagtekst
//   N2 een bedrag met centen altijd met twee decimalen; "€ 5" alleen in skills met uitsluitend
//      hele euro's (g06, g08, g14, g16, g26, g28, g33) en in "Je geeft € 5"
//   N3 munten en briefjes: 5c 10c 20c 50c €1 €2 €5 €10 €20 €50, in een rij van hoog naar laag
//   N4 geen munten van 1c en 2c; prijzen in stappen van 5 cent, behalve g15 en g33
//   N5 hoogste bedrag € 99,95
// Elke vraag heeft 4 keuzes met 4 onderling verschillende teksten en precies één juist antwoord.
// Lengtes: bedrag ≤ 7 tekens, getal of munt ≤ 5 tekens, muntrij of fout-spot-regel ≤ 16 tekens.

import { rnd, shuffle } from "./helpers.js";
import { makeChoices, registerSkillId, createSkills, createMixer, deckPick, estimateChoices } from "./flow.js";

var NB     = "\u00a0";
var MIN    = "−";
var TIMES  = " × ";
var DIV    = " : ";
var APPROX = "≈";

var MAX_AMOUNT = 7;
var MAX_ROW    = 16;

// ─────────────────────────────────────────────────────────────────
// GELD-HELPERS (bedragen in centen)
// ─────────────────────────────────────────────────────────────────

// Bedrag met twee decimalen: 245 -> "€ 2,45"
function eur(c) {
  var e = Math.floor(c / 100);
  var k = c % 100;
  return "€" + NB + e + "," + (k < 10 ? "0" : "") + k;
}

// Heel bedrag zonder decimalen: 500 -> "€ 5"
function eurW(c) {
  return "€" + NB + (c / 100);
}

// Bedrag zoals in een vraag: hele euro's kort, anders met twee decimalen
function eurQ(c) {
  return c % 100 === 0 ? eurW(c) : eur(c);
}

// Munt of briefje: 20 -> "20c", 200 -> "€2", 1000 -> "€10"
function coin(c) {
  return c >= 100 ? "€" + (c / 100) : c + "c";
}

function rowStr(list) {
  return list.map(coin).join(" ");
}

function sum(list) {
  var t = 0;
  for (var i = 0; i < list.length; i++) t += list[i];
  return t;
}

function desc(a, b) { return b - a; }

function pickFrom(list) { return list[rnd(0, list.length - 1)]; }

var COINS = [200, 100, 50, 20, 10, 5];
var CENT_COINS = [50, 20, 10, 5];
var NOTES = [5000, 2000, 1000, 500];

// Kortste muntrij (gretig; bij deze munten is de kortste rij altijd uniek, gecontroleerd in B1)
function greedy(t) {
  var out = [];
  for (var i = 0; i < COINS.length; i++) {
    while (t >= COINS[i]) { out.push(COINS[i]); t -= COINS[i]; }
  }
  return out;
}

// Vier keuzes met tekst: het antwoord + de eerste 3 geldige kandidaten (centen), daarna reserve.
// Kandidaten ≤ 0, boven max of met een al gebruikte tekst vallen af.
var RESERVE = [5, -5, 10, -10, 15, -15, 20, -20, 25, -25, 50, -50, 100, -100, 200];

function moneyChoices(ansC, cands, fmt, max) {
  var top  = max || 9995;
  var ans  = fmt(ansC);
  var out  = [ans];
  var seen = {};
  seen[ans] = true;
  function add(v) {
    if (out.length >= 4 || typeof v !== "number" || v <= 0 || v > top || v % 1 !== 0) return;
    if (fmt === eurW && v % 100 !== 0) return;
    var s = fmt(v);
    if (seen[s] || s.length > MAX_AMOUNT) return;
    seen[s] = true;
    out.push(s);
  }
  cands.forEach(add);
  var step = fmt === eurW ? 100 : 1;
  for (var i = 0; i < RESERVE.length && out.length < 4; i++) add(ansC + RESERVE[i] * step);
  return shuffle(out);
}

function moneyQ(question, ansC, cands, fmt, terms, max) {
  return { terms: terms, question: question, answer: fmt(ansC), choices: moneyChoices(ansC, cands, fmt, max) };
}

function intQ(question, answer, extras, terms) {
  return { terms: terms, question: question, answer: answer, choices: makeChoices(answer, extras) };
}

// Keuzevraag met getoonde teksten; answer is één van de teksten
function textQ(question, answer, others, terms) {
  return { terms: terms, question: question, answer: answer, choices: shuffle([answer].concat(others)) };
}

// Keuzevraag met muntrijen (g10, g11, g24): smallChoices laat PracticeScreen een kleinere
// knopletter gebruiken, zodat een rij als "€2 €2 50c 20c 5c" leesbaar blijft op een smalle iPhone
function rowQ(question, answer, others, terms) {
  var q = textQ(question, answer, others, terms);
  q.smallChoices = true;
  return q;
}

// Combinaties van k elementen
function combos(list, k) {
  var out = [];
  (function rec(i, cur) {
    if (cur.length === k) { out.push(cur.slice()); return; }
    for (var j = i; j < list.length; j++) { cur.push(list[j]); rec(j + 1, cur); cur.pop(); }
  })(0, []);
  return out;
}

// Multisets (rijen van hoog naar laag) met kmin..kmax elementen
function multisets(list, kmin, kmax) {
  var out = [];
  (function rec(i, cur) {
    if (cur.length >= kmin) out.push(cur.slice());
    if (cur.length === kmax) return;
    for (var j = i; j < list.length; j++) { cur.push(list[j]); rec(j, cur); cur.pop(); }
  })(0, []);
  return out;
}

// ─────────────────────────────────────────────────────────────────
// VASTE LIJSTEN MET MOGELIJKE VRAGEN (B1)
// ─────────────────────────────────────────────────────────────────

var SETS_4COINS = combos(COINS, 4);
var SETS_3COINS = combos(COINS, 3);
var SETS_3NOTES = combos(NOTES, 3);
var FAKE_NOTES  = ["€15", "€25", "€30", "€40"];
var FAKE_COINS  = ["15c", "25c", "30c", "€3"];

// g02: bedragen € 1,00 – € 10,00 in stappen van 5c
var ITEMS_EURO_CENT = [];
for (var ec = 100; ec <= 1000; ec += 5) ITEMS_EURO_CENT.push(ec);

// g03: [euro, cent]
var ITEMS_SCHRIJF = [];
for (var se = 1; se <= 20; se++) { for (var sk = 5; sk <= 95; sk += 5) ITEMS_SCHRIJF.push([se, sk]); }

// g05: 3–5 centmunten, samen ≤ 100
var ITEMS_CENTEN = multisets(CENT_COINS, 3, 5).filter(function(m) { return sum(m) <= 100; });

// g06: 3–6 munten van €2 en €1
var ITEMS_EUROMUNT = multisets([200, 100], 3, 6);

// g07: 1–2 euromunten + 1–3 centmunten, geen heel totaal
var ITEMS_EURO_CENTEN = [];
multisets([200, 100], 1, 2).forEach(function(eu) {
  multisets(CENT_COINS, 1, 3).forEach(function(ce) {
    var m = eu.concat(ce);
    if (sum(m) % 100 !== 0) ITEMS_EURO_CENTEN.push(m);
  });
});

// g08: 2–3 briefjes + eventueel €1 of €2, totaal ≤ € 99
var ITEMS_BRIEFJES = [];
multisets(NOTES, 2, 3).forEach(function(no) {
  [[], [200], [100]].forEach(function(co) {
    var m = no.concat(co);
    if (sum(m) <= 9900) ITEMS_BRIEFJES.push(m);
  });
});

// g09: 5–6 munten, minstens één euromunt en één centmunt, totaal ≤ € 9,95 en niet heel
var ITEMS_VEEL = multisets(COINS, 5, 6).filter(function(m) {
  return m[0] >= 100 && m[m.length - 1] < 100 && sum(m) % 100 !== 0 && sum(m) <= 995;
});

// g10: doel = som van een rij van 2–3 munten; afleiders = rijen met een ander totaal
// (verschil ≤ 20c, één munt meer of minder hoogstens)
var ROWS_2_3 = multisets(COINS, 2, 3).map(function(m) { return { m: m, t: sum(m) }; });
var ITEMS_WELKE = [];
ROWS_2_3.forEach(function(cor) {
  if (cor.t % 100 === 0) return;
  var others = ROWS_2_3.filter(function(r) {
    return r.t !== cor.t && Math.abs(r.t - cor.t) <= 20 && Math.abs(r.m.length - cor.m.length) <= 1;
  });
  if (others.length >= 3) ITEMS_WELKE.push({ cor: cor, others: others });
});

// g11: doel 15c – € 4,95 met een kortste rij van 2–4 munten; afleiders = dezelfde som,
// maar met een munt gesplitst in kleinere munten (dus meer munten)
var SPLIT = { 200: [100, 100], 100: [50, 50], 50: [20, 20, 10], 20: [10, 10], 10: [5, 5] };
function splitRows(g) {
  var out = [];
  g.forEach(function(c, i) {
    if (SPLIT[c]) out.push(g.slice(0, i).concat(SPLIT[c], g.slice(i + 1)).sort(desc));
  });
  out.slice().forEach(function(a) {
    for (var j = 0; j < a.length; j++) {
      if (SPLIT[a[j]]) { out.push(a.slice(0, j).concat(SPLIT[a[j]], a.slice(j + 1)).sort(desc)); break; }
    }
  });
  return out;
}
var ITEMS_MINSTE = [];
for (var mt = 15; mt <= 495; mt += 5) {
  if (mt % 100 === 0) continue;
  var mg = greedy(mt);
  if (mg.length < 2 || mg.length > 4) continue;
  var mAlt = [rowStr(mg)];
  splitRows(mg).forEach(function(a) {
    var s = rowStr(a);
    if (mAlt.length < 4 && s.length <= MAX_ROW && mAlt.indexOf(s) < 0) mAlt.push(s);
  });
  if (mAlt.length === 4) ITEMS_MINSTE.push({ t: mt, g: mg, rows: mAlt });
}

// g14: € 1,05 – € 19,95, geen ,00 en geen ,50
var ITEMS_AFROND_EURO = [];
for (var ae = 105; ae <= 1995; ae += 5) { if (ae % 100 !== 0 && ae % 100 !== 50) ITEMS_AFROND_EURO.push(ae); }

// g15: € 1,01 – € 19,99 op hele cent, eindcijfer niet 0 of 5
var ITEMS_CONTANT = [];
for (var ac = 101; ac <= 1999; ac++) { if (ac % 5 !== 0) ITEMS_CONTANT.push(ac); }

// Afronden bij contant betalen: 1–2 omlaag, 3–4 naar 5, 6–7 naar 5, 8–9 omhoog
function cashRound(c) {
  var d = c % 10;
  var b = c - d;
  if (d <= 2) return b;
  if (d <= 7) return b + 5;
  return b + 10;
}

// g19: drie prijzen € 0,25 – € 4,75 in stappen van 25c
var ITEMS_DRIE = [];
for (var ta = 25; ta <= 475; ta += 25) {
  for (var tb = ta; tb <= 475; tb += 25) {
    for (var tc = tb; tc <= 475; tc += 25) ITEMS_DRIE.push([ta, tb, tc]);
  }
}

// g24: [prijs, betaald]; wisselgeld ≤ € 4,95 en de kortste rij ≤ 16 tekens
var ITEMS_TERUG_MUNT = [];
[500, 1000].forEach(function(pay) {
  for (var p = (pay === 500 ? 5 : 505); p <= pay - 5; p += 5) {
    var r = pay - p;
    if (p % 100 === 0 || r > 495) continue;
    var g = greedy(r);
    if (g.length >= 2 && rowStr(g).length <= MAX_ROW) ITEMS_TERUG_MUNT.push([p, pay]);
  }
});

// g26: [aantal, euro], product ≤ 99
var ITEMS_KEER_EURO = [];
for (var kn = 2; kn <= 9; kn++) { for (var kp = 1; kp <= 10; kp++) { if (kn * kp <= 99) ITEMS_KEER_EURO.push([kn, kp]); } }

// g27: [aantal, prijs]
var ITEMS_KEER_CENT = [];
for (var cn = 2; cn <= 5; cn++) { for (var cp = 105; cp <= 495; cp += 5) { if (cp % 100 !== 0) ITEMS_KEER_CENT.push([cn, cp]); } }

// g28: [deler, uitkomst in euro]; het te verdelen bedrag blijft ≤ € 99 (N5), dus zonder € 100 : 10
var ITEMS_VERDEEL = [];
for (var vd = 2; vd <= 10; vd++) { for (var vq = 1; vq <= 10; vq++) { if (vd * vq <= 99) ITEMS_VERDEEL.push([vd, vq]); } }

// g29: [aantal, stukprijs], totaal ≤ € 20
var ITEMS_PER_STUK = [];
for (var pn = 2; pn <= 5; pn++) {
  for (var pp = 25; pp <= 495; pp += 5) { if (pp % 100 !== 0 && pn * pp <= 2000) ITEMS_PER_STUK.push([pn, pp]); }
}

// g31: € 1,00 – € 19,90 in stappen van 10c (de helft is dan een veelvoud van 5c)
var ITEMS_HELFT = [];
for (var hc = 100; hc <= 1990; hc += 10) ITEMS_HELFT.push(hc);

// g32: [budget, prijs], aantal 2–9; twee lijsten: precies op en met rest (50/50 via subtypen)
var ITEMS_KOOP_PRECIES = [], ITEMS_KOOP_REST = [];
for (var kb = 500; kb <= 2000; kb += 100) {
  for (var kpr = 105; kpr <= 995; kpr += 5) {
    var kAantal = Math.floor(kb / kpr);
    if (kAantal < 2 || kAantal > 9) continue;
    if (kAantal * kpr === kb) ITEMS_KOOP_PRECIES.push([kb, kpr]);
    else ITEMS_KOOP_REST.push([kb, kpr]);
  }
}

// g33: prijzen tot 5 cent onder of 3 cent boven een hele euro (€ 1 – € 9)
var NEAR = [];
for (var ne = 1; ne <= 9; ne++) { [-5, -4, -3, -2, -1, 1, 2, 3].forEach(function(d) { NEAR.push(ne * 100 + d); }); }

// g35: prijzen per betaald bedrag (veelvoud van 5c, niet heel, eindcijfer 5)
var FOUT_PRICES = {};
[500, 1000].forEach(function(pay) {
  var list = [];
  for (var p = (pay === 500 ? 105 : 505); p <= pay - 5; p += 5) { if (p % 100 !== 0 && p % 10 !== 0) list.push(p); }
  FOUT_PRICES[pay] = list;
});

// g36
var ITEMS_DINGEN = ["ijsjes", "appels", "pennen", "kaartjes", "koeken"];

// ─────────────────────────────────────────────────────────────────
// SKILL DEFINITIONS
// ─────────────────────────────────────────────────────────────────

var G1  = "Geld kennen";
var G2  = "Tellen";
var G3  = "Samenstellen";
var G4  = "Vergelijken en afronden";
var G5  = "Prijzen optellen";
var G6  = "Betalen en wisselgeld";
var G7  = "Keer en delen";
var G8  = "Toepassen";
var G9  = "Controleren";
var G10 = "Slot";

var BLOCK_GROUPS = [G1, G2, G3, G4, G5, G6, G7, G8, G9];

// Wisselgeld: typische fouten (lenen vergeten +€1, aanvulfout +10c) en kleine afwijkingen
function changeCands(r) { return [r + 100, r + 10, r - 10, r + 5, r - 5]; }

var RAW_SKILLS = [

  // ── BLOK 1: GELD KENNEN ────────────────────────────────────────

  {
    id: "g01_munt_waarde",
    label: "Munten ordenen",
    group: G1,
    desc: "€2 is meer waard dan 50c",
    strategy: "vergelijken",
    tip: function() { return "Munten met een c zijn centen. €1 = 100 cent, dus elke euromunt is meer waard dan elke centmunt."; },
    uitleg: "Er zijn centmunten (5c, 10c, 20c, 50c) en euromunten (€1, €2). 100 cent is 1 euro. Daarom is €1 meer waard dan 50c, ook al lijkt 50 een groter getal. Er bestaan ook munten van 1c en 2c, maar die worden in Nederland in de winkel bijna niet gebruikt. In deze oefeningen doen ze niet mee.",
    voorbeeld: "Welke munt is het meest waard?\n50c 20c €1 10c\nAntwoord: €1.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: meest, minst
    make: function(sub) {
      var s = pickFrom(SETS_4COINS);
      var best = sub === 0 ? Math.max.apply(null, s) : Math.min.apply(null, s);
      var others = s.filter(function(c) { return c !== best; }).map(coin);
      return textQ(sub === 0 ? "Welke munt is het meest waard?" : "Welke munt is het minst waard?", coin(best), others, [sub]);
    },
  },

  {
    id: "g02_euro_cent",
    label: "Euro en cent",
    group: G1,
    desc: "€ 3 = 300 cent",
    strategy: "omrekenen",
    tip: function(t) { return "1 euro = 100 cent. " + eur(t[0]) + " = " + t[0] + " cent."; },
    uitleg: "1 euro is 100 cent. Euro naar cent: keer 100. € 3 = 300 cent, € 2,45 = 245 cent. Cent naar euro: de laatste twee cijfers zijn de centen, de rest zijn de euro's. 245 cent = € 2,45.",
    voorbeeld: "350 cent = ?\n3 hele euro en 50 cent.\nAntwoord: € 3,50.",
    minCorrect: 8,
    subtypes: 3,
    // Subtypen: hele euro naar cent, bedrag naar cent, cent naar bedrag
    make: function(sub) {
      if (sub === 0) {
        var w = rnd(1, 10) * 100;
        return intQ(eurW(w) + " = ? cent", w, [w * 10, w / 10, w + 100, w - 100, w + 50], [w]);
      }
      var c = pickFrom(ITEMS_EURO_CENT.filter(function(x) { return x % 100 !== 0; }));
      if (sub === 1) return intQ(eur(c) + " = ? cent", c, [c * 10, c + 100, c - 100, c + 10, c - 10], [c]);
      return moneyQ(c + " cent = ?", c, [c * 10, Math.floor(c / 10), c + 100, c - 100], eur, [c]);
    },
  },

  {
    id: "g03_bedrag_schrijven",
    label: "Bedrag schrijven",
    group: G1,
    desc: "2 euro en 35 cent = € 2,35",
    strategy: "notatie",
    tip: function(t) { return "Euro's voor de komma, centen achter de komma, altijd met twee cijfers: " + t[1] + " cent wordt ," + (t[1] < 10 ? "0" : "") + t[1] + "."; },
    uitleg: "Een bedrag schrijf je als € euro's,centen. Achter de komma staan altijd twee cijfers voor de centen. 2 euro en 35 cent = € 2,35. Let op: 5 cent schrijf je als ,05. € 2,05 is dus 2 euro en 5 cent, en € 2,50 is 2 euro en 50 cent.",
    voorbeeld: "4 euro en 5 cent = ?\n5 cent = ,05.\nAntwoord: € 4,05.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_SCHRIJF);
      var e = p[0], k = p[1], c = e * 100 + k;
      // Kernfout: centen verkeerd achter de komma (,05 ↔ ,50 of cijfers verwisseld)
      var mis = k < 10 ? e * 100 + k * 10 : (k % 10 === 0 ? e * 100 + k / 10 : e * 100 + (k % 10) * 10 + Math.floor(k / 10));
      return moneyQ(e + " euro en " + k + " cent = ?", c, [mis, c + 100, c - 100, c + 10, c - 10], eur, p);
    },
  },

  {
    id: "g04_munt_of_briefje",
    label: "Munten en briefjes",
    group: G1,
    desc: "€20 is een briefje, €2 een munt",
    strategy: "herkennen",
    tip: function() { return "Munten: 5c, 10c, 20c, 50c, €1 en €2. Briefjes: €5, €10, €20 en €50 (en grotere)."; },
    uitleg: "De euromunten zijn 1c, 2c, 5c, 10c, 20c, 50c, €1 en €2. De munten van 1c en 2c bestaan wel, maar worden in Nederland in de winkel bijna niet gebruikt. Vanaf € 5 betaal je met briefjes: €5, €10, €20, €50 en nog grotere. Een munt van €3 of een briefje van €15 bestaat niet.",
    voorbeeld: "Welk briefje bestaat niet?\n€5 €20 €15 €50\nAntwoord: €15.",
    minCorrect: 8,
    subtypes: 4,
    // Subtypen: welke is een briefje, welke is een munt, welk briefje bestaat niet, welke munt bestaat niet
    make: function(sub) {
      if (sub === 0) {
        var n = pickFrom(NOTES);
        return textQ("Welke is een briefje?", coin(n), pickFrom(SETS_3COINS).map(coin), [sub]);
      }
      if (sub === 1) {
        var m = pickFrom(COINS);
        return textQ("Welke is een munt?", coin(m), pickFrom(SETS_3NOTES).map(coin), [sub]);
      }
      if (sub === 2) return textQ("Welk briefje bestaat niet?", pickFrom(FAKE_NOTES), pickFrom(SETS_3NOTES).map(coin), [sub]);
      return textQ("Welke munt bestaat niet?", pickFrom(FAKE_COINS), pickFrom(SETS_3COINS).map(coin), [sub]);
    },
  },

  // ── BLOK 2: TELLEN ─────────────────────────────────────────────

  {
    id: "g05_centen_tellen",
    label: "Centen tellen",
    group: G2,
    desc: "20c 20c 10c 5c = 55 cent",
    strategy: "tellen",
    tip: function(t) { return "Tel van groot naar klein: " + t.join(" + ") + " = " + sum(t) + " cent."; },
    uitleg: "Tel munten van de grootste naar de kleinste. Begin bij de grootste munt en tel de volgende erbij. 20c 20c 10c 5c: 20, 40, 50, 55. Samen 55 cent.",
    voorbeeld: "50c 20c 5c = ? cent\n50, 70, 75.\nAntwoord: 75.",
    minCorrect: 8,
    make: function() {
      var m = pickFrom(ITEMS_CENTEN);
      var t = sum(m);
      return intQ(rowStr(m) + " = ? cent", t, [t - m[m.length - 1], t + 10, t - 10, t + 5, t - 5, t + 20], m);
    },
  },

  {
    id: "g06_euromunten_tellen",
    label: "Euromunten tellen",
    group: G2,
    desc: "€2 €2 €1 = € 5",
    strategy: "tellen",
    tip: function(t) { return "Tel de waarde, niet het aantal munten: " + t.map(function(c) { return c / 100; }).join(" + ") + " = " + (sum(t) / 100) + " euro."; },
    uitleg: "Tel de waarde van elke munt, niet hoeveel munten het zijn. €2 €2 €1: 2, 4, 5. Samen € 5, ook al zijn het maar 3 munten.",
    voorbeeld: "€2 €1 €1 = ?\n2, 3, 4.\nAntwoord: € 4.",
    minCorrect: 8,
    deck: true,
    make: function() {
      var m = deckPick("g06_euromunten_tellen", ITEMS_EUROMUNT);
      var t = sum(m);
      return moneyQ(rowStr(m) + " = ?", t, [t - m[m.length - 1], t + 100, t - 100, m.length * 100, t + 200], eurW, m);
    },
  },

  {
    id: "g07_euro_en_centen",
    label: "Euro's en centen tellen",
    group: G2,
    desc: "€2 50c 20c = € 2,70",
    strategy: "tellen",
    tip: function(t) {
      var eu = sum(t.filter(function(c) { return c >= 100; }));
      var ce = sum(t.filter(function(c) { return c < 100; }));
      return "Eerst de euro's: " + eurW(eu) + ". Dan de centen: " + ce + " cent. Samen " + eur(eu + ce) + ".";
    },
    uitleg: "Tel eerst de euromunten, dan de centmunten. €2 50c 20c: de euro's zijn € 2, de centen zijn 50 + 20 = 70 cent. Samen € 2,70.",
    voorbeeld: "€1 €1 20c 10c = ?\nEuro's: € 2. Centen: 30.\nAntwoord: € 2,30.",
    minCorrect: 8,
    make: function() {
      var m = pickFrom(ITEMS_EURO_CENTEN);
      var t = sum(m);
      return moneyQ(rowStr(m) + " = ?", t, [t - m[m.length - 1], t + 10, t - 10, t + 100, t - 100], eur, m);
    },
  },

  {
    id: "g08_briefjes_tellen",
    label: "Briefjes tellen",
    group: G2,
    desc: "€20 €10 €5 €2 = € 37",
    strategy: "tellen",
    tip: function(t) { return "Tel van groot naar klein: " + t.map(function(c) { return c / 100; }).join(" + ") + " = " + (sum(t) / 100) + " euro."; },
    uitleg: "Tel briefjes en munten van de grootste naar de kleinste. €20 €10 €5 €2: 20, 30, 35, 37. Samen € 37.",
    voorbeeld: "€50 €20 €1 = ?\n50, 70, 71.\nAntwoord: € 71.",
    minCorrect: 8,
    make: function() {
      var m = pickFrom(ITEMS_BRIEFJES);
      var t = sum(m);
      return moneyQ(rowStr(m) + " = ?", t, [t - m[m.length - 1], t + 500, t - 500, t + 1000, t - 1000], eurW, m);
    },
  },

  {
    id: "g09_veel_munten",
    label: "Veel munten tellen",
    group: G2,
    desc: "€2 €1 50c 20c 10c = € 3,80",
    strategy: "tellen",
    tip: function(t) {
      var eu = sum(t.filter(function(c) { return c >= 100; }));
      var ce = sum(t.filter(function(c) { return c < 100; }));
      return "Euro's: " + eurW(eu) + ". Centen: " + ce + " cent" + (ce >= 100 ? " (dat is " + eur(ce) + ")" : "") + ". Samen " + eur(eu + ce) + ".";
    },
    uitleg: "Bij veel munten tel je eerst de euromunten en dan de centmunten. Worden de centen samen 100 of meer, dan is dat weer een euro erbij. €1 50c 50c 20c 10c: € 1 + 130 cent = € 2,30.",
    voorbeeld: "€2 50c 50c 20c 5c = ?\nEuro's: € 2. Centen: 125 = € 1,25.\nAntwoord: € 3,25.",
    minCorrect: 8,
    make: function() {
      var m = pickFrom(ITEMS_VEEL);
      var t = sum(m);
      return moneyQ(rowStr(m) + " = ?", t, [t - m[m.length - 1], t + 10, t - 10, t + 100, t - 100], eur, m);
    },
  },

  // ── BLOK 3: SAMENSTELLEN ───────────────────────────────────────

  {
    id: "g10_welke_munten",
    label: "Welke munten passen",
    group: G3,
    desc: "€1 20c 10c = € 1,30",
    strategy: "samenstellen",
    tip: function(t) { return "Tel elke rij op. Alleen " + rowStr(t) + " is samen precies " + eur(sum(t)) + "."; },
    uitleg: "Tel bij elke rij de munten bij elkaar op en vergelijk met het bedrag. Precies één rij is samen het gevraagde bedrag. € 1,30: €1 20c 10c = 100 + 20 + 10 = 130 cent. Klopt.",
    voorbeeld: "Welke munten zijn samen € 0,70?\n50c 20c = 70 cent.\nAntwoord: 50c 20c.",
    minCorrect: 8,
    make: function() {
      var it = pickFrom(ITEMS_WELKE);
      var others = shuffle(it.others).slice(0, 3).map(function(r) { return rowStr(r.m); });
      return rowQ("Welke munten zijn samen " + eur(it.cor.t) + "?", rowStr(it.cor.m), others, it.cor.m);
    },
  },

  {
    id: "g11_minste_munten",
    label: "Zo min mogelijk munten",
    group: G3,
    desc: "80 cent = 50c 20c 10c",
    strategy: "grootste eerst",
    tip: function(t) { return "Neem steeds de grootste munt die nog past: " + rowStr(t) + "."; },
    uitleg: "Alle rijen zijn samen hetzelfde bedrag. Zoek de rij met de minste munten. Neem steeds de grootste munt die nog past. 80 cent: 50c (nog 30), 20c (nog 10), 10c. Dat zijn 3 munten.",
    voorbeeld: "Minste munten voor € 1,20?\n€1 (nog 20c), 20c.\nAntwoord: €1 20c.",
    minCorrect: 8,
    deck: true,
    make: function() {
      var it = deckPick("g11_minste_munten", ITEMS_MINSTE);
      var label = it.t < 100 ? it.t + " cent" : eur(it.t);
      return rowQ("Minste munten voor " + label + "?", it.rows[0], it.rows.slice(1), it.g);
    },
  },

  {
    id: "g12_aanvullen_munt",
    label: "Aanvullen met één munt",
    group: G3,
    desc: "€ 1,30 + 20c = € 1,50",
    strategy: "aanvullen",
    tip: function(t) { return "Het verschil is " + eur(t[1]) + " " + MIN + " " + eur(t[0]) + " = " + (t[1] - t[0]) + " cent: de munt " + coin(t[1] - t[0]) + "."; },
    uitleg: "Reken uit hoeveel er nog bij moet: het eindbedrag min het beginbedrag. € 1,50 − € 1,30 = 20 cent. Daar past precies één munt bij: 20c.",
    voorbeeld: "€ 2,50 + ? = € 3,00\nVerschil: 50 cent.\nAntwoord: 50c.",
    minCorrect: 8,
    make: function() {
      var gap = pickFrom(COINS);
      var s = rnd(1, Math.floor((1000 - gap) / 5)) * 5;
      var e = s + gap;
      var others = COINS.filter(function(c) { return c !== gap; }).sort(function(a, b) { return Math.abs(a - gap) - Math.abs(b - gap); }).slice(0, 3).map(coin);
      return textQ(eur(s) + " + ? = " + eur(e), coin(gap), others, [s, e]);
    },
  },

  // ── BLOK 4: VERGELIJKEN EN AFRONDEN ────────────────────────────

  {
    id: "g13_meeste_minste",
    label: "Meeste of minste geld",
    group: G4,
    desc: "€ 2,50 is meer dan € 2,05",
    strategy: "vergelijken",
    tip: function() { return "Vergelijk eerst de euro's. Zijn die gelijk, vergelijk dan de centen: ,50 is 50 cent en ,05 is maar 5 cent."; },
    uitleg: "Vergelijk eerst het getal voor de komma (de euro's). Zijn de euro's gelijk, kijk dan naar de centen achter de komma. € 2,50 is 50 cent, € 2,05 is 5 cent: € 2,50 is dus meer.",
    voorbeeld: "Welk bedrag is het meest?\n€ 3,05 € 3,50 € 3,35 € 2,95\nAntwoord: € 3,50.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: meest, minst
    make: function(sub) {
      var e = rnd(1, 9);
      var k;
      do { k = rnd(2, 19) * 5; } while (k === 50);
      var set = [e * 100 + 50, e * 100 + 5, e * 100 + k, e < 9 ? (e + 1) * 100 + 5 : (e - 1) * 100 + 95];
      var best = sub === 0 ? Math.max.apply(null, set) : Math.min.apply(null, set);
      var others = set.filter(function(c) { return c !== best; }).map(eur);
      return textQ(sub === 0 ? "Welk bedrag is het meest?" : "Welk bedrag is het minst?", eur(best), others, [sub]);
    },
  },

  {
    id: "g14_afronden_euro",
    label: "Afronden op hele euro",
    group: G4,
    desc: "€ 4,60 ≈ € 5",
    strategy: "afronden",
    tip: function(t) { return (t[0] % 100) + " cent is " + (t[0] % 100 > 50 ? "meer" : "minder") + " dan 50 cent, dus rond je af naar " + eurW(Math.round(t[0] / 100) * 100) + "."; },
    uitleg: "Kijk naar de centen. Minder dan 50 cent: naar beneden afronden. Meer dan 50 cent: naar boven. € 4,60 wordt € 5, € 4,30 wordt € 4.",
    voorbeeld: "€ 7,85 afgerond op hele euro?\n85 cent is meer dan 50.\nAntwoord: € 8.",
    minCorrect: 8,
    make: function() {
      var c = pickFrom(ITEMS_AFROND_EURO);
      var f = Math.floor(c / 100);
      var r = Math.round(c / 100);
      var lo = f - 1 < 1 ? f : f - 1;
      return moneyQ(eur(c) + " afgerond op hele euro?", r * 100, [lo * 100, f * 100, (f + 1) * 100, (f + 2) * 100, (lo + 3) * 100], eurW, [c]);
    },
  },

  {
    id: "g15_afronden_contant",
    label: "Afronden bij contant betalen",
    group: G4,
    desc: "Totaal € 2,43, contant € 2,45",
    strategy: "afronden",
    tip: function(t) { var d = t[0] % 10; return "Het totaal eindigt op " + d + ". " + (d <= 2 ? "1 of 2: naar beneden" : d <= 4 ? "3 of 4: naar 5" : d <= 7 ? "6 of 7: naar 5" : "8 of 9: naar boven") + ". Je betaalt " + eur(cashRound(t[0])) + "."; },
    uitleg: "Betaal je in Nederland contant, dan wordt het TOTAAL bij de kassa afgerond op 5 cent. Eindigt het op 1 of 2: naar beneden (naar 0). Op 3 of 4: naar 5. Op 6 of 7: naar 5. Op 8 of 9: naar boven. Losse prijzen worden niet afgerond, en bij pinnen ook niet.",
    voorbeeld: "Totaal € 3,48. Contant betaal je?\nEindigt op 8: naar boven.\nAntwoord: € 3,50.",
    minCorrect: 8,
    make: function() {
      var c = pickFrom(ITEMS_CONTANT);
      var r = cashRound(c);
      var other = r > c ? r - 5 : r + 5;
      return moneyQ("Totaal " + eur(c) + ". Contant betaal je?", r, [c, other, Math.round(c / 10) * 10, r + 10, r - 10], eur, [c]);
    },
  },

  // ── BLOK 5: PRIJZEN OPTELLEN ───────────────────────────────────

  {
    id: "g16_plus_hele_euros",
    label: "Hele euro's optellen",
    group: G5,
    desc: "€ 12 + € 7 = € 19",
    strategy: "optellen",
    tip: function(t) { return "Tel de euro's op zoals gewone getallen: " + t[0] + " + " + t[1] + " = " + (t[0] + t[1]) + "."; },
    uitleg: "Hele euro's tel je op zoals gewone getallen. € 12 + € 7 = € 19.",
    voorbeeld: "€ 25 + € 8 = ?\n25 + 8 = 33.\nAntwoord: € 33.",
    minCorrect: 8,
    make: function() {
      var a, b;
      do { a = rnd(10, 89); b = rnd(2, 19); } while (a + b > 99);
      var t = (a + b) * 100;
      return moneyQ(eurW(a * 100) + " + " + eurW(b * 100) + " =", t, [t + 100, t - 100, t + 1000, t - 1000], eurW, [a, b]);
    },
  },

  {
    id: "g17_plus_zonder",
    label: "Prijzen optellen zonder overgang",
    group: G5,
    desc: "€ 2,30 + € 1,20 = € 3,50",
    strategy: "splitsen",
    tip: function(t) { return "Euro's: " + Math.floor(t[0] / 100) + " + " + Math.floor(t[1] / 100) + ". Centen: " + (t[0] % 100) + " + " + (t[1] % 100) + " = " + (t[0] % 100 + t[1] % 100) + "."; },
    uitleg: "Tel de euro's bij elkaar en de centen bij elkaar. € 2,30 + € 1,20: euro's 2 + 1 = 3, centen 30 + 20 = 50. Samen € 3,50.",
    voorbeeld: "€ 4,15 + € 2,60 = ?\nEuro's: 6. Centen: 75.\nAntwoord: € 6,75.",
    minCorrect: 8,
    make: function() {
      var a, b;
      do { a = rnd(21, 199) * 5; b = rnd(21, 199) * 5; } while (a % 100 === 0 || b % 100 === 0 || a % 100 + b % 100 >= 100);
      var t = a + b;
      return moneyQ(eur(a) + " + " + eur(b) + " =", t, [t + 100, t - 100, t + 10, t - 10, t + 5], eur, [a, b]);
    },
  },

  {
    id: "g18_plus_met",
    label: "Prijzen optellen met overgang",
    group: G5,
    desc: "€ 2,75 + € 1,50 = € 4,25",
    strategy: "overgang",
    tip: function(t) { var ce = t[0] % 100 + t[1] % 100; return "Centen: " + (t[0] % 100) + " + " + (t[1] % 100) + " = " + ce + " = 1 euro en " + (ce - 100) + " cent. Die euro komt erbij."; },
    uitleg: "Zijn de centen samen 100 of meer, dan wordt dat een euro erbij. € 2,75 + € 1,50: centen 75 + 50 = 125 = € 1,25. Euro's 2 + 1 = 3, plus die 1 euro = 4. Samen € 4,25.",
    voorbeeld: "€ 3,60 + € 2,55 = ?\nCenten: 115 = € 1,15. Euro's: 5 + 1 = 6.\nAntwoord: € 6,15.",
    minCorrect: 12,
    make: function() {
      var a, b;
      do { a = rnd(21, 199) * 5; b = rnd(21, 199) * 5; } while (a % 100 === 0 || b % 100 === 0 || a % 100 + b % 100 < 100);
      var t = a + b;
      // Typische fout: de euro uit de centen vergeten
      return moneyQ(eur(a) + " + " + eur(b) + " =", t, [t - 100, t + 100, t + 10, t - 10, t - 5], eur, [a, b]);
    },
  },

  {
    id: "g19_drie_prijzen",
    label: "Drie prijzen optellen",
    group: G5,
    desc: "€ 1,25 + € 2,50 + € 0,75 = € 4,50",
    strategy: "handig optellen",
    tip: function(t) { return "Tel er eerst twee op en dan de derde erbij: " + eur(t[0] + t[1]) + " + " + eur(t[2]) + " = " + eur(sum(t)) + "."; },
    uitleg: "Tel eerst twee prijzen op en tel dan de derde erbij. Zoek handige paren: € 1,25 + € 0,75 = € 2,00. Plus € 2,50 = € 4,50.",
    voorbeeld: "€ 0,50 + € 1,25 + € 0,50 = ?\n€ 0,50 + € 0,50 = € 1,00.\nAntwoord: € 2,25.",
    minCorrect: 8,
    make: function() {
      var p = shuffle(pickFrom(ITEMS_DRIE));
      var t = sum(p);
      return moneyQ(eur(p[0]) + " + " + eur(p[1]) + " + " + eur(p[2]) + " =", t, [t - 100, t + 100, t - 25, t + 25, t + 50], eur, p);
    },
  },

  // ── BLOK 6: BETALEN EN WISSELGELD ──────────────────────────────

  {
    id: "g20_aanvullen_euro",
    label: "Aanvullen tot hele euro",
    group: G6,
    desc: "€ 3,65 + € 0,35 = € 4,00",
    strategy: "aanvullen",
    tip: function(t) { var k = t[0] % 100; return "Vul " + k + " cent aan tot 100: " + k + " + " + (100 - k) + " = 100."; },
    uitleg: "Aanvullen tot een hele euro: hoeveel cent mist er tot 100? € 3,65: 65 + 5 = 70, 70 + 30 = 100. Er mist 35 cent, dus € 0,35. Pas op: het is niet 45, want 65 + 45 = 110.",
    voorbeeld: "€ 5,80 + ? = € 6,00\n80 + 20 = 100.\nAntwoord: € 0,20.",
    minCorrect: 8,
    make: function() {
      var c;
      do { c = rnd(21, 199) * 5; } while (c % 100 === 0);
      var e = Math.ceil(c / 100) * 100;
      var g = e - c;
      return moneyQ(eur(c) + " + ? = " + eur(e), g, [g + 10, g + 100, g - 10, g + 5, g - 5], eur, [c, e]);
    },
  },

  {
    id: "g21_wisselgeld_5",
    label: "Wisselgeld van € 5",
    group: G6,
    desc: "Kost € 3,40, je geeft € 5: € 1,60 terug",
    strategy: "aanvullen",
    tip: function(t) { return "Vul aan van " + eur(t[0]) + " tot " + eurW(t[1]) + ": je krijgt " + eur(t[1] - t[0]) + " terug."; },
    uitleg: "Wisselgeld is wat je terugkrijgt: betaald min de prijs. Handig is aanvullen vanaf de prijs. Kost € 3,40, je geeft € 5: € 3,40 + € 0,60 = € 4, en + € 1 = € 5. Terug: € 1,60.",
    voorbeeld: "Kost € 2,75. Je geeft € 5. Terug?\n€ 2,75 + € 0,25 = € 3, + € 2 = € 5.\nAntwoord: € 2,25.",
    minCorrect: 8,
    make: function() {
      var p;
      do { p = rnd(1, 99) * 5; } while (p % 100 === 0);
      return moneyQ("Kost " + eur(p) + ". Je geeft " + eurW(500) + ". Terug?", 500 - p, changeCands(500 - p), eur, [p, 500], 5000);
    },
  },

  {
    id: "g22_wisselgeld_10_20",
    label: "Wisselgeld van € 10 en € 20",
    group: G6,
    desc: "Kost € 13,75, je geeft € 20: € 6,25 terug",
    strategy: "aanvullen",
    tip: function(t) { return "Vul aan van " + eur(t[0]) + " tot " + eurW(t[1]) + ": je krijgt " + eur(t[1] - t[0]) + " terug."; },
    uitleg: "Vul aan vanaf de prijs: eerst tot een hele euro, dan tot het briefje. Kost € 13,75, je geeft € 20: € 13,75 + € 0,25 = € 14, + € 6 = € 20. Terug: € 6,25.",
    voorbeeld: "Kost € 6,40. Je geeft € 10. Terug?\n€ 6,40 + € 0,60 = € 7, + € 3 = € 10.\nAntwoord: € 3,60.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: € 10, € 20
    make: function(sub) {
      var pay = sub === 0 ? 1000 : 2000;
      var p;
      do { p = rnd(pay / 10 + 1, pay / 5 - 1) * 5; } while (p % 100 === 0);
      return moneyQ("Kost " + eur(p) + ". Je geeft " + eurW(pay) + ". Terug?", pay - p, changeCands(pay - p), eur, [p, pay], 5000);
    },
  },

  {
    id: "g23_wisselgeld_50",
    label: "Wisselgeld van € 50",
    group: G6,
    desc: "Kost € 26,60, je geeft € 50: € 23,40 terug",
    strategy: "aanvullen",
    tip: function(t) { return "Vul aan van " + eur(t[0]) + " tot " + eurW(t[1]) + ": je krijgt " + eur(t[1] - t[0]) + " terug."; },
    uitleg: "Vul aan in stappen: tot een hele euro, dan tot een tiental, dan tot € 50. Kost € 26,60: + € 0,40 = € 27, + € 3 = € 30, + € 20 = € 50. Terug: € 23,40.",
    voorbeeld: "Kost € 38,25. Je geeft € 50. Terug?\n+ € 0,75 = € 39, + € 1 = € 40, + € 10 = € 50.\nAntwoord: € 11,75.",
    minCorrect: 12,
    make: function() {
      var p;
      do { p = rnd(401, 999) * 5; } while (p % 100 === 0);
      return moneyQ("Kost " + eur(p) + ". Je geeft " + eurW(5000) + ". Terug?", 5000 - p, changeCands(5000 - p), eur, [p, 5000], 5000);
    },
  },

  {
    id: "g24_wisselgeld_munten",
    label: "Wisselgeld in munten",
    group: G6,
    desc: "€ 3,40 betalen met € 5: €1 50c 10c terug",
    strategy: "aanvullen",
    tip: function(t) { return "Je krijgt " + eur(t[1] - t[0]) + " terug. Dat is " + rowStr(greedy(t[1] - t[0])) + "."; },
    uitleg: "Reken eerst uit hoeveel je terugkrijgt, en zoek dan de rij munten die samen precies dat bedrag is. € 3,40 betalen met € 5: terug € 1,60 = €1 50c 10c.",
    voorbeeld: "€ 4,30 betalen met € 5: terug?\nTerug € 0,70.\nAntwoord: 50c 20c.",
    minCorrect: 8,
    make: function() {
      var it = pickFrom(ITEMS_TERUG_MUNT);
      var r = it[1] - it[0];
      var g = greedy(r);
      var seen = {};
      seen[rowStr(g)] = true;
      var swaps = [];
      // Afleiders: één munt vervangen door een andere munt, zodat het totaal niet meer klopt
      g.forEach(function(c, i) {
        COINS.forEach(function(o) {
          if (o === c) return;
          var a = g.slice();
          a[i] = o;
          a.sort(desc);
          var s = rowStr(a);
          var tot = sum(a);
          if (tot !== r && Math.abs(tot - r) <= 50 && s.length <= MAX_ROW && !seen[s]) { seen[s] = true; swaps.push(s); }
        });
      });
      return rowQ(eur(it[0]) + " betalen met " + eurW(it[1]) + ": terug?", rowStr(g), shuffle(swaps).slice(0, 3), it);
    },
  },

  {
    id: "g25_tekort_of_over",
    label: "Tekort of over",
    group: G6,
    desc: "Je hebt € 5, kost € 5,40: € 0,40 tekort",
    strategy: "verschil",
    tip: function(t) { return "Het verschil tussen " + eurW(t[0]) + " en " + eur(t[1]) + " is " + eur(Math.abs(t[1] - t[0])) + "."; },
    uitleg: "Vergelijk wat je hebt met wat het kost. Kost het meer, dan heb je een tekort. Kost het minder, dan houd je geld over. Het verschil is het tekort of wat je overhoudt. Je hebt € 5, het kost € 5,40: € 0,40 tekort.",
    voorbeeld: "Je hebt € 8. Kost € 6,50. Over?\n€ 8 − € 6,50 = € 1,50.\nAntwoord: € 1,50.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: tekort, over
    make: function(sub) {
      var h = rnd(2, 20) * 100;
      var d;
      do { d = rnd(1, 39) * 5; } while (d % 100 === 0 || (sub === 1 && d >= h));
      var cost = sub === 0 ? h + d : h - d;
      return moneyQ("Je hebt " + eurW(h) + ". Kost " + eur(cost) + ". " + (sub === 0 ? "Tekort?" : "Over?"), d, [d + 100, d + 10, d - 10, d + 5, d - 5], eur, [h, cost]);
    },
  },

  // ── BLOK 7: KEER EN DELEN ──────────────────────────────────────

  {
    id: "g26_keer_hele_euros",
    label: "Keer met hele euro's",
    group: G7,
    desc: "4 × € 3 = € 12",
    strategy: "tafels",
    tip: function(t) { return t[0] + " × " + t[1] + " = " + (t[0] * t[1]) + ", dus " + eurW(t[0] * t[1] * 100) + "."; },
    uitleg: "Keer met hele euro's reken je met de tafels. 4 × € 3 = € 12, want 4 × 3 = 12.",
    voorbeeld: "6 × € 5 = ?\n6 × 5 = 30.\nAntwoord: € 30.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_KEER_EURO);
      var n = p[0], e = p[1], t = n * e * 100;
      return moneyQ(n + TIMES + eurW(e * 100) + " =", t, [t + e * 100, t - e * 100, t + n * 100, t - n * 100, t + 100], eurW, p);
    },
  },

  {
    id: "g27_keer_centen",
    label: "Keer met centen",
    group: G7,
    desc: "3 × € 1,40 = € 4,20",
    strategy: "splitsen",
    tip: function(t) { var e = Math.floor(t[1] / 100), k = t[1] % 100; return t[0] + " × " + e + " euro = " + eurW(t[0] * e * 100) + ". " + t[0] + " × " + k + " cent = " + (t[0] * k) + " cent. Samen " + eur(t[0] * t[1]) + "."; },
    uitleg: "Splits het bedrag in euro's en centen. 3 × € 1,40: 3 × 1 euro = € 3 en 3 × 40 cent = 120 cent = € 1,20. Samen € 4,20. Vergeet de euro uit de centen niet.",
    voorbeeld: "4 × € 2,25 = ?\n4 × € 2 = € 8, 4 × 25 cent = € 1,00.\nAntwoord: € 9,00.",
    minCorrect: 12,
    make: function() {
      var p = pickFrom(ITEMS_KEER_CENT);
      var n = p[0], c = p[1], t = n * c;
      // Typische fout: de euro's uit de centen vergeten
      var noCarry = n * Math.floor(c / 100) * 100 + (n * (c % 100)) % 100;
      return moneyQ(n + TIMES + eur(c) + " =", t, [noCarry, t + c, t - c, t + 10, t - 10], eur, p);
    },
  },

  {
    id: "g28_eerlijk_verdelen",
    label: "Geld eerlijk verdelen",
    group: G7,
    desc: "€ 12 : 4 = € 3",
    strategy: "delen",
    tip: function(t) { return (t[0] * t[1]) + " : " + t[0] + " = " + t[1] + ", want " + t[0] + " × " + t[1] + " = " + (t[0] * t[1]) + "."; },
    uitleg: "Geld eerlijk verdelen is delen: iedereen krijgt evenveel. € 12 verdelen over 4 kinderen: € 12 : 4 = € 3 per kind, want 4 × 3 = 12.",
    voorbeeld: "€ 20 : 5 = ?\n5 × 4 = 20.\nAntwoord: € 4.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_VERDEEL);
      var d = p[0], q = p[1], tot = d * q;
      return moneyQ(eurW(tot * 100) + DIV + d + " =", q * 100, [(q + 1) * 100, (q - 1) * 100, (q + 2) * 100, (tot - d) * 100, q * 200, (q + 3) * 100, (q + 4) * 100], eurW, p);
    },
  },

  {
    id: "g29_prijs_per_stuk",
    label: "Prijs per stuk",
    group: G7,
    desc: "4 stuks voor € 6,00: € 1,50 per stuk",
    strategy: "delen",
    tip: function(t) { return eur(t[0] * t[1]) + " : " + t[0] + " = " + eur(t[1]) + ", want " + t[0] + " × " + eur(t[1]) + " = " + eur(t[0] * t[1]) + "."; },
    uitleg: "De prijs van één stuk vind je door de totale prijs te delen door het aantal. 4 stuks voor € 6: € 6 : 4 = € 1,50. Controle: 4 × € 1,50 = € 6.",
    voorbeeld: "3 stuks voor € 4,50. Eén stuk?\n€ 4,50 : 3 = € 1,50.\nAntwoord: € 1,50.",
    minCorrect: 8,
    make: function() {
      var p = pickFrom(ITEMS_PER_STUK);
      var n = p[0], u = p[1], tot = n * u;
      var cands = [];
      // Typische fout: door 1 te veel of te weinig gedeeld (alleen als dat een heel aantal centen in stappen van 5 geeft)
      if (tot % ((n + 1) * 5) === 0) cands.push(tot / (n + 1));
      if (n > 2 && tot % ((n - 1) * 5) === 0) cands.push(tot / (n - 1));
      return moneyQ(n + " stuks voor " + eurQ(tot) + ". Eén stuk?", u, cands.concat([u + 10, u - 10, u + 100, u - 5]), eur, p);
    },
  },

  // ── BLOK 8: TOEPASSEN ──────────────────────────────────────────

  {
    id: "g30_prijsverschil",
    label: "Prijsverschil",
    group: G8,
    desc: "€ 4,50 − € 2,75 = € 1,75",
    strategy: "aanvullen",
    tip: function(t) { return "Vul aan van " + eur(t[1]) + " tot " + eur(t[0]) + ": het verschil is " + eur(t[0] - t[1]) + "."; },
    uitleg: "Het verschil tussen twee prijzen vind je met aftrekken of door aan te vullen. € 4,50 − € 2,75: vul aan van € 2,75 tot € 3 (25 cent) en van € 3 tot € 4,50 (€ 1,50). Samen € 1,75. Fout is: 75 − 50 = 25 doen in plaats van lenen.",
    voorbeeld: "€ 6,20 − € 3,80 = ?\n€ 3,80 + € 0,20 = € 4, + € 2,20 = € 6,20.\nAntwoord: € 2,40.",
    minCorrect: 12,
    make: function() {
      var a, b;
      do { a = rnd(41, 199) * 5; b = rnd(21, 199) * 5; } while (a % 100 === 0 || b % 100 === 0 || a - b < 50);
      var t = a - b;
      // Typische fout: bij de centen klein van groot afgetrokken
      var swapErr = Math.floor(a / 100) * 100 - Math.floor(b / 100) * 100 + Math.abs(a % 100 - b % 100);
      return moneyQ(eur(a) + " " + MIN + " " + eur(b) + " =", t, [swapErr, t + 100, t + 10, t - 10, t - 5, t + 5, t + 20], eur, [a, b]);
    },
  },

  {
    id: "g31_halve_prijs",
    label: "Halve prijs",
    group: G8,
    desc: "De helft van € 7 = € 3,50",
    strategy: "halveren",
    tip: function(t) { return "De helft van " + eurQ(t[0]) + ": " + t[0] + " cent : 2 = " + (t[0] / 2) + " cent = " + eur(t[0] / 2) + "."; },
    uitleg: "De helft is delen door 2. Bij een oneven aantal euro's houd je een euro over, en de helft daarvan is 50 cent. De helft van € 7: de helft van € 6 = € 3, de helft van € 1 = € 0,50. Samen € 3,50.",
    voorbeeld: "De helft van € 5,40 = ?\nDe helft van € 4 = € 2, de helft van € 1,40 = € 0,70.\nAntwoord: € 2,70.",
    minCorrect: 8,
    make: function() {
      var c = pickFrom(ITEMS_HELFT);
      var h = c / 2;
      // Typische fout: de overgebleven euro vergeten (alleen bij een oneven aantal euro's anders)
      var restErr = Math.floor(c / 200) * 100 + (c % 100) / 2;
      return moneyQ("De helft van " + eurQ(c) + " =", h, [restErr, c, h + 50, h - 50, h + 5, h - 5], eur, [c]);
    },
  },

  {
    id: "g32_hoeveel_kopen",
    label: "Hoeveel kun je kopen",
    group: G8,
    desc: "€ 10, stuk € 2,50: 4 stuks",
    strategy: "delen met rest",
    tip: function(t) {
      var n = Math.floor(t[0] / t[1]);
      var rest = t[0] - n * t[1];
      return n + " × " + eur(t[1]) + " = " + eur(n * t[1]) + (rest > 0 ? ". Je houdt " + eur(rest) + " over, te weinig voor nog een stuk." : ". Het geld is precies op.");
    },
    uitleg: "Je kunt alleen hele stuks kopen. Hoeveel keer past de prijs in je geld? Wat overblijft is wisselgeld. € 10, stuk € 2,75: 3 × € 2,75 = € 8,25. Een vierde kost samen € 11, dat is te veel. Antwoord: 3.",
    voorbeeld: "€ 10, stuk € 2,50. Hoeveel max?\n4 × € 2,50 = € 10, precies op.\nAntwoord: 4.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen (B1, 50/50 over tijd): 0 = gaat precies op, 1 = met rest
    make: function(sub) {
      var p = pickFrom(sub === 0 ? ITEMS_KOOP_PRECIES : ITEMS_KOOP_REST);
      var b = p[0], pr = p[1];
      var n = Math.floor(b / pr);
      // Afronden naar boven is alleen een FOUTE keuze (bij rest); het goede antwoord is altijd naar beneden
      return intQ(eurW(b) + ", stuk " + eur(pr) + ". Hoeveel max?", n, [Math.ceil(b / pr), n + 1, n - 1, n + 2], p);
    },
  },

  {
    id: "g33_schatten",
    label: "Schatten met prijzen",
    group: G8,
    desc: "€ 1,95 + € 2,98 ≈ € 5",
    strategy: "afronden",
    tip: function(t) { return "Rond elke prijs af op een hele euro: " + eur(t[0]) + " " + APPROX + " " + eurW(Math.round(t[0] / 100) * 100) + " en " + eur(t[1]) + " " + APPROX + " " + eurW(Math.round(t[1] / 100) * 100) + "."; },
    uitleg: "Bij schatten rond je elke prijs af op een hele euro en tel je die op. € 1,95 is bijna € 2, € 2,98 is bijna € 3. Samen ongeveer € 5.",
    voorbeeld: "Ongeveer: € 3,99 + € 1,02 ≈ ?\n€ 4 + € 1.\nAntwoord: € 5.",
    minCorrect: 8,
    make: function() {
      var a = pickFrom(NEAR), b = pickFrom(NEAR);
      var t = Math.round(a / 100) + Math.round(b / 100);
      var opts = estimateChoices(t, 2);
      return { terms: [a, b], question: "Ongeveer: " + eur(a) + " + " + eur(b) + " " + APPROX + " ?", answer: eurW(t * 100), choices: opts.map(function(v) { return eurW(v * 100); }) };
    },
  },

  // ── BLOK 9: CONTROLEREN ────────────────────────────────────────

  {
    id: "g34_missend_bedrag",
    label: "Missend bedrag",
    group: G9,
    desc: "? + € 1,25 = € 4,00",
    strategy: "aanvullen",
    tip: function(t) { return eur(t[1]) + " " + MIN + " " + eur(t[0]) + " = " + eur(t[1] - t[0]) + "."; },
    uitleg: "Zoek het bedrag dat mist: het totaal min het bedrag dat je wel weet. ? + € 1,25 = € 4,00: € 4,00 − € 1,25 = € 2,75. Controle: € 2,75 + € 1,25 = € 4,00.",
    voorbeeld: "€ 2,50 + ? = € 6,00\n€ 6,00 − € 2,50 = € 3,50.\nAntwoord: € 3,50.",
    minCorrect: 8,
    subtypes: 2,
    // Subtypen: ontbrekend eerste bedrag, ontbrekend tweede bedrag
    make: function(sub) {
      var a, e;
      do { a = rnd(21, 99) * 5; e = rnd(2, 10) * 100; } while (a % 100 === 0 || e - a < 105);
      var m = e - a;
      var q = sub === 0 ? "? + " + eur(a) + " = " + eur(e) : eur(a) + " + ? = " + eur(e);
      return moneyQ(q, m, [m + 100, m + 10, m - 10, m + 5, m - 5], eur, [a, e]);
    },
  },

  {
    id: "g35_fout_spotten",
    label: "Fout spotten: wisselgeld",
    group: G9,
    desc: "Welk wisselgeld is fout?",
    strategy: "controleren",
    tip: function(t) { return "Tel prijs en wisselgeld op: samen moet het " + eurW(t[1]) + " zijn. Bij " + eur(t[0]) + " hoort " + eur(t[1] - t[0]) + " terug."; },
    uitleg: "Controleer wisselgeld door de prijs en het wisselgeld op te tellen. Samen moet dat precies het betaalde bedrag zijn. Betaald € 5: € 3,35 + € 1,65 = € 5,00, dat klopt. Veel gemaakte fouten: de euro van het lenen vergeten (een euro te veel terug), 10 cent te weinig, of elk cijfer tot 10 aanvullen (10 cent te veel terug).",
    voorbeeld: "Betaald € 5. Welke is FOUT?\n€ 2,45: € 3,55 → samen € 6,00.\nDie is fout.",
    minCorrect: 12,
    subtypes: 3,
    // Subtypen = fouttype: A lenen vergeten (+€1), B 10 cent te weinig (−10c), C elk cijfer tot 10 aangevuld (+10c)
    make: function(sub) {
      var pay = rnd(0, 1) === 0 ? 500 : 1000;
      var list = FOUT_PRICES[pay];
      var p;
      // Type B alleen als er meer dan 10 cent terug is; type C alleen als het tientallen-cijfer
      // van de centen niet 0 is
      do { p = pickFrom(list); } while ((sub === 1 && pay - p <= 10) || (sub === 2 && Math.floor((p % 100) / 10) === 0));
      var r = pay - p;
      var w = sub === 0 ? r + 100 : sub === 1 ? r - 10 : r + 10;
      var wrong = eur(p) + ": " + eur(w);
      var good = shuffle(list.filter(function(x) { return x !== p; })).slice(0, 3).map(function(x) { return eur(x) + ": " + eur(pay - x); });
      return {
        terms:          [p, pay, sub],
        question:       "Betaald " + eurW(pay) + ". Welke is FOUT?",
        answer:         wrong,
        choices:        shuffle([wrong].concat(good)),
        isErrorSpotter: true,
      };
    },
  },

  {
    id: "g36_kort_toepassen",
    label: "Kort toepassen",
    group: G9,
    desc: "3 ijsjes van € 1,50 = € 4,50",
    strategy: "toepassen",
    tip: function(t) { return t[0] + " × " + eur(t[1]) + " = " + eur(t[0] * t[1]) + "."; },
    uitleg: "Koop je meer van hetzelfde, dan reken je aantal keer prijs. 3 ijsjes van € 1,50: 3 × € 1,50 = € 4,50.",
    voorbeeld: "4 pennen van € 0,75 = ?\n4 × € 0,75 = € 3,00.\nAntwoord: € 3,00.",
    minCorrect: 8,
    make: function() {
      var n = rnd(2, 5);
      var p = rnd(1, 10) * 25;
      var t = n * p;
      return moneyQ(n + " " + pickFrom(ITEMS_DINGEN) + " van " + eur(p) + " =", t, [t + p, t - p, t + 100, t - 100, t + 50], eur, [n, p]);
    },
  },
];

// ─────────────────────────────────────────────────────────────────
// SKILLS MET VRAAGVERLOOP + g37 SNELHEIDSRONDE
// ─────────────────────────────────────────────────────────────────

var SKILLS = createSkills("geld", RAW_SKILLS);
var MIXER  = createMixer(RAW_SKILLS, BLOCK_GROUPS, SKILLS.byId);

export var GELD_SKILLS = SKILLS.list;

registerSkillId("geld", "g37_snelheid");

GELD_SKILLS.push({
  id:         "g37_snelheid",
  label:      "Snelheidsronde",
  group:      G10,
  desc:       "Gemengd: alle soorten geldsommen",
  strategy:   "snel",
  tip:        "Kijk eerst wat voor som het is: tellen, optellen, wisselgeld of keer. Kies dan de handigste aanpak.",
  uitleg:     "In de snelheidsronde komen alle soorten geldsommen door elkaar voorbij. Kies per som de aanpak die je hebt geleerd.",
  voorbeeld:  "Gemengd, bijvoorbeeld:\n€2 50c 20c = ?, € 2,75 + € 1,50, wisselgeld van € 5",
  minCorrect: 15,
  generate:   MIXER.generate,
});

export var GELD_ORDER = GELD_SKILLS.map(function(s) { return s.id; });
