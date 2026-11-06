// Wiskunde, domein Meetkunde: hoeken, figuren, oppervlakte, cirkel, Pythagoras, ruimtefiguren en
// gelijkvormigheid. NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Afspraken (plan MK):
// - pi = 3,14 (PI_H = 314 honderdsten), nergens de echte pi.
// - Rekenen in hele getallen (honderdsten of tienden); afronden met een eigen functie: een 5 gaat omhoog.
// - Antwoorden met een eenheid: "<getal> <eenheid>", zonder eindnul ("113 cm²", niet "113,0 cm²").
//   Alle vier de keuzes van een vraag hebben dezelfde eenheid.
// - Hoeken zijn hele graden (antwoord is een getal).
// - Elke vaardigheid krijgt de theorie van haar blok (veld theorie, getoond in het 💡-venster).

import { rnd, shuffle } from "./helpers.js";
import { createSkills } from "./flow.js";

var NB   = " ";
var MIN  = "−";
var DOT  = "·";
var PI_H = 314;

function pickOne(list) { return list[rnd(0, list.length - 1)]; }

// ── Afronden en schrijven (alleen hele getallen, positief) ─────────
// Breuk teller/noemer afronden op tienden, een 5 gaat omhoog: aantal tienden
function tiendenVan(teller, noemer) { return Math.floor((20 * teller + noemer) / (2 * noemer)); }
// Gehele wortel (grootste n met n·n <= x)
function isqrt(x) { var n = Math.floor(Math.sqrt(x)); while (n * n > x) n--; while ((n + 1) * (n + 1) <= x) n++; return n; }
// Wortel van x op tienden afgerond (een 5 gaat omhoog; een wortel van een geheel getal valt nooit op ,x5)
function wortelTienden(x) { return Math.floor((isqrt(400 * x) + 1) / 2); }
// Tienden schrijven zonder eindnul: 502 -> "50,2", 1130 -> "113"
function schrijfT(t) { return t % 10 === 0 ? String(t / 10) : Math.floor(t / 10) + "," + (t % 10); }
// Honderdsten schrijven zonder eindnullen: 2512 -> "25,12", 3140 -> "31,4", 300 -> "3"
function schrijfH(h) {
  var heel = Math.floor(h / 100), rest = h % 100;
  if (rest === 0) return String(heel);
  var r = rest < 10 ? "0" + rest : String(rest);
  return heel + "," + r.replace(/0$/, "");
}
// Alleen positieve maten; 0 of negatief (een foute keuze die niet kan) wordt null en valt af
function maat(t, eenheid) { return t > 0 ? schrijfT(t) + NB + eenheid : null; }   // t in tienden
function maatH(n, eenheid) { return n > 0 ? n + NB + eenheid : null; }            // heel getal

// ── Keuzes en vraag ───────────────────────────────────────────────
// Eerste item is het goede antwoord; dubbele en lege items vallen af; minder dan 4 -> null (opnieuw)
function choose4(items) {
  var uit = [];
  items.forEach(function(it) {
    if (it === null || it === undefined || uit.length >= 4) return;
    if (typeof it === "number" && (!(it > 0) || Math.floor(it) !== it)) return;
    if (uit.some(function(u) { return String(u) === String(it); })) return;
    uit.push(it);
  });
  if (uit.length < 4) return null;
  return { answer: uit[0], choices: shuffle(uit) };
}
// extra: velden die bij de vraag horen, zoals figuur (TK2: tekening met de getallen van deze vraag,
// alleen uit waarden die de generator al heeft; geen extra toeval)
function Q(question, c, stappen, extra) {
  if (!c) return null;
  var q = { question: question, answer: c.answer, choices: c.choices, terms: [stappen] };
  // Een hele zin als vraag: kleinere letter in het oefenscherm (zie PracticeScreen, isTekstVraag)
  if (question.length > 22) q.tekstVraag = true;
  if (c.choices.some(function(t) { return String(t).length > 9; })) q.smallChoices = true;
  if (extra) { for (var k in extra) q[k] = extra[k]; }
  return q;
}
function retry(fn) { for (var i = 0; i < 400; i++) { var q = fn(); if (q) return q; } throw new Error("geen geldige vraag"); }

// Pythagorese drietallen (a < b < c)
var DRIETAL = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41], [12, 35, 37]];
function drietal(maxC) {
  var opties = [];
  DRIETAL.forEach(function(t) { for (var k = 1; k * t[2] <= maxC; k++) opties.push([t[0] * k, t[1] * k, t[2] * k]); });
  return pickOne(opties);
}
function isKwadraat(x) { var n = isqrt(x); return n * n === x; }

var GEN = {};

// ── Blok 1: Hoeken ────────────────────────────────────────────────

var HOEKSOORT = ["scherp", "recht", "stomp", "gestrekt"];
GEN.mk01 = function(sub) {
  var vraag, soort;
  if (sub === 0) { var a = rnd(5, 85); vraag = "Een hoek van " + a + "° is …"; soort = "scherp"; }
  else if (sub === 1) { vraag = pickOne(["Een hoek van 90° is …", "Een kwart draai is een … hoek", "De hoek tussen de wijzers om 3 uur is …", "De hoek tussen de wijzers om 9 uur is …"]); soort = "recht"; }
  else if (sub === 2) { var b = rnd(95, 175); vraag = "Een hoek van " + b + "° is …"; soort = "stomp"; }
  else { vraag = pickOne(["Een hoek van 180° is …", "Een halve draai is een … hoek", "De hoek tussen de wijzers om 6 uur is …"]); soort = "gestrekt"; }
  var uitleg = { scherp: "kleiner dan 90°", recht: "precies 90°", stomp: "tussen 90° en 180°", gestrekt: "precies 180°" }[soort];
  return Q(vraag, choose4([soort].concat(HOEKSOORT.filter(function(s) { return s !== soort; }))),
    "Scherp is kleiner dan 90°, recht precies 90°, stomp tussen 90° en 180°, gestrekt precies 180°. Deze hoek is " + uitleg + ": " + soort + ".");
};
GEN.mk02 = function() {
  var a = rnd(15, 165);
  if (a === 90) return null;
  var ans = 180 - a;
  return Q("Nevenhoek van " + a + "° = ? (graden)", choose4([ans, 90 - a, 360 - a, a, 180 + a]),
    "Nevenhoeken liggen samen op een rechte lijn: samen 180°. 180 " + MIN + " " + a + " = " + ans + ".");
};
GEN.mk03 = function(sub) {
  var a = rnd(20, 160);
  if (a === 90) return null;
  if (sub === 0) {
    return Q("Twee lijnen snijden elkaar. Eén hoek is " + a + "°. De overstaande hoek = ? (graden)", choose4([a, 180 - a, 360 - a, Math.abs(90 - a)]),
      "Overstaande hoeken zijn gelijk: allebei nevenhoek van dezelfde hoek. Dus " + a + "°.", { figuur: { soort: "kruis", gegeven: { a: a }, gevraagd: "overstaand" } });
  }
  return Q("Twee lijnen snijden elkaar. Eén hoek is " + a + "°. De hoek ernaast (nevenhoek) = ? (graden)", choose4([180 - a, a, 360 - a, Math.abs(90 - a)]),
    "De hoek ernaast ligt samen met " + a + "° op een rechte lijn: 180 " + MIN + " " + a + " = " + (180 - a) + ".", { figuur: { soort: "kruis", gegeven: { a: a }, gevraagd: "nevenhoek" } });
};
GEN.mk04 = function(sub) {
  var a = rnd(25, 155);
  if (a === 90) return null;
  var basis = "Twee evenwijdige lijnen worden gesneden door een derde lijn. Een hoek is " + a + "°. ";
  if (sub === 0) return Q(basis + "De F-hoek ervan = ? (graden)", choose4([a, 180 - a, 360 - a, Math.abs(90 - a)]),
    "Omdat de lijnen evenwijdig zijn, maakt de snijlijn met beide dezelfde hoek: de F-hoek is ook " + a + "°.", { figuur: { soort: "evenwijdig", gegeven: { a: a }, gevraagd: "F" } });
  if (sub === 1) return Q(basis + "De Z-hoek ervan = ? (graden)", choose4([a, 180 - a, 360 - a, Math.abs(90 - a)]),
    "Omdat de lijnen evenwijdig zijn, zijn Z-hoeken gelijk (binnen de lijnen, aan weerszijden van de snijlijn): " + a + "°.", { figuur: { soort: "evenwijdig", gegeven: { a: a }, gevraagd: "Z" } });
  return Q(basis + "De nevenhoek van de Z-hoek = ? (graden)", choose4([180 - a, a, 360 - a, Math.abs(90 - a)]),
    "De Z-hoek is " + a + "° (evenwijdige lijnen). Zijn nevenhoek is 180 " + MIN + " " + a + " = " + (180 - a) + ".", { figuur: { soort: "evenwijdig", gegeven: { a: a }, gevraagd: "nevenZ" } });
};
GEN.mk05 = function(sub) {
  if (sub === 0) {
    var a = rnd(20, 120), b = rnd(20, 120);
    if (a + b > 160) return null;
    var c = 180 - a - b;
    return Q("Driehoek met hoeken " + a + "° en " + b + "°. Derde hoek = ? (graden)", choose4([c, a + b, 360 - a - b, 180 - a, 90 - a - b]),
      "De hoeken van een driehoek zijn samen 180°: 180 " + MIN + " " + a + " " + MIN + " " + b + " = " + c + ".", { figuur: { soort: "driehoekhoeken", gegeven: { a: a, b: b }, gevraagd: "derde" } });
  }
  var s = rnd(15, 75);
  if (s === 45) return null;
  return Q("Rechthoekige driehoek, één scherpe hoek is " + s + "°. De andere scherpe hoek = ? (graden)", choose4([90 - s, 180 - s, s, 270 - s]),
    "Samen 180°, en de rechte hoek is al 90°. De twee scherpe hoeken zijn samen 90°: 90 " + MIN + " " + s + " = " + (90 - s) + ".", { figuur: { soort: "driehoekhoeken", gegeven: { s: s }, gevraagd: "andere" } });
};
var VEELHOEK = { 4: "vierhoek", 5: "vijfhoek", 6: "zeshoek", 7: "zevenhoek", 8: "achthoek", 9: "negenhoek", 10: "tienhoek", 12: "twaalfhoek" };
GEN.mk06 = function() {
  var n = pickOne([4, 5, 6, 7, 8, 9, 10, 12]), ans = (n - 2) * 180;
  return Q("Hoekensom van een " + VEELHOEK[n] + " = ? (graden)", choose4([ans, n * 180, (n - 1) * 180, 360, (n - 3) * 180]),
    "Een " + VEELHOEK[n] + " is vanuit één hoekpunt te verdelen in " + n + " " + MIN + " 2 = " + (n - 2) + " driehoeken: " + (n - 2) + " " + DOT + " 180 = " + ans + ".");
};

// ── Blok 2: Driehoeken en vierhoeken ──────────────────────────────

