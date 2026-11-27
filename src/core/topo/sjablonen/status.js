// Sjabloon S13 status (plan T1 par. 1.5; plan T5c, nb21): de soort gebied binnen het Koninkrijk, gekozen uit vaste omschrijvingen.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Onderdeel: { sjabloon: "status", kaart, laag, prefix, zonder, omschrijving, extra, tekst }.
//   omschrijving  per waarde van het feit status (kennisbank, met bron) de omschrijving die de leerling kiest, bijvoorbeeld
//                 "openbaar lichaam" -> "een bijzondere gemeente van Nederland (openbaar lichaam)"
//   extra         omschrijvingen die aantoonbaar voor geen enkel item van het onderdeel gelden (bijvoorbeeld "een provincie van
//                 Nederland": geen van de zes eilanden is een van de 12 provincies van de kennisbank); alleen als foute keuze
//   tekst         functie(naam) -> de vraag
// Het antwoord is de omschrijving van het vastgestelde feit status; zonder vastgesteld feit geen vraag. De foute keuzes: de andere
// omschrijvingen en de extra's. Geen kaart.

import { shuffle } from "../../skills/helpers.js";

export function statusVan(bron, o, id) {
  var it = bron.item(id), f = it && it.feiten && it.feiten.status;
  if (!f || f.status !== "vastgesteld" || !o.omschrijving[f.waarde]) return null;
  return o.omschrijving[f.waarde];
}

export function maakStatus(bron) {
  return function(o, id) {
    var juist = statusVan(bron, o, id);
    if (!juist) throw new Error("geen vastgestelde status voor " + id);
    var fout = Object.keys(o.omschrijving).map(function(k) { return o.omschrijving[k]; }).concat(o.extra || []).filter(function(x, i, a) { return x !== juist && a.indexOf(x) === i; });
    return {
      question: o.tekst(bron.naamVan(id)),
      answer: juist,
      choices: shuffle([juist].concat(fout.slice(0, 3))),
      tekstVraag: true,
      smallChoices: true,
      status: { genoemd: id },
    };
  };
}
