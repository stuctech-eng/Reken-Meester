// Sjablonen S6 richting en S7a afstand (plan T1 par. 1.5; plan T5 par. 4.5 en 5.2, nb26). Berekend op de lengte- en breedtegraden van
// de items (geometrie.punt in de kennisbank); geen kennisitem (plan T5 par. 5.1).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// richting: beginkoers over de grootcirkel van A naar B, in 8 windrichtingen; alleen een vraag als de koers minstens MARGE graden van
//   een grens tussen twee windrichtingen ligt (8 richtingen: 10 graden; 4 richtingen: 20 graden, plan T5 par. 5.2).
// afstand: de grootcirkel met een aardstraal van 6.371 km, afgerond op 5 km; 4 keuzes die elk minstens 25% van elkaar liggen
//   (opeenvolgende keuzes delen door elkaar geeft minstens 1,25).
// Onderdeel: { sjabloon: "richting" | "afstand", kaart, laag, prefix, zonder, minKm (afstand) }; de plaatsen geeft bron.meetIds(o):
// de items van de laag met een punt in de kennisbank.

import { shuffle } from "../../skills/helpers.js";

export var WINDRICHTINGEN = ["noord", "noordoost", "oost", "zuidoost", "zuid", "zuidwest", "west", "noordwest"];
export var WINDSTREKEN = ["noorden", "noordoosten", "oosten", "zuidoosten", "zuiden", "zuidwesten", "westen", "noordwesten"];
export var MARGE_8 = 10, MARGE_4 = 20;
var RAD = Math.PI / 180, R_AARDE = 6371;

export function koers(a, b) {
  var f1 = a.lat * RAD, f2 = b.lat * RAD, dl = (b.lon - a.lon) * RAD;
  var y = Math.sin(dl) * Math.cos(f2), x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}
export function afstandKm(a, b) {
  var f1 = a.lat * RAD, f2 = b.lat * RAD, df = f2 - f1, dl = (b.lon - a.lon) * RAD;
  var h = Math.sin(df / 2) * Math.sin(df / 2) + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  return 2 * R_AARDE * Math.asin(Math.min(1, Math.sqrt(h)));
}
// De windrichting (index 0-7) van een koers, of -1 als hij binnen de marge van een grens ligt
export function windrichting(graden, marge) {
  var sector = Math.round(graden / 45) % 8, midden = sector * 45, afwijking = Math.abs(((graden - midden) + 540) % 360 - 180);
  return 22.5 - afwijking >= (marge === undefined ? MARGE_8 : marge) ? sector : -1;
}
// De ladder van keuzes voor een afstand: factoren met stap 1,3, afgerond op 5 km; vier opeenvolgende met het antwoord erin
var LADDER = [Math.pow(1.3, -3), Math.pow(1.3, -2), Math.pow(1.3, -1), 1, 1.3, Math.pow(1.3, 2), Math.pow(1.3, 3)];
function op5(x) { return Math.round(x / 5) * 5; }

export function maakRichting(bron) {
  return function(o, id) {
    var a = bron.punt(id), anderen = shuffle(bron.meetIds(o).filter(function(x) { return x !== id; }));
    for (var i = 0; i < anderen.length; i++) {
      var b = bron.punt(anderen[i]), w = windrichting(koers(a, b), MARGE_8);
      if (w < 0) continue;
      var fout = shuffle(WINDRICHTINGEN.filter(function(x, j) { return j !== w; })).slice(0, 3);
      return {
        question: "In welke richting ligt " + bron.naamVan(anderen[i]) + " vanuit " + bron.naamVan(id) + "?",
        answer: WINDRICHTINGEN[w],
        choices: shuffle([WINDRICHTINGEN[w]].concat(fout)),
        tekstVraag: true,
        smallChoices: true,
        meting: { soort: "richting", van: id, naar: anderen[i], graden: Math.round(koers(a, b) * 10) / 10 },
      };
    }
    throw new Error("richting: geen plaats met een duidelijke richting vanuit " + id);
  };
}

export function maakAfstand(bron) {
  return function(o, id) {
    var a = bron.punt(id), anderen = shuffle(bron.meetIds(o).filter(function(x) { return x !== id; }));
    for (var i = 0; i < anderen.length; i++) {
      var d = afstandKm(a, bron.punt(anderen[i]));
      if (d < (o.minKm || 40)) continue;
      var start = Math.floor(Math.random() * 4), rij = LADDER.slice(start, start + 4).map(function(f) { return op5(d * f); });
      var goed = rij.every(function(x, j) { return j === 0 || x / rij[j - 1] >= 1.25; });
      if (!goed) continue;
      var antwoord = op5(d);
      return {
        question: "Hoe ver is het hemelsbreed van " + bron.naamVan(id) + " naar " + bron.naamVan(anderen[i]) + "?",
        answer: antwoord + " km",
        choices: shuffle(rij.map(function(x) { return x + " km"; })),
        tekstVraag: true,
        smallChoices: true,
        meting: { soort: "afstand", van: id, naar: anderen[i], km: Math.round(d * 10) / 10 },
      };
    }
    throw new Error("afstand: geen plaats op minstens " + (o.minKm || 40) + " km van " + id);
  };
}