GEN.mk07 = function(sub) {
  if (sub === 0) {
    var t = 2 * rnd(10, 80), b = (180 - t) / 2;
    if (t === 60) return null;
    return Q("Gelijkbenige driehoek, tophoek " + t + "°. Elke basishoek = ? (graden)", choose4([b, 180 - t, t, Math.abs(90 - t), 2 * b + 10]),
      "Basishoeken zijn gelijk. Samen zijn ze 180 " + MIN + " " + t + " = " + (180 - t) + ", dus elk " + (180 - t) + " : 2 = " + b + ".", { figuur: { soort: "gelijkbenig", gegeven: { top: t }, gevraagd: "basis" } });
  }
  var bh = rnd(20, 85);
  if (bh === 60) return null;
  var top = 180 - 2 * bh;
  return Q("Gelijkbenige driehoek, basishoek " + bh + "°. Tophoek = ? (graden)", choose4([top, 180 - bh, bh, 90 - bh, 2 * bh]),
    "Beide basishoeken zijn " + bh + "°: samen " + (2 * bh) + "°. Tophoek: 180 " + MIN + " " + (2 * bh) + " = " + top + ".", { figuur: { soort: "gelijkbenig", gegeven: { basis: bh }, gevraagd: "top" } });
};
var REGELMATIG = { 3: "driehoek", 4: "vierhoek (vierkant)", 5: "vijfhoek", 6: "zeshoek", 8: "achthoek", 9: "negenhoek", 10: "tienhoek", 12: "twaalfhoek" };
GEN.mk08 = function() {
  var n = pickOne([3, 4, 5, 6, 8, 9, 10, 12]), som = (n - 2) * 180, ans = som / n;
  return Q("Eén hoek van een regelmatige " + REGELMATIG[n] + " = ? (graden)", choose4([ans, 360 / n, som, 180, 60, 120, 135]),
    "Hoekensom: (" + n + " " + MIN + " 2) " + DOT + " 180 = " + som + ". Alle " + n + " hoeken zijn gelijk: " + som + " : " + n + " = " + ans + ".");
};
var VIERHOEK_VRAGEN = [
  ["Vierhoek met 4 gelijke zijden en 4 rechte hoeken", "vierkant", ["ruit", "rechthoek", "vlieger"]],
  ["Vierhoek: alle zijden even lang, alle hoeken 90°", "vierkant", ["ruit", "rechthoek", "parallellogram"]],
  ["Vierhoek met 4 gelijke zijden, geen rechte hoeken", "ruit", ["vierkant", "rechthoek", "vlieger"]],
  ["Vierhoek: alle zijden even lang, hoeken 70° en 110°", "ruit", ["vierkant", "rechthoek", "trapezium"]],
  ["Vierhoek met 4 rechte hoeken, niet alle zijden gelijk", "rechthoek", ["vierkant", "ruit", "parallellogram"]],
  ["Vierhoek: alle hoeken 90°, zijden 8 en 5 cm", "rechthoek", ["vierkant", "ruit", "vlieger"]],
  ["Vierhoek met 2 paar evenwijdige zijden, geen rechte hoeken, niet alle zijden gelijk", "parallellogram", ["ruit", "rechthoek", "vlieger"]],
  ["Vierhoek: overstaande zijden evenwijdig en even lang, hoeken 60° en 120°, zijden 7 en 4 cm", "parallellogram", ["ruit", "rechthoek", "vierkant"]],
  ["Vierhoek met precies 1 paar evenwijdige zijden", "trapezium", ["parallellogram", "vlieger", "ruit"]],
  ["Vierhoek: alleen boven- en onderkant evenwijdig, die zijn 6 en 10 cm", "trapezium", ["parallellogram", "rechthoek", "vlieger"]],
  ["Vierhoek met 2 paar gelijke zijden die naast elkaar liggen, geen evenwijdige zijden", "vlieger", ["ruit", "trapezium", "parallellogram"]],
  ["Vierhoek: zijden 5, 5, 9, 9 cm (gelijke zijden naast elkaar), één symmetrieas", "vlieger", ["ruit", "parallellogram", "rechthoek"]],
];
GEN.mk09 = function() {
  var v = pickOne(VIERHOEK_VRAGEN);
  return Q(v[0] + ". Meest precieze naam?", choose4([v[1]].concat(v[2])),
    "Kijk naar de zijden (even lang, evenwijdig) en de hoeken (recht of niet). " + v[0] + ": dat is een " + v[1] + ".");
};
var DIAG_VRAGEN = [
  ["Diagonalen even lang, delen elkaar middendoor, niet loodrecht", "rechthoek", ["ruit", "vlieger", "parallellogram"]],
  ["Diagonalen even lang en delen elkaar middendoor, maar staan niet loodrecht op elkaar", "rechthoek", ["ruit", "vlieger", "trapezium"]],
  ["Diagonalen loodrecht, delen elkaar middendoor, niet even lang", "ruit", ["rechthoek", "vlieger", "parallellogram"]],
  ["Diagonalen staan loodrecht en delen elkaar middendoor, maar zijn niet even lang", "ruit", ["rechthoek", "vlieger", "trapezium"]],
  ["Diagonalen delen elkaar middendoor, niet even lang, niet loodrecht", "parallellogram", ["ruit", "rechthoek", "vlieger"]],
  ["Diagonalen delen elkaar alleen middendoor (niet even lang, niet loodrecht)", "parallellogram", ["rechthoek", "vlieger", "trapezium"]],
  ["Diagonalen loodrecht, maar maar één diagonaal wordt middendoor gedeeld", "vlieger", ["ruit", "rechthoek", "parallellogram"]],
  ["Diagonalen loodrecht; de ene deelt de andere middendoor, niet andersom", "vlieger", ["ruit", "parallellogram", "trapezium"]],
];
GEN.mk10 = function() {
  var v = pickOne(DIAG_VRAGEN);
  return Q(v[0] + ". Welke vierhoek?", choose4([v[1]].concat(v[2])),
    "Delen de diagonalen elkaar middendoor: parallellogram. Daarbij even lang: rechthoek. Daarbij loodrecht: ruit. Loodrecht, maar maar één diagonaal deelt de andere middendoor: vlieger. Dus " + v[1] + ".");
};

// ── Blok 3: Oppervlakte (en omtrek) ───────────────────────────────

GEN.mk11 = function() {
  var b = rnd(5, 15), h = rnd(3, 12), s = h + rnd(1, 4), ans = b * h;
  return Q("Parallellogram: basis " + b + " cm, hoogte " + h + " cm, schuine zijde " + s + " cm. Oppervlakte?",
    choose4([maatH(ans, "cm²"), maatH(b * s, "cm²"), (ans % 2 === 0 ? maatH(ans / 2, "cm²") : null), maatH(2 * (b + s), "cm²"), maatH(b + h, "cm²")]),
    "Basis keer hoogte (loodrecht), niet de schuine zijde: " + b + " " + DOT + " " + h + " = " + ans + " cm².", { figuur: { soort: "parallellogram", gegeven: { b: b, h: h, s: s }, gevraagd: "opp" } });
};
GEN.mk12 = function(sub) {
  var b = rnd(4, 16), h = rnd(3, 14), t = b * h * 5;
  if (sub === 0) {
    return Q("Driehoek: basis " + b + " cm, hoogte " + h + " cm. Oppervlakte?",
      choose4([maat(t, "cm²"), maatH(b * h, "cm²"), maatH(b + h, "cm²"), maatH(2 * b * h, "cm²"), maat(tiendenVan(b * h, 4), "cm²")]),
      "½ " + DOT + " basis " + DOT + " hoogte = ½ " + DOT + " " + b + " " + DOT + " " + h + " = " + schrijfT(t) + " cm².", { figuur: { soort: "driehoekopp", gegeven: { b: b, h: h }, gevraagd: "opp" } });
  }
  var s = h + rnd(1, 5);
  return Q("Driehoek: basis " + b + " cm, schuine zijde " + s + " cm, hoogte " + h + " cm. Oppervlakte?",
    choose4([maat(t, "cm²"), maat(b * s * 5, "cm²"), maatH(b * h, "cm²"), maatH(b * s, "cm²")]),
    "Gebruik de hoogte (loodrecht op de basis), niet de schuine zijde: ½ " + DOT + " " + b + " " + DOT + " " + h + " = " + schrijfT(t) + " cm².", { figuur: { soort: "driehoekopp", gegeven: { b: b, h: h, s: s }, gevraagd: "opp" } });
};
GEN.mk13 = function() {
  var a = rnd(3, 12), c = a + rnd(2, 8), h = rnd(2, 10), t = (a + c) * h * 5;
  return Q("Trapezium: evenwijdige zijden " + a + " en " + c + " cm, hoogte " + h + " cm. Oppervlakte?",
    choose4([maat(t, "cm²"), maatH((a + c) * h, "cm²"), maatH(a * c * h, "cm²"), maat((c - a) * h * 5, "cm²"), maatH(a * h, "cm²")]),
    "½ " + DOT + " (a + b) " + DOT + " hoogte = ½ " + DOT + " (" + a + " + " + c + ") " + DOT + " " + h + " = ½ " + DOT + " " + (a + c) + " " + DOT + " " + h + " = " + schrijfT(t) + " cm².", { figuur: { soort: "trapezium", gegeven: { a: a, c: c, h: h }, gevraagd: "opp" } });
};
// L-vormen: nooit dezelfde vorm als in de laatste 2 gemaakte vragen (ook niet met de andere vraag erbij)
var L_LAATST = [];
GEN.mk14 = function(sub) {
  var W = rnd(6, 14), H = rnd(5, 12), cw = rnd(1, W - 3), ch = rnd(1, H - 3);
  var key = W + "x" + H + "-" + cw + "x" + ch;
  if (L_LAATST.indexOf(key) !== -1) return null;
  var vorm = "Rechthoek " + W + " × " + H + " cm; uit één hoek is een rechthoek van " + cw + " × " + ch + " cm geknipt (L-vorm). ";
  var opp = W * H - cw * ch, omtrek = 2 * (W + H);
  var q;
  if (sub === 0) {
    q = Q(vorm + "Oppervlakte?", choose4([maatH(opp, "cm²"), maatH(W * H, "cm²"), maatH(W * H - 2 * cw * ch, "cm²"), maatH(cw * ch, "cm²"), maatH(omtrek, "cm²")]),
      "Hele rechthoek min het stuk eruit: " + W + " " + DOT + " " + H + " " + MIN + " " + cw + " " + DOT + " " + ch + " = " + (W * H) + " " + MIN + " " + (cw * ch) + " = " + opp + " cm².", { lvorm: key, figuur: { soort: "lvorm", gegeven: { W: W, H: H, cw: cw, ch: ch }, gevraagd: "opp" } });
  } else {
    q = Q(vorm + "Omtrek?", choose4([maatH(omtrek, "cm"), maatH(omtrek - cw - ch, "cm"), maatH(opp, "cm"), maatH(omtrek + 2 * (cw + ch), "cm")]),
      "De inham schuift twee randen naar binnen; samen blijven ze even lang. De omtrek is die van de hele rechthoek: 2 " + DOT + " (" + W + " + " + H + ") = " + omtrek + " cm.", { lvorm: key, figuur: { soort: "lvorm", gegeven: { W: W, H: H, cw: cw, ch: ch }, gevraagd: "omtrek" } });
  }
  if (q) { L_LAATST.push(key); if (L_LAATST.length > 2) L_LAATST.shift(); }
  return q;
};
GEN.mk15 = function(sub) {
  var n = rnd(2, 9);
  if (sub === 0) return Q(n + " m² = ? cm²", choose4([maatH(n * 10000, "cm²"), maatH(n * 100, "cm²"), maatH(n * 1000, "cm²"), maatH(n * 100000, "cm²")]),
    "1 m² is 100 cm bij 100 cm = 10000 cm². Dus " + n + " m² = " + (n * 10000) + " cm².");
  if (sub === 1) return Q((n * 10000) + " cm² = ? m²", choose4([maatH(n, "m²"), maatH(n * 100, "m²"), maatH(n * 10, "m²"), maatH(n * 1000, "m²")]),
    "1 m² = 10000 cm² (100 " + DOT + " 100). " + (n * 10000) + " : 10000 = " + n + " m².");
  return Q(n + " m² = ? dm²", choose4([maatH(n * 100, "dm²"), maatH(n * 10, "dm²"), maatH(n * 1000, "dm²"), maatH(n * 10000, "dm²")]),
    "1 m = 10 dm, dus 1 m² = 10 " + DOT + " 10 = 100 dm². " + n + " m² = " + (n * 100) + " dm².");
};

// ── Blok 4: De cirkel (pi = 3,14) ─────────────────────────────────

var PI_TXT = " (π ≈ 3,14; 1 decimaal)";
function piT(factor) { return tiendenVan(PI_H * factor, 100); }  // pi · factor, in tienden
GEN.mk16 = function(sub) {
  if (sub === 0) {
    var r = rnd(2, 20);
    return Q("Cirkel met straal " + r + " cm. Omtrek?" + PI_TXT, choose4([maat(piT(2 * r), "cm"), maat(piT(r), "cm"), maat(piT(r * r), "cm"), maat(piT(4 * r), "cm")]),
      "Omtrek = 2 " + DOT + " π " + DOT + " r = 2 " + DOT + " 3,14 " + DOT + " " + r + " = " + schrijfT(piT(2 * r)) + " cm.", { figuur: { soort: "cirkel", gegeven: { r: r }, gevraagd: "omtrek" } });
  }
  var d = rnd(3, 30);
  return Q("Cirkel met middellijn " + d + " cm. Omtrek?" + PI_TXT, choose4([maat(piT(d), "cm"), maat(piT(2 * d), "cm"), maat(tiendenVan(PI_H * d, 200), "cm"), maat(tiendenVan(PI_H * d * d, 400), "cm")]),
    "Omtrek = π " + DOT + " d = 3,14 " + DOT + " " + d + " = " + schrijfT(piT(d)) + " cm.", { figuur: { soort: "cirkel", gegeven: { d: d }, gevraagd: "omtrek" } });
};
GEN.mk17 = function(sub) {
  var r = rnd(2, 15);
  if (sub === 0) {
    return Q("Cirkel met straal " + r + " cm. Oppervlakte?" + PI_TXT, choose4([maat(piT(r * r), "cm²"), maat(piT(2 * r), "cm²"), maat(piT(4 * r * r), "cm²"), maat(piT(r), "cm²")]),
      "Oppervlakte = π " + DOT + " r² = 3,14 " + DOT + " " + r + " " + DOT + " " + r + " = 3,14 " + DOT + " " + (r * r) + " = " + schrijfT(piT(r * r)) + " cm².", { figuur: { soort: "cirkel", gegeven: { r: r }, gevraagd: "opp" } });
  }
  var d = 2 * r;
  return Q("Cirkel met middellijn " + d + " cm. Oppervlakte?" + PI_TXT, choose4([maat(piT(r * r), "cm²"), maat(piT(d * d), "cm²"), maat(piT(d), "cm²"), maat(piT(r), "cm²")]),
    "Eerst de straal: " + d + " : 2 = " + r + " cm. Oppervlakte = π " + DOT + " r² = 3,14 " + DOT + " " + (r * r) + " = " + schrijfT(piT(r * r)) + " cm².", { figuur: { soort: "cirkel", gegeven: { d: d }, gevraagd: "opp" } });
};
GEN.mk18 = function(sub) {
  var r = rnd(2, 20), omtrekH = 2 * PI_H * r;   // honderdsten, exact
  if (sub === 0) return Q("Cirkel met omtrek " + schrijfH(omtrekH) + " cm. Straal? (π ≈ 3,14)", choose4([maatH(r, "cm"), maatH(2 * r, "cm"), maatH(4 * r, "cm"), maatH(r + 1, "cm")]),
    "Omtrek = π " + DOT + " d, dus d = " + schrijfH(omtrekH) + " : 3,14 = " + (2 * r) + " cm. De straal is de helft: " + r + " cm.", { figuur: { soort: "cirkel", gegeven: { omtrek: omtrekH / 100 }, gevraagd: "straal" } });
  return Q("Cirkel met omtrek " + schrijfH(omtrekH) + " cm. Middellijn? (π ≈ 3,14)", choose4([maatH(2 * r, "cm"), maatH(r, "cm"), maatH(4 * r, "cm"), maatH(2 * r + 2, "cm")]),
    "Omtrek = π " + DOT + " d, dus d = " + schrijfH(omtrekH) + " : 3,14 = " + (2 * r) + " cm.", { figuur: { soort: "cirkel", gegeven: { omtrek: omtrekH / 100 }, gevraagd: "middellijn" } });
};
GEN.mk19 = function(sub) {
  var r = rnd(2, 14);
  if (sub === 0) return Q("Halve cirkel met straal " + r + " cm. Oppervlakte?" + PI_TXT,
    choose4([maat(tiendenVan(PI_H * r * r, 200), "cm²"), maat(piT(r * r), "cm²"), maat(tiendenVan(PI_H * r * r, 400), "cm²"), maat(piT(r), "cm²")]),
    "Hele cirkel: 3,14 " + DOT + " " + (r * r) + " = " + schrijfH(PI_H * r * r) + " cm². De helft: " + schrijfT(tiendenVan(PI_H * r * r, 200)) + " cm².", { figuur: { soort: "cirkeldeel", gegeven: { r: r }, gevraagd: "halfopp" } });
  if (sub === 1) return Q("Kwart cirkel met straal " + r + " cm. Oppervlakte?" + PI_TXT,
    choose4([maat(tiendenVan(PI_H * r * r, 400), "cm²"), maat(piT(r * r), "cm²"), maat(tiendenVan(PI_H * r * r, 200), "cm²"), maat(tiendenVan(PI_H * r, 200), "cm²")]),
    "Hele cirkel: 3,14 " + DOT + " " + (r * r) + " = " + schrijfH(PI_H * r * r) + " cm². Een kwart: " + schrijfT(tiendenVan(PI_H * r * r, 400)) + " cm².", { figuur: { soort: "cirkeldeel", gegeven: { r: r }, gevraagd: "kwartopp" } });
  // omtrek halve cirkel: boog (pi·r) + middellijn (2r); in honderdsten: 314·r + 200·r
  return Q("Halve cirkel met straal " + r + " cm. Omtrek (boog + middellijn)?" + PI_TXT,
    choose4([maat(tiendenVan(PI_H * r + 200 * r, 100), "cm"), maat(piT(r), "cm"), maat(tiendenVan(2 * PI_H * r + 200 * r, 100), "cm"), maat(tiendenVan(PI_H * r + 100 * r, 100), "cm")]),
    "Boog = halve omtrek = 3,14 " + DOT + " " + r + " = " + schrijfH(PI_H * r) + " cm. Plus de middellijn " + (2 * r) + " cm: " + schrijfT(tiendenVan(PI_H * r + 200 * r, 100)) + " cm.", { figuur: { soort: "cirkeldeel", gegeven: { r: r }, gevraagd: "halfomtrek" } });
};

// ── Blok 5: Pythagoras ────────────────────────────────────────────

GEN.mk20 = function() {
  var t = drietal(60), a = t[0], b = t[1], c = t[2];
  if (rnd(0, 1) === 1) { var w = a; a = b; b = w; }
  return Q("Rechthoekige driehoek, rechthoekszijden " + a + " en " + b + " cm. Schuine zijde?",
    choose4([maatH(c, "cm"), maatH(a + b, "cm"), maatH(a * a + b * b, "cm"), maatH(Math.abs(b - a), "cm"), maatH(c + 1, "cm")]),
    a + "² + " + b + "² = " + (a * a) + " + " + (b * b) + " = " + (c * c) + ". √" + (c * c) + " = " + c + " cm.", { figuur: { soort: "rechthoekig", gegeven: { a: a, b: b }, gevraagd: "schuin" } });
};
GEN.mk21 = function() {
  var t = drietal(60), a = t[0], b = t[1], c = t[2];
  if (rnd(0, 1) === 1) { var w = a; a = b; b = w; }
  return Q("Rechthoekige driehoek, schuine zijde " + c + " cm, rechthoekszijde " + a + " cm. Andere rechthoekszijde?",
    choose4([maatH(b, "cm"), maat(wortelTienden(c * c + a * a), "cm"), maatH(c - a, "cm"), maatH(c * c - a * a, "cm")]),
    "Bij een rechthoekszijde trek je af: " + c + "² " + MIN + " " + a + "² = " + (c * c) + " " + MIN + " " + (a * a) + " = " + (b * b) + ". √" + (b * b) + " = " + b + " cm.", { figuur: { soort: "rechthoekig", gegeven: { c: c, a: a }, gevraagd: "zijde" } });
};
function zijdenTekst(z) { return "zijden " + z[0] + ", " + z[1] + " en " + z[2] + " cm"; }
function geenRecht() {
  // echte driehoek (langste < som andere twee), niet rechthoekig, dicht bij een drietal
  var t = drietal(40), z = [t[0], t[1], t[2] + pickOne([-1, 1, 2])];
  if (rnd(0, 2) === 0) z = [t[0] + pickOne([-1, 1]), t[1], t[2]];
  z.sort(function(p, q) { return p - q; });
  if (z[0] < 1 || z[2] >= z[0] + z[1]) return null;
  if (z[0] * z[0] + z[1] * z[1] === z[2] * z[2]) return null;
  return z;
}
GEN.mk22 = function() {
  var t = drietal(50), goed = [t[0], t[1], t[2]];
  var fout = [geenRecht(), geenRecht(), geenRecht()];
  if (fout.some(function(z) { return !z; })) return null;
  return Q("Een driehoek heeft drie zijden. Welke driehoek is rechthoekig?", choose4([zijdenTekst(goed)].concat(fout.map(zijdenTekst))),
    "Controleer a² + b² = c² met c de langste zijde: " + goed[0] + "² + " + goed[1] + "² = " + (goed[0] * goed[0] + goed[1] * goed[1]) + " = " + goed[2] + "². Dus rechthoekig.",
    { zijden: [goed].concat(fout) });
};
GEN.mk23 = function(sub) {
  if (sub === 0) {
    var a = rnd(2, 12), b = rnd(2, 12), s = a * a + b * b;
    if (isKwadraat(s)) return null;
    return Q("Rechthoekige driehoek, rechthoekszijden " + a + " en " + b + " cm. Schuine zijde? (1 decimaal)",
      choose4([maat(wortelTienden(s), "cm"), maatH(a + b, "cm"), maatH(s, "cm"), (a !== b ? maat(wortelTienden(Math.abs(a * a - b * b)), "cm") : null), maat(wortelTienden(s) + 10, "cm")]),
      a + "² + " + b + "² = " + (a * a) + " + " + (b * b) + " = " + s + ". √" + s + " ≈ " + schrijfT(wortelTienden(s)) + " cm.", { figuur: { soort: "rechthoekig", gegeven: { a: a, b: b }, gevraagd: "schuin" } });
  }
  var c = rnd(6, 20), x = rnd(2, c - 1), r = c * c - x * x;
  if (isKwadraat(r)) return null;
  return Q("Rechthoekige driehoek, schuine zijde " + c + " cm, rechthoekszijde " + x + " cm. Andere zijde? (1 decimaal)",
    choose4([maat(wortelTienden(r), "cm"), maat(wortelTienden(c * c + x * x), "cm"), maatH(c - x, "cm"), maatH(r, "cm")]),
    c + "² " + MIN + " " + x + "² = " + (c * c) + " " + MIN + " " + (x * x) + " = " + r + ". √" + r + " ≈ " + schrijfT(wortelTienden(r)) + " cm.", { figuur: { soort: "rechthoekig", gegeven: { c: c, a: x }, gevraagd: "zijde" } });
};
GEN.mk24 = function(sub) {
  if (sub === 0) {
    // lengtes in dm: antwoord in hele dm = 1 decimaal in m
    var L = rnd(30, 70), v = rnd(5, 20), n = L * L - v * v;
    var hDm = Math.floor((isqrt(4 * n) + 1) / 2);
    return Q("Ladder van " + schrijfT(L) + " m tegen een muur; de voet staat " + schrijfT(v) + " m van de muur. Hoe hoog komt de ladder? (1 decimaal)",
      choose4([maat(hDm, "m"), maat(Math.floor((isqrt(4 * (L * L + v * v)) + 1) / 2), "m"), maat(L - v, "m"), maat(L + v, "m")]),
      "De ladder is de schuine zijde. " + schrijfT(L) + "² " + MIN + " " + schrijfT(v) + "² = " + schrijfH(n) + ". √" + schrijfH(n) + " ≈ " + schrijfT(hDm) + " m.", { figuur: { soort: "ladder", gegeven: { L: L / 10, v: v / 10 }, gevraagd: "hoogte" } });
  }
  if (sub === 1) {
    var b = rnd(40, 120), hh = rnd(25, 80), s = b * b + hh * hh;
    if (isKwadraat(s)) return null;
    return Q("Beeldscherm " + b + " cm breed en " + hh + " cm hoog. Diagonaal? (1 decimaal)",
      choose4([maat(wortelTienden(s), "cm"), maatH(b + hh, "cm"), maat(wortelTienden(Math.abs(b * b - hh * hh)), "cm"), maatH(s, "cm")]),
      b + "² + " + hh + "² = " + (b * b) + " + " + (hh * hh) + " = " + s + ". √" + s + " ≈ " + schrijfT(wortelTienden(s)) + " cm.", { figuur: { soort: "diagonaal", gegeven: { b: b, h: hh }, eenheid: "cm", gevraagd: "diagonaal" } });
  }
  var l = rnd(20, 90), w = rnd(10, 60), q2 = l * l + w * w;
  if (isKwadraat(q2)) return null;
  return Q("Rechthoekig veld van " + l + " bij " + w + " m. Hoe lang is het pad schuin van hoek tot hoek? (1 decimaal)",
    choose4([maat(wortelTienden(q2), "m"), maatH(l + w, "m"), maatH(2 * (l + w), "m"), maat(wortelTienden(Math.abs(l * l - w * w)), "m")]),
    l + "² + " + w + "² = " + (l * l) + " + " + (w * w) + " = " + q2 + ". √" + q2 + " ≈ " + schrijfT(wortelTienden(q2)) + " m.", { figuur: { soort: "diagonaal", gegeven: { b: l, h: w }, eenheid: "m", gevraagd: "diagonaal" } });
};

// ── Blok 6: Ruimtefiguren ─────────────────────────────────────────

GEN.mk25 = function(sub) {
  if (sub === 0) {
    var b = rnd(3, 12), h = rnd(2, 10), l = rnd(4, 20);
    if ((b * h) % 2 !== 0) return null;
    var G = b * h / 2, V = G * l;
    return Q("Driehoekig prisma: het grondvlak is een driehoek met basis " + b + " cm en hoogte " + h + " cm; de lengte is " + l + " cm. Inhoud?",
      choose4([maatH(V, "cm³"), maatH(b * h * l, "cm³"), maatH(G, "cm³"), maatH(b + h + l, "cm³"), maatH(G * l * 2 + 2, "cm³")]),
      "Grondvlak: ½ " + DOT + " " + b + " " + DOT + " " + h + " = " + G + " cm². Inhoud = grondvlak " + DOT + " lengte = " + G + " " + DOT + " " + l + " = " + V + " cm³.", { figuur: { soort: "prisma", gegeven: { b: b, h: h, l: l }, gevraagd: "inhoud" } });
  }
  var G2 = rnd(4, 60), h2 = rnd(3, 20);
  return Q("Prisma met een grondvlak van " + G2 + " cm² en een hoogte van " + h2 + " cm. Inhoud?",
    choose4([maatH(G2 * h2, "cm³"), maatH(G2 + h2, "cm³"), (G2 * h2) % 3 === 0 ? maatH(G2 * h2 / 3, "cm³") : null, maatH(G2 * h2 * 2, "cm³"), maatH(G2 * h2 + h2, "cm³")]),
    "Inhoud = grondvlak " + DOT + " hoogte = " + G2 + " " + DOT + " " + h2 + " = " + (G2 * h2) + " cm³.", { figuur: { soort: "prismaG", gegeven: { G: G2, h: h2 }, gevraagd: "inhoud" } });
};
GEN.mk26 = function() {
  var r = rnd(1, 10), h = rnd(2, 20);
  return Q("Cilinder met straal " + r + " cm en hoogte " + h + " cm. Inhoud?" + PI_TXT,
    choose4([maat(piT(r * r * h), "cm³"), maat(piT(r * h), "cm³"), maat(piT(4 * r * r * h), "cm³"), maat(piT(2 * r * h), "cm³")]),
    "Grondvlak: 3,14 " + DOT + " " + r + "² = " + schrijfH(PI_H * r * r) + " cm². Inhoud = grondvlak " + DOT + " hoogte = " + schrijfH(PI_H * r * r) + " " + DOT + " " + h + " = " + schrijfT(piT(r * r * h)) + " cm³.", { figuur: { soort: "cilinder", gegeven: { r: r, h: h }, gevraagd: "inhoud" } });
};
GEN.mk27 = function(sub) {
  if (sub === 0) {
    var z = rnd(3, 12), h = rnd(3, 15);
    if ((z * z * h) % 3 !== 0) return null;
    var V = z * z * h / 3;
    return Q("Piramide met een vierkant grondvlak van " + z + " × " + z + " cm en een hoogte van " + h + " cm. Inhoud?",
      choose4([maatH(V, "cm³"), maatH(z * z * h, "cm³"), ((z * z * h) % 2 === 0 ? maatH(z * z * h / 2, "cm³") : null), maatH(z * z + h, "cm³"), maatH(V * 2, "cm³")]),
      "Grondvlak: " + z + " " + DOT + " " + z + " = " + (z * z) + " cm². Inhoud = ⅓ " + DOT + " " + (z * z) + " " + DOT + " " + h + " = " + V + " cm³.", { figuur: { soort: "piramide", gegeven: { z: z, h: h }, gevraagd: "inhoud" } });
  }
  var r = rnd(2, 10), hk = 3 * rnd(1, 6);
  return Q("Kegel met straal " + r + " cm en hoogte " + hk + " cm. Inhoud?" + PI_TXT,
    choose4([maat(tiendenVan(PI_H * r * r * hk, 300), "cm³"), maat(piT(r * r * hk), "cm³"), maat(tiendenVan(PI_H * r * hk, 300), "cm³"), maat(tiendenVan(PI_H * 4 * r * r * hk, 300), "cm³")]),
    "Grondvlak: 3,14 " + DOT + " " + (r * r) + " = " + schrijfH(PI_H * r * r) + " cm². Inhoud = ⅓ " + DOT + " grondvlak " + DOT + " hoogte = ⅓ " + DOT + " " + schrijfH(PI_H * r * r) + " " + DOT + " " + hk + " = " + schrijfT(tiendenVan(PI_H * r * r * hk, 300)) + " cm³.", { figuur: { soort: "kegel", gegeven: { r: r, h: hk }, gevraagd: "inhoud" } });
};
GEN.mk28 = function() {
  var l = rnd(2, 12), b = rnd(2, 12), h = rnd(2, 12);
  var A = 2 * (l * b + l * h + b * h);
  return Q("Balk van " + l + " × " + b + " × " + h + " cm. Totale oppervlakte (alle zes vlakken)?",
    choose4([maatH(A, "cm²"), maatH(l * b * h, "cm²"), maatH(A / 2, "cm²"), maatH(6 * l * b, "cm²"), maatH(A + 2 * l * b, "cm²")]),
    "Drie paar gelijke vlakken: 2 " + DOT + " (" + l + DOT + b + " + " + l + DOT + h + " + " + b + DOT + h + ") = 2 " + DOT + " (" + (l * b) + " + " + (l * h) + " + " + (b * h) + ") = " + A + " cm².", { figuur: { soort: "balk", gegeven: { l: l, b: b, h: h }, gevraagd: "opp" } });
};
GEN.mk29 = function(sub) {
  if (sub === 0) {
    var l = 5 * rnd(4, 16), b = 5 * rnd(3, 10), h = 5 * rnd(3, 10), V = l * b * h;
    if (V % 100 !== 0) return null;
    var t = V / 100;   // tienden liter
    return Q("Bak van " + l + " × " + b + " × " + h + " cm. Hoeveel liter past erin?",
      choose4([maat(t, "l"), maat(t * 10, "l"), maat(t * 100, "l"), maatH(V, "l")]),
      "Inhoud: " + l + " " + DOT + " " + b + " " + DOT + " " + h + " = " + V + " cm³. 1 l = 1000 cm³, dus " + V + " : 1000 = " + schrijfT(t) + " l.");
  }
  if (sub === 1) {
    var x = rnd(2, 9);
    return Q(x + " liter = ? cm³", choose4([maatH(x * 1000, "cm³"), maatH(x * 100, "cm³"), maatH(x * 10, "cm³"), maatH(x * 1000000, "cm³")]),
      "1 l = 1 dm³ = 10 " + DOT + " 10 " + DOT + " 10 cm³ = 1000 cm³. Dus " + x + " l = " + (x * 1000) + " cm³.");
  }
  var y = 50 * rnd(1, 19);
  return Q(y + " cm³ = ? ml", choose4([maatH(y, "ml"), maatH(y * 10, "ml"), maatH(y * 1000, "ml"), maatH(y * 100, "ml")]),
    "1 cm³ = 1 ml (1 l = 1000 cm³ = 1000 ml). Dus " + y + " cm³ = " + y + " ml.");
};

// ── Blok 7: Gelijkvormigheid ──────────────────────────────────────

// factor k in tienden
var FACTOREN = [15, 20, 25, 30, 40, 5];
GEN.mk30 = function() {
  var k = pickOne(FACTOREN), a = rnd(2, 12);
  if ((a * k) % 10 !== 0) return null;
  var b = a * k / 10;
  if (b === a) return null;
  var omgekeerd = tiendenVan(a * 10, b);     // a : b in tienden
  return Q("Bij een vergroting wordt een zijde van " + a + " cm nu " + b + " cm. Vergrotingsfactor?",
    choose4([schrijfT(k), String(Math.abs(b - a)), schrijfT(omgekeerd), String(a * b), String(a + b)]),
    "Factor = nieuw : oud = " + b + " : " + a + " = " + schrijfT(k) + ".");
};
GEN.mk31 = function() {
  var k = pickOne([15, 20, 25, 30, 5]), a1 = 2 * rnd(1, 6);
  if ((a1 * k) % 10 !== 0) return null;
  var b1 = a1 * k / 10, a2 = rnd(2, 15);
  if (a2 === a1 || b1 === a1) return null;
  var t = a2 * k;    // b2 in tienden
  return Q("Twee gelijkvormige figuren. Een zijde van " + a1 + " cm hoort bij " + b1 + " cm. Hoe lang wordt een zijde van " + a2 + " cm? (1 decimaal)",
    choose4([maat(t, "cm"), (b1 - a1 > 0 ? maatH(a2 + (b1 - a1), "cm") : null), maat(tiendenVan(a2 * a1, b1), "cm"), maat(t * 2, "cm"), maatH(a2 * b1, "cm")]),
    "Factor = " + b1 + " : " + a1 + " = " + schrijfT(k) + ". Dus " + a2 + " " + DOT + " " + schrijfT(k) + " = " + schrijfT(t) + " cm. (Niet optellen: vergroten is vermenigvuldigen.)", { figuur: { soort: "gelijkvormig", gegeven: { a1: a1, b1: b1, a2: a2 }, gevraagd: "b2" } });
};
GEN.mk32 = function() {
  var A = rnd(4, 50), k = rnd(2, 5);
  return Q("Een figuur heeft een oppervlakte van " + A + " cm². Alle lengtes worden " + k + " keer zo groot. Nieuwe oppervlakte?",
    choose4([maatH(A * k * k, "cm²"), maatH(A * k, "cm²"), maatH(A * k * k * k, "cm²"), maatH(A + k, "cm²")]),
    "Lengte én breedte worden " + k + " keer zo groot: oppervlakte × " + k + "² = × " + (k * k) + ". " + A + " " + DOT + " " + (k * k) + " = " + (A * k * k) + " cm².");
};
GEN.mk33 = function() {
  var V = rnd(5, 60), k = rnd(2, 4);
  return Q("Een doos heeft een inhoud van " + V + " cm³. Alle ribben worden " + k + " keer zo lang. Nieuwe inhoud?",
    choose4([maatH(V * k * k * k, "cm³"), maatH(V * k, "cm³"), maatH(V * k * k, "cm³"), maatH(V + k, "cm³")]),
    "Lengte, breedte en hoogte worden " + k + " keer zo groot: inhoud × " + k + "³ = × " + (k * k * k) + ". " + V + " " + DOT + " " + (k * k * k) + " = " + (V * k * k * k) + " cm³.");
};

// ── Blok 8: Toepassen en controle ─────────────────────────────────

// Feiten voor fout spotten: elk met een ware en een foute bewering (typische fout). De vraag bevat
// vier verschillende soorten feiten; precies één is fout. feiten: voor de test (onafhankelijk narekenen).
var FEIT = {
  omtrek: function() { var r = rnd(2, 12); return { p: { r: r }, waar: "Cirkel r = " + r + " cm: omtrek " + schrijfT(piT(2 * r)) + " cm", fout: "Cirkel r = " + r + " cm: omtrek " + schrijfT(piT(r * r)) + " cm" }; },
  oppcirkel: function() { var r = rnd(2, 10); return { p: { r: r }, waar: "Cirkel r = " + r + " cm: oppervlakte " + schrijfT(piT(r * r)) + " cm²", fout: "Cirkel r = " + r + " cm: oppervlakte " + schrijfT(piT(4 * r * r)) + " cm²" }; },
  driehoek: function() { var b = rnd(4, 14), h = rnd(3, 12); return { p: { b: b, h: h }, waar: "Driehoek basis " + b + ", hoogte " + h + " cm: oppervlakte " + schrijfT(b * h * 5) + " cm²", fout: "Driehoek basis " + b + ", hoogte " + h + " cm: oppervlakte " + (b * h) + " cm²" }; },
  pyth: function() { var t = drietal(40); return { p: { a: t[0], b: t[1] }, waar: "Rechthoekszijden " + t[0] + " en " + t[1] + " cm: schuine zijde " + t[2] + " cm", fout: "Rechthoekszijden " + t[0] + " en " + t[1] + " cm: schuine zijde " + (t[0] + t[1]) + " cm" }; },
  vergroot: function() { var A = rnd(3, 20), k = rnd(2, 4); return { p: { A: A, k: k }, waar: "Oppervlakte " + A + " cm², lengtes × " + k + ": " + (A * k * k) + " cm²", fout: "Oppervlakte " + A + " cm², lengtes × " + k + ": " + (A * k) + " cm²" }; },
  hoek: function() { var a = rnd(30, 80), b = rnd(30, 80); return { p: { a: a, b: b }, waar: "Driehoek met hoeken " + a + "° en " + b + "°: derde hoek " + (180 - a - b) + "°", fout: "Driehoek met hoeken " + a + "° en " + b + "°: derde hoek " + (a + b) + "°" }; },
  eenheid: function() { var n = rnd(2, 9); return { p: { n: n }, waar: n + " m² = " + (n * 10000) + " cm²", fout: n + " m² = " + (n * 100) + " cm²" }; },
};
var FEIT_NAMEN = Object.keys(FEIT);
GEN.mk34 = function() {
  var namen = shuffle(FEIT_NAMEN.slice()).slice(0, 4), welk = rnd(0, 3), teksten = [], feiten = [];
  for (var i = 0; i < 4; i++) {
    var f = FEIT[namen[i]](), isFout = i === welk;
    if (f.waar === f.fout) return null;
    teksten.push(isFout ? f.fout : f.waar);
    feiten.push({ soort: namen[i], p: f.p, tekst: isFout ? f.fout : f.waar, waar: !isFout });
  }
  var c = choose4([teksten[welk]].concat(teksten.filter(function(t, j) { return j !== welk; })));
  return Q("Welke bewering is FOUT? (π ≈ 3,14)", c,
    "Reken elke bewering na. Fout: \"" + teksten[welk] + "\".", { isErrorSpotter: true, smallChoices: true, feiten: feiten });
};
GEN.mk35 = function(sub) {
  var R = rnd(2, 9) * (sub === 0 ? 10 : 1), echt = R * 10 + pickOne([-3, -2, 2, 3]);   // straal in tienden, niet rond
  if (sub === 0) {
    var schat = 3 * R * R;
    return Q("Cirkel met straal " + schrijfT(echt) + " cm. Schat de oppervlakte: welke past?",
      choose4([maatH(schat, "cm²"), maatH(schat * 10, "cm²"), maatH(schat / 10 === Math.floor(schat / 10) ? schat / 10 : schat * 100, "cm²"), maatH(6 * R, "cm²")]),
      "Rond af: r ≈ " + R + ", π ≈ 3. Oppervlakte ≈ 3 " + DOT + " " + R + " " + DOT + " " + R + " = " + schat + " cm².");
  }
  var est = 6 * R;
  return Q("Cirkel met straal " + schrijfT(echt) + " cm. Schat de omtrek: welke past?",
    choose4([maatH(est, "cm"), maatH(3 * R * R, "cm"), maatH(est * 10, "cm"), maatH(3 * R, "cm")]),
    "Rond af: r ≈ " + R + ", π ≈ 3. Omtrek ≈ 2 " + DOT + " 3 " + DOT + " " + R + " = " + est + " cm.");
};
GEN.mk36 = function(sub) {
  if (sub === 0) {
    var d = 2 * rnd(4, 10);            // middellijn in dm, even: straal hele dm
    // r in dm; oppervlakte in m² = 3,14 · r² (dm²) / 100; in tienden m²: 314 · r² / 10000
    var r = d / 2, t = tiendenVan(PI_H * r * r, 10000);
    return Q("Rond tafelblad met een middellijn van " + schrijfT(d) + " m. Hoeveel m² is het blad? (π ≈ 3,14; 1 decimaal)",
      choose4([maat(t, "m²"), maat(tiendenVan(PI_H * d * d, 10000), "m²"), maat(tiendenVan(PI_H * d, 1000), "m²"), maat(tiendenVan(PI_H * r, 1000), "m²")]),
      "Straal = " + schrijfT(d) + " : 2 = " + schrijfT(r) + " m. Oppervlakte = 3,14 " + DOT + " " + schrijfT(r) + "² = " + schrijfT(t) + " m² (afgerond).");
  }
  if (sub === 1) {
    var l = rnd(8, 40), b = rnd(5, 25), poort = rnd(2, 4);
    var hek = 2 * (l + b) - poort;
    return Q("Weiland van " + l + " bij " + b + " m krijgt een hek rondom, met een open poort van " + poort + " m. Hoeveel meter hek?",
      choose4([maatH(hek, "m"), maatH(2 * (l + b), "m"), maatH(l * b, "m"), maatH(l + b - poort, "m")]),
      "Omtrek: 2 " + DOT + " (" + l + " + " + b + ") = " + (2 * (l + b)) + " m. Min de poort: " + hek + " m.");
  }
  var L = rnd(4, 10) * 10, B = rnd(2, 6) * 10, H = rnd(3, 6) * 10, V = L * B * H;
  return Q("Aquarium van " + L + " × " + B + " × " + H + " cm wordt helemaal gevuld. Hoeveel liter water?",
    choose4([maatH(V / 1000, "l"), maatH(V / 100, "l"), maatH(V, "l"), maatH(V / 10, "l")]),
    "Inhoud: " + L + " " + DOT + " " + B + " " + DOT + " " + H + " = " + V + " cm³ = " + (V / 1000) + " l (1 l = 1000 cm³).");
};

// ─────────────────────────────────────────────────────────────────
// THEORIE PER BLOK (getoond in het 💡-venster, achter de knop "Theorie: waarom klopt dit?")
// ─────────────────────────────────────────────────────────────────

var G1 = "Hoeken", G2 = "Driehoeken en vierhoeken", G3 = "Oppervlakte", G4 = "De cirkel", G5 = "Pythagoras",
    G6 = "Ruimtefiguren", G7 = "Gelijkvormigheid", G8 = "Toepassen en controle";

var THEORIE = {};
THEORIE[G1] =
  "Een hoek zegt hoeveel je moet draaien van het ene been naar het andere. Een hele draai is 360°; die afspraak stamt van de Babyloniërs, omdat 360 door heel veel getallen deelbaar is. Een halve draai (een gestrekte hoek) is dus 180°, en een rechte hoek is een kwart draai: 90°.\n" +
  "Bijna alles in dit blok volgt uit die 180°.\n" +
  "• Nevenhoeken liggen samen op een rechte lijn, dus ze zijn samen 180°.\n" +
  "• Overstaande hoeken (het kruis van twee lijnen) zijn gelijk: ze zijn allebei nevenhoek van dezelfde hoek, dus allebei 180° min die hoek.\n[fig:kruis]\n" +
  "• Snijdt een lijn twee evenwijdige lijnen, dan maakt hij met beide dezelfde draai. Daarom zijn bij evenwijdige lijnen de F-hoeken gelijk, en ook de Z-hoeken zijn gelijk. Let op de ligging: Z-hoeken liggen binnen de evenwijdige lijnen, aan weerszijden van de snijlijn. Zonder evenwijdige lijnen geldt het niet.\n[fig:evenwijdig]\n" +
  "• Hoekensom van een driehoek: trek door de top een lijn evenwijdig aan de basis. De twee basishoeken komen als Z-hoeken boven terug, naast de tophoek, en samen vormen ze een gestrekte hoek. Elke driehoek heeft dus samen 180°.\n[fig:hoekensom]\n" +
  "• Een veelhoek met n hoeken kun je vanuit één hoekpunt in n − 2 driehoeken verdelen. De hoekensom is daarom (n − 2) · 180°. Een vierhoek is 2 driehoeken: 360°.";
THEORIE[G2] =
  "• Een gelijkbenige driehoek heeft twee gelijke zijden en een symmetrieas door de top. Vouw je hem langs die as dubbel, dan vallen de basishoeken op elkaar: ze zijn gelijk.\n[fig:gelijkbenig]\n" +
  "• Een gelijkzijdige driehoek is in alle richtingen gelijkbenig: alle hoeken zijn gelijk, 180 : 3 = 60°.\n" +
  "• In een regelmatige veelhoek zijn alle hoeken gelijk. Eén hoek is de hoekensom gedeeld door het aantal hoeken: (n − 2) · 180 : n. Een regelmatige zeshoek: 720 : 6 = 120°. Daarom passen bijenraten zo mooi: drie hoeken van 120° maken precies 360°.\n" +
  "• Vierhoeken vormen een familie. Elk vierkant is een rechthoek én een ruit. Elke rechthoek en elke ruit is een parallellogram. Afspraak in deze app: een trapezium is een vierhoek met minstens één paar evenwijdige zijden, dus ook elk parallellogram is een trapezium. (Sommige lesmethodes zeggen \"precies één paar\"; dat is een afspraak over het woord, geen andere wiskunde.) Vraagt een opgave de meest precieze naam, kies dan de kleinste familie die past.\n[fig:familie]\n" +
  "• Je herkent ze aan de zijden (evenwijdig, even lang), de hoeken (recht of niet) en de diagonalen. Delen de diagonalen elkaar middendoor, dan is het een parallellogram. Zijn ze daarbij even lang: rechthoek. Staan ze daarbij loodrecht: ruit. Staan ze loodrecht maar deelt maar één diagonaal de andere middendoor: vlieger. Loodrecht alleen is dus niet genoeg voor een ruit.\n[fig:diagonalen]";
THEORIE[G3] =
  "Oppervlakte is het aantal vierkantjes van 1 bij 1 dat in een figuur past. Bij een rechthoek van 5 bij 3 cm passen 3 rijen van 5: 15 cm². De eenheid is cm kwadraat, omdat je cm keer cm doet.\n" +
  "• Parallellogram: knip aan één kant een driehoekje af en leg dat aan de andere kant. Je krijgt een rechthoek met dezelfde basis en hoogte. Dus oppervlakte = basis · hoogte. De hoogte staat loodrecht op de basis; de schuine zijde is niet de hoogte.\n[fig:parallellogram]\n" +
  "• Driehoek: twee dezelfde driehoeken passen samen tot een parallellogram. Eén driehoek is dus de helft: ½ · basis · hoogte.\n[fig:driehoek]\n" +
  "• Trapezium: leg er een omgedraaide kopie naast. Samen vormen ze een parallellogram met basis a + b. Eén trapezium is de helft: ½ · (a + b) · hoogte.\n[fig:trapezium]\n" +
  "• Omtrek is iets anders: de lengte van de rand (cm, geen cm²). Bij een L-vorm uit een rechthoek blijft de omtrek gelijk aan die van de hele rechthoek: de twee randen van de inham zijn samen even lang als de stukken die verdwenen.\n" +
  "• Eenheden: 1 m = 100 cm, maar 1 m² is een vierkant van 100 bij 100 cm, dus 10000 cm² (niet 100). Bij oppervlakte omrekenen doe je de factor in het kwadraat.";
THEORIE[G4] =
  "Leg een touwtje om een ronde pot en meet de middellijn: het touwtje is altijd iets meer dan 3 keer zo lang. Voor elke cirkel is die verhouding hetzelfde getal: π (pi) = 3,14159… De cijfers houden nooit op en herhalen zich nooit. Daarom rekenen we met een benadering: π ≈ 3,14.\n" +
  "• Vier woorden die je uit elkaar houdt: de straal r (midden tot rand, cm), de middellijn d = 2r (rand tot rand door het midden, cm), de omtrek (de lengte van de rand, cm) en de oppervlakte (wat erbinnen ligt, cm²).\n[fig:cirkel]\n" +
  "• Omtrek = π · d = 2 · π · r.\n" +
  "• Oppervlakte = π · r². Waarom? Snijd de cirkel in heel veel smalle taartpunten en leg ze om en om naast elkaar. Je krijgt bijna een parallellogram: de lengte is de halve omtrek (π · r) en de hoogte is de straal (r). Oppervlakte ≈ π · r · r = π · r². Hoe dunner de punten, hoe beter het klopt.\n[fig:taartpunten]\n" +
  "• Terugrekenen: omtrek 31,4 cm? Dan is d = 31,4 : 3,14 = 10 cm en r = 5 cm.\n" +
  "• Een rekenmachine met de echte π geeft soms een iets ander laatste cijfer. In deze app geldt π ≈ 3,14.";
THEORIE[G5] =
  "In een rechthoekige driehoek geldt a² + b² = c². Daarbij is c de schuine zijde: de zijde tegenover de rechte hoek, en altijd de langste.\n" +
  "Waarom? Neem een groot vierkant met zijde a + b en leg er vier kopieën van de driehoek in, zo dat in het midden een scheef vierkant overblijft met zijde c: dat stuk is c². Schuif de vier driehoeken nu anders, twee aan twee tot rechthoeken. Wat overblijft, zijn twee vierkanten: a² en b². Het grote vierkant en de vier driehoeken zijn in beide gevallen hetzelfde, dus c² = a² + b².\n[fig:pythagoras]\n" +
  "• Schuine zijde: kwadrateren, optellen, wortel trekken. 6 en 8: 36 + 64 = 100, c = 10.\n" +
  "• Rechthoekszijde: kwadrateren, aftrekken, wortel trekken. c = 13, a = 5: 169 − 25 = 144, b = 12.\n" +
  "• Omgekeerd: klopt a² + b² = c², dan ís de hoek recht. Bouwers gebruiken dat al duizenden jaren: een touw met knopen op 3, 4 en 5 meter geeft een zuivere rechte hoek.\n" +
  "• Let op: Pythagoras geldt alleen in een driehoek met een rechte hoek. Controle: de schuine zijde is de langste. Krijg je bij een rechthoekszijde een langere uitkomst dan c, dan heb je opgeteld in plaats van afgetrokken.";
THEORIE[G6] =
  "Inhoud is het aantal kubusjes van 1 × 1 × 1 cm dat erin past (cm³).\n" +
  "• Prisma en cilinder: stapel laagjes van het grondvlak op elkaar. Inhoud = oppervlakte grondvlak · hoogte. Een balk: l · b · h. Een cilinder: π · r² · h.\n[fig:laagjes]\n" +
  "• Piramide en kegel: een punt in plaats van een bovenvlak. Inhoud = ⅓ · grondvlak · hoogte. Waarom een derde? Kies in een kubus één hoekpunt. De drie vlakken die er niet aan raken, zijn elk het grondvlak van een piramide met de top in dat hoekpunt. Die drie piramides vullen samen de kubus, zonder overlap. Ze hebben gelijke inhoud: hun grondvlakken zijn even grote vlakken van de kubus en hun hoogte is steeds een ribbe. Elke piramide is dus een derde van de kubus. Voor andere piramides en kegels geldt dezelfde ⅓; dat bewijs is lastiger, maar het idee is hetzelfde.\n[fig:piramides]\n" +
  "• Oppervlakte van een ruimtefiguur: klap hem uit tot een plat patroon (de uitslag) en tel alle vlakken op. Een balk heeft 3 paar gelijke vlakken: 2 · (lb + lh + bh).\n" +
  "• Inhoud en liters: 1 dm³ = 1 liter (l) en 1 cm³ = 1 milliliter (ml). Een pak melk van 1 liter is ongeveer 10 × 10 × 10 cm.";
THEORIE[G7] =
  "Twee figuren zijn gelijkvormig als de een een vergroting of verkleining van de ander is: dezelfde vorm, een andere maat. Alle hoeken zijn dan gelijk, en alle zijden zijn vermenigvuldigd met dezelfde factor k. Bij driehoeken zijn twee gelijke hoeken al genoeg, want de derde volgt uit 180°.\n" +
  "• Factor bepalen: deel bijbehorende zijden op elkaar (nieuw : oud). Vergroten is vermenigvuldigen, nooit optellen.\n" +
  "• Lengte × k.\n" +
  "• Oppervlakte × k², want lengte én breedte worden k keer zo groot.\n" +
  "• Inhoud × k³, want lengte, breedte én hoogte worden alle drie met factor k vermenigvuldigd.\n" +
  "Een pizza die 2 keer zo breed is, heeft 4 keer zoveel pizza. Een kubus met 2 keer zo lange ribben heeft 8 keer zoveel inhoud.\n[fig:vergroten]";
THEORIE[G8] =
  "Controleer elk antwoord op drie manieren.\n" +
  "1. Eenheid: lengte in cm, oppervlakte in cm², inhoud in cm³. Klopt de eenheid niet, dan klopt de formule niet.\n" +
  "2. Schatten: rond af en reken met π ≈ 3. Een cirkel met r = 10 heeft oppervlakte ongeveer 3 · 100 = 300, niet 30 of 3000.\n" +
  "3. Logica: een schuine zijde is de langste zijde, hoeken in een driehoek zijn samen 180°, en een piramide heeft bij hetzelfde grondvlak en dezelfde hoogte een derde van de inhoud van het bijbehorende prisma.\n" +
  "Veelgemaakte fouten: r en d verwisseld; ½ vergeten bij een driehoek; Pythagoras opgeteld waar je moet aftrekken, of gebruikt zonder rechte hoek; bij vergroten k in plaats van k² of k³.";

// ─────────────────────────────────────────────────────────────────
// VAARDIGHEDEN [id, label, groep, desc, strategy, uitleg, voorbeeld, minCorrect, subtypes]
// ─────────────────────────────────────────────────────────────────

var DEFS = [
  ["mk01_hoeksoorten", "Soorten hoeken", G1, "135° is een stompe hoek", "vergelijk met 90° en 180°",
    "Vergelijk de hoek met twee vaste hoeken: 90° (recht, een kwart draai) en 180° (gestrekt, een halve draai). Kleiner dan 90° is scherp, precies 90° is recht, tussen 90° en 180° is stomp, precies 180° is gestrekt. De wijzers van een klok helpen: om 3 uur staan ze recht, om 6 uur gestrekt.",
    "Een hoek van 135°?\nGroter dan 90°, kleiner dan 180°.\nAntwoord: stomp.", 8, 4],
  ["mk02_nevenhoeken", "Nevenhoeken", G1, "Nevenhoek van 64° is 116°", "samen 180°",
    "Nevenhoeken liggen naast elkaar op één rechte lijn en vormen samen een gestrekte hoek: 180°. Trek de gegeven hoek dus van 180 af. Valkuil: van 90 aftrekken (dat is de aanvulling tot een rechte hoek, niet tot een gestrekte).",
    "Nevenhoek van 64°?\n180 − 64 = 116.\nAntwoord: 116°.", 8],
  ["mk03_overstaande_hoeken", "Overstaande hoeken", G1, "Kruis: overstaande hoeken gelijk", "kruis van twee lijnen",
    "Twee snijdende lijnen maken vier hoeken. De hoeken recht tegenover elkaar (overstaand) zijn gelijk. De hoeken naast elkaar zijn nevenhoeken: samen 180°. Kijk dus eerst of de gevraagde hoek tegenover of naast de gegeven hoek ligt.",
    "Eén hoek is 72°.\nOverstaand: 72°.\nErnaast: 180 − 72 = 108°.", 8, 2],
  ["mk04_f_en_z_hoeken", "F- en Z-hoeken", G1, "Evenwijdige lijnen: F- en Z-hoeken gelijk", "evenwijdig",
    "Bij twee evenwijdige lijnen en een snijlijn zijn F-hoeken (dezelfde plek bij beide lijnen) en Z-hoeken (binnen de lijnen, aan weerszijden van de snijlijn) gelijk. Dat geldt alleen omdat de lijnen evenwijdig zijn. Een hoek naast een F- of Z-hoek is een nevenhoek: 180° min die hoek.",
    "Evenwijdige lijnen, hoek 47°.\nZ-hoek: 47°.\nNevenhoek van de Z-hoek: 133°.", 8, 3],
  ["mk05_hoekensom_driehoek", "Hoekensom driehoek", G1, "48° + 75° + ? = 180°", "samen 180°",
    "De drie hoeken van elke driehoek zijn samen 180°. Tel de bekende hoeken op en trek dat van 180 af. Bij een rechthoekige driehoek is één hoek al 90°, dus de twee scherpe hoeken zijn samen 90°.",
    "Hoeken 48° en 75°.\n48 + 75 = 123.\n180 − 123 = 57°.", 8, 2],
  ["mk06_hoekensom_veelhoek", "Hoekensom veelhoek", G1, "Zeshoek: 4 · 180 = 720°", "(n − 2) · 180",
    "Verdeel de veelhoek vanuit één hoekpunt in driehoeken: dat zijn er altijd 2 minder dan het aantal hoeken. Elke driehoek is 180°, dus de hoekensom is (n − 2) · 180. Valkuil: n · 180 (dan tel je twee driehoeken te veel).",
    "Vijfhoek?\n5 − 2 = 3 driehoeken.\n3 · 180 = 540°.", 8],
  ["mk07_gelijkbenig", "Gelijkbenige driehoek", G2, "Tophoek 40°: basishoeken 70°", "twee gelijke hoeken",
    "In een gelijkbenige driehoek zijn de twee basishoeken gelijk (de symmetrieas vouwt ze op elkaar). Ken je de tophoek: 180 min de tophoek, en dat door 2. Ken je een basishoek: de tophoek is 180 min twee keer de basishoek.",
    "Tophoek 40°.\n180 − 40 = 140.\n140 : 2 = 70° per basishoek.", 8, 2],
  ["mk08_regelmatige_veelhoek", "Regelmatige veelhoek", G2, "Achthoek: 1080 : 8 = 135°", "hoekensom : aantal",
    "In een regelmatige veelhoek zijn alle hoeken gelijk. Reken eerst de hoekensom uit met (n − 2) · 180, en deel die door het aantal hoeken. Valkuil: 360 : n; dat is de buitenhoek (hoeveel je draait bij elke hoek als je de rand afloopt), niet de hoek binnenin.",
    "Regelmatige zeshoek?\n4 · 180 = 720.\n720 : 6 = 120°.", 8],
  ["mk09_vierhoeken", "Vierhoeken herkennen", G2, "4 gelijke zijden, geen rechte hoek: ruit", "eigenschappen",
    "Bekijk drie dingen: zijn de zijden even lang, zijn ze evenwijdig, en zijn de hoeken recht? Kies dan de meest precieze naam. Een vierkant is ook een rechthoek en een ruit, maar 'vierkant' zegt het meest. Een vlieger heeft twee paar gelijke zijden die naast elkaar liggen, niet tegenover elkaar.",
    "4 rechte hoeken, zijden 8 en 5 cm?\nNiet alle zijden gelijk.\nAntwoord: rechthoek.", 8],
  ["mk10_diagonalen", "Diagonalen", G2, "Even lang, middendoor, niet loodrecht: rechthoek", "diagonalen",
    "De diagonalen vertellen welke vierhoek het is. Begin altijd met de vraag: delen ze elkaar middendoor? Ja: een parallellogram. Zijn ze dan óók even lang: rechthoek. Staan ze dan óók loodrecht: ruit. Let op: loodrecht alleen is niet genoeg voor een ruit. Bij een vlieger staan de diagonalen ook loodrecht, maar daar deelt maar één diagonaal de andere middendoor.",
    "Loodrecht, middendoor, niet even lang?\nMiddendoor en loodrecht.\nAntwoord: ruit.", 8],
  ["mk11_parallellogram", "Oppervlakte parallellogram", G3, "Basis 9, hoogte 4: 36 cm²", "basis · hoogte",
    "Een parallellogram kun je omknippen tot een rechthoek met dezelfde basis en hoogte. Oppervlakte = basis · hoogte. De hoogte staat loodrecht op de basis. De schuine zijde gebruik je niet: die is langer dan de hoogte en geeft een te grote uitkomst.",
    "Basis 7 cm, hoogte 5 cm, schuine zijde 6 cm?\n7 · 5 = 35.\nAntwoord: 35 cm².", 8],
  ["mk12_driehoek", "Oppervlakte driehoek", G3, "½ · 10 · 7 = 35 cm²", "½ · basis · hoogte",
    "Een driehoek is de helft van een parallellogram met dezelfde basis en hoogte. Reken basis · hoogte en neem de helft. De hoogte staat loodrecht op de basis; een schuine zijde is niet de hoogte. Valkuil: de ½ vergeten.",
    "Basis 9 cm, hoogte 5 cm?\n9 · 5 = 45.\nDe helft: 22,5 cm².", 8, 2],
  ["mk13_trapezium", "Oppervlakte trapezium", G3, "½ · (6 + 10) · 5 = 40 cm²", "½ · (a + b) · h",
    "Tel de twee evenwijdige zijden op, vermenigvuldig met de hoogte en neem de helft. Dat werkt omdat twee trapeziums (één omgedraaid) samen een parallellogram met basis a + b vormen. Je kunt ook denken: gemiddelde van de evenwijdige zijden keer de hoogte.",
    "Evenwijdig 4 en 8 cm, hoogte 3 cm?\n4 + 8 = 12, 12 · 3 = 36.\nDe helft: 18 cm².", 8],
  ["mk14_samengesteld", "Samengestelde figuur", G3, "L-vorm: oppervlakte en omtrek", "aanvullen en aftrekken",
    "Bij de oppervlakte van een L-vorm reken je de hele rechthoek uit en trek je het stuk eraf dat ontbreekt. Bij de omtrek loop je de rand af: bij een inham in een hoek blijft de omtrek gelijk aan die van de hele rechthoek. De twee randen van de inham zijn namelijk samen even lang als de twee stukken rand die verdwenen. Let op de eenheid: oppervlakte in cm², omtrek in cm.",
    "Rechthoek 8 × 6, hoek 3 × 2 eruit.\nOppervlakte: 48 − 6 = 42 cm².\nOmtrek: 2 · (8 + 6) = 28 cm.", 8, 2],
  ["mk15_oppervlakte_eenheden", "Oppervlakte-eenheden", G3, "1 m² = 10000 cm²", "factor in het kwadraat",
    "1 m = 100 cm, maar een vierkante meter is 100 cm bij 100 cm: 10000 cm². Bij oppervlakte gaat de factor dus in het kwadraat. Zo is 1 m² = 100 dm² (10 · 10). Valkuil: met 100 vermenigvuldigen zoals bij lengte.",
    "4 m² = ? cm²\n1 m² = 10000 cm².\nAntwoord: 40000 cm².", 8, 3],
  ["mk16_omtrek_cirkel", "Omtrek cirkel", G4, "r = 5: omtrek 31,4 cm", "π · d",
    "De omtrek is π keer de middellijn: π · d. Krijg je de straal, verdubbel die dan eerst (d = 2r), of reken 2 · π · r. Reken met π ≈ 3,14 en rond af op 1 decimaal. Valkuil: π · r (dan krijg je de helft) of π · r² (dat is de oppervlakte).",
    "Straal 3 cm?\nd = 6 cm.\n3,14 · 6 = 18,84 ≈ 18,8 cm.", 8, 2],
  ["mk17_oppervlakte_cirkel", "Oppervlakte cirkel", G4, "d = 8: 50,2 cm²", "π · r²",
    "De oppervlakte is π · r²: de straal keer zichzelf, keer 3,14. Krijg je de middellijn, deel die dan eerst door 2. Valkuil: de middellijn in het kwadraat (4 keer te groot), of π · d (dat is de omtrek).",
    "Middellijn 10 cm?\nr = 5, r² = 25.\n3,14 · 25 = 78,5 cm².", 8, 2],
  ["mk18_terugrekenen", "Terugrekenen van omtrek", G4, "Omtrek 25,12: straal 4 cm", "omtrek : π",
    "Omtrek = π · d, dus d = omtrek : π. Deel de omtrek door 3,14 en je hebt de middellijn; de straal is daarvan de helft. Lees goed of de vraag de straal of de middellijn wil.",
    "Omtrek 18,84 cm?\n18,84 : 3,14 = 6 = d.\nStraal: 3 cm.", 8, 2],
  ["mk19_halve_kwart_cirkel", "Halve en kwart cirkel", G4, "Halve cirkel r = 6: 56,5 cm²", "deel van de cirkel",
    "Reken eerst de hele cirkel uit en neem dan het deel: de helft of een kwart. Bij de omtrek van een halve cirkel tel je de halve boog (π · r) én de rechte kant (de middellijn) op; die rechte kant vergeten is de bekendste fout.",
    "Halve cirkel, r = 4.\nHele cirkel: 3,14 · 16 = 50,24.\nHelft: 25,12 ≈ 25,1 cm².", 8, 3],
  ["mk20_schuine_zijde", "Schuine zijde", G5, "9 en 12: schuine zijde 15", "kwadraten optellen",
    "Kwadrateer beide rechthoekszijden, tel ze op en trek de wortel. De schuine zijde ligt tegenover de rechte hoek en is altijd de langste. Valkuil: de zijden gewoon optellen (te lang), of de wortel vergeten.",
    "Rechthoekszijden 5 en 12?\n25 + 144 = 169.\n√169 = 13.", 8],
  ["mk21_rechthoekszijde", "Rechthoekszijde", G5, "26 en 10: andere zijde 24", "kwadraten aftrekken",
    "Je kent de schuine zijde en één rechthoekszijde. Kwadrateer beide, trek de kleinste van de grootste af en trek de wortel. De uitkomst moet korter zijn dan de schuine zijde; is hij langer, dan heb je opgeteld in plaats van afgetrokken.",
    "Schuine zijde 10, zijde 6?\n100 − 36 = 64.\n√64 = 8.", 8],
  ["mk22_rechthoekig_of_niet", "Rechthoekig of niet", G5, "7, 24, 25 is rechthoekig", "omgekeerde Pythagoras",
    "Neem de langste zijde als c. Klopt a² + b² = c² precies, dan heeft de driehoek een rechte hoek. Scheelt het ook maar een beetje, dan niet. Dit is de omgekeerde stelling van Pythagoras: zo controleren bouwers een rechte hoek.",
    "Zijden 6, 8, 10?\n36 + 64 = 100 = 10².\nRechthoekig.", 8],
  ["mk23_pythagoras_afronden", "Pythagoras met afronden", G5, "4 en 7: √65 ≈ 8,1", "wortel afronden",
    "Meestal komt er geen mooi getal uit. Reken de kwadraten uit, tel op of trek af, en trek de wortel; rond pas aan het eind af op 1 decimaal. Controle: √65 ligt tussen 8 (√64) en 9 (√81), dicht bij 8.",
    "Rechthoekszijden 3 en 5?\n9 + 25 = 34.\n√34 ≈ 5,8.", 8, 2],
  ["mk24_pythagoras_toepassen", "Pythagoras toepassen", G5, "Ladder 5 m, voet 1,4 m: 4,8 m hoog", "rechte hoek zoeken",
    "Zoek eerst de rechte hoek: tussen muur en grond, of in de hoek van een scherm of veld. Bepaal dan welke lengte de schuine zijde is (bij een ladder: de ladder zelf). Daarna is het Pythagoras: optellen voor de schuine zijde, aftrekken voor een rechthoekszijde.",
    "Ladder 4 m, voet 1 m van de muur.\n16 − 1 = 15.\n√15 ≈ 3,9 m hoog.", 8, 3],
  ["mk25_inhoud_prisma", "Inhoud prisma", G6, "Grondvlak 12, lengte 10: 120 cm³", "grondvlak · hoogte",
    "Een prisma is een stapel gelijke laagjes. Reken eerst de oppervlakte van het grondvlak uit (bij een driehoek: ½ · b · h) en vermenigvuldig met de hoogte of lengte. Valkuil: bij een driehoekig grondvlak de ½ vergeten.",
    "Grondvlak 15 cm², hoogte 8 cm?\n15 · 8 = 120 cm³.", 8, 2],
  ["mk26_inhoud_cilinder", "Inhoud cilinder", G6, "r = 3, h = 10: 282,6 cm³", "π · r² · h",
    "Een cilinder is een prisma met een cirkel als grondvlak. Grondvlak = π · r², en dat keer de hoogte. Valkuil: r niet in het kwadraat, of de middellijn gebruiken in plaats van de straal.",
    "r = 2, h = 5?\n3,14 · 4 = 12,56.\n12,56 · 5 = 62,8 cm³.", 8],
  ["mk27_piramide_kegel", "Inhoud piramide en kegel", G6, "6 × 6, h = 10: 120 cm³", "⅓ · grondvlak · hoogte",
    "Een piramide of kegel loopt uit in een punt en heeft een derde van de inhoud van het prisma of de cilinder met hetzelfde grondvlak en dezelfde hoogte. Reken grondvlak · hoogte en deel door 3. Valkuil: de ⅓ vergeten.",
    "Grondvlak 5 × 5, h = 6?\n25 · 6 = 150.\n150 : 3 = 50 cm³.", 8, 2],
  ["mk28_oppervlakte_balk", "Oppervlakte balk", G6, "5 × 4 × 3: 94 cm²", "uitslag",
    "Een balk heeft zes vlakken in drie gelijke paren: onder en boven, voor en achter, links en rechts. Reken de drie verschillende vlakken uit, tel ze op en verdubbel. Valkuil: de inhoud uitrekenen (dat is cm³), of maar drie vlakken tellen.",
    "Balk 3 × 2 × 1?\n6 + 3 + 2 = 11.\n2 · 11 = 22 cm².", 8],
  ["mk29_inhoud_liters", "Inhoud en liters", G6, "40 × 25 × 30 cm = 30 l", "1 l = 1000 cm³",
    "1 liter is 1 dm³: een kubus van 10 × 10 × 10 cm = 1000 cm³. Reken de inhoud in cm³ uit en deel door 1000 voor liters. En 1 cm³ = 1 ml. Valkuil: door 100 delen.",
    "Bak 20 × 10 × 15 cm?\n3000 cm³.\n3000 : 1000 = 3 l.", 8, 3],
  ["mk30_vergrotingsfactor", "Vergrotingsfactor", G7, "4 cm wordt 10 cm: factor 2,5", "nieuw : oud",
    "De vergrotingsfactor is nieuw gedeeld door oud. Is de factor groter dan 1, dan wordt het groter; kleiner dan 1 (zoals 0,5) betekent verkleinen. Valkuil: het verschil nemen; vergroten is vermenigvuldigen, niet optellen.",
    "6 cm wordt 9 cm?\n9 : 6 = 1,5.\nFactor 1,5.", 8],
  ["mk31_ontbrekende_zijde", "Ontbrekende zijde", G7, "6 → 9, dus 8 → 12", "zelfde factor",
    "Bij gelijkvormige figuren worden alle zijden met dezelfde factor vermenigvuldigd. Bepaal de factor met een bekend paar (nieuw : oud) en vermenigvuldig de andere zijde daarmee. Valkuil: het verschil erbij optellen.",
    "4 → 6, en 10 → ?\nFactor 6 : 4 = 1,5.\n10 · 1,5 = 15.", 8],
  ["mk32_oppervlakte_vergroten", "Oppervlakte bij vergroten", G7, "20 cm², × 3: 180 cm²", "× k²",
    "Worden alle lengtes k keer zo groot, dan wordt de oppervlakte k² keer zo groot, omdat lengte én breedte groeien. Valkuil: alleen met k vermenigvuldigen.",
    "10 cm², lengtes × 2?\n2² = 4.\n10 · 4 = 40 cm².", 8],
  ["mk33_inhoud_vergroten", "Inhoud bij vergroten", G7, "50 cm³, × 2: 400 cm³", "× k³",
    "Worden alle ribben k keer zo lang, dan wordt de inhoud k³ keer zo groot: lengte, breedte en hoogte groeien alle drie. Bij k = 2 is dat 8 keer. Valkuil: k of k².",
    "Inhoud 5 cm³, ribben × 3?\n3³ = 27.\n5 · 27 = 135 cm³.", 8],
  ["mk34_fout_spotten", "Fout spotten", G8, "Welke bewering is FOUT?", "narekenen",
    "Reken elke bewering kort na. Let vooral op de bekende fouten: r en d verwisseld, omtrek en oppervlakte verwisseld, ½ vergeten bij een driehoek, Pythagoras opgeteld zonder kwadraten, en bij vergroten k in plaats van k².",
    "Driehoek basis 6, hoogte 4: oppervlakte 24 cm²?\n½ · 6 · 4 = 12.\nFout: de ½ is vergeten.", 10],
  ["mk35_schatten", "Schatten", G8, "r ≈ 10: oppervlakte ≈ 300 cm²", "afronden, π ≈ 3",
    "Rond de straal af op een mooi getal en reken met π ≈ 3. Zo zie je meteen of een antwoord 30, 300 of 3000 moet zijn. Een schatting is bewust niet exact: π ≈ 3 is geen nauwkeurige berekening, maar een snelle controle op je echte berekening.",
    "r = 4,9 cm?\nr ≈ 5, π ≈ 3.\n3 · 25 = 75 cm².", 10, 2],
  ["mk36_kort_verhaal", "Kort verhaal", G8, "Tafelblad d = 1,6 m: 2 m²", "eerst de figuur",
    "Lees welke figuur het is (cirkel, rechthoek, balk) en wat er gevraagd wordt: rand (omtrek), vlak (oppervlakte) of ruimte (inhoud). Kies dan de formule, let op de eenheden en rond pas aan het eind af.",
    "Rond kleed, d = 2 m?\nr = 1 m, r² = 1.\n3,14 · 1 = 3,14 ≈ 3,1 m².", 8, 3],
];

function tipOf(terms) { return terms && terms[0] ? terms[0] : ""; }

// Typen: hoeken zijn een geheel getal; lengte, oppervlakte en inhoud een getal met de eenheid van het
// antwoord (komma alleen waar pi, een wortel of een factor erin zit); de factor (mk30) een kommagetal.
// Kiezen: herkennen (mk01, mk09, mk10), rechthoekig of niet (mk22), fout spotten (mk34), schatten (mk35).
// Per vraag valt een antwoord dat niet past terug op Kiezen (resolveInput).
var GETAL = { mk02: 1, mk03: 1, mk04: 1, mk05: 1, mk06: 1, mk07: 1, mk08: 1 };
var MAAT_HEEL = { mk11: 1, mk14: 1, mk15: 1, mk18: 1, mk20: 1, mk21: 1, mk25: 1, mk28: 1, mk32: 1, mk33: 1 };
var MAAT_KOMMA = { mk12: 1, mk13: 1, mk16: 1, mk17: 1, mk19: 1, mk23: 1, mk24: 1, mk26: 1, mk27: 1, mk29: 1, mk31: 1, mk36: 1 };
var KOMMA = { mk30: 1 };

var RAW_SKILLS = DEFS.map(function(d) {
  var key = d[0].slice(0, 4), gen = GEN[key], subs = d[8];
  var skill = {
    id: d[0], label: d[1], group: d[2], desc: d[3], strategy: d[4], tip: tipOf,
    uitleg: d[5], voorbeeld: d[6], minCorrect: d[7], subtypes: subs || undefined,
    theorie: THEORIE[d[2]],
    make: function(s) { return retry(function() { return gen(s || 0); }); },
  };
  if (GETAL[key])      { skill.inputType = "number"; skill.inputConfig = {}; }
  if (MAAT_HEEL[key])  { skill.inputType = "quantity"; skill.inputConfig = {}; }
  if (MAAT_KOMMA[key]) { skill.inputType = "quantity"; skill.inputConfig = { allowDecimal: true, maxDecimals: 1 }; }
  if (KOMMA[key])      { skill.inputType = "decimal"; skill.inputConfig = { maxDecimals: 1 }; }
  return skill;
});

var SKILLS = createSkills("wiskunde_meetkunde", RAW_SKILLS);

export var WISK_MEETKUNDE_SKILLS = SKILLS.list;
export var WISK_MEETKUNDE_ORDER  = SKILLS.list.map(function(s) { return s.id; });
export var WISK_MEETKUNDE_GEN    = GEN;
export var WISK_MEETKUNDE_THEORIE = THEORIE;
// Voor de test: de eigen afrondfuncties (alleen lezen)
export var WISK_MEETKUNDE_REKEN = { tiendenVan: tiendenVan, wortelTienden: wortelTienden, schrijfT: schrijfT, schrijfH: schrijfH };
