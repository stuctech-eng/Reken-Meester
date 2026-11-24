// De vaardigheden van de modus Nederland en België (topo_nlbe), stap T3b: aanwijzen (S2). Plan T1 deel 2 par. 2.3; plan T3 par. 4.
// Alleen de beschrijving staat in de standaardbundel; de vragen maakt data.js, dat pas bij het openen van de modus laadt (laden.js).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Per vaardigheid: de kaart, de laag, eventueel een voorvoegsel van de id (welke items van de laag gevraagd worden; de hele laag
// blijft tikbaar) en het woord voor de soort in de vraag. De volgende stap (T3c) voegt benoemen (S1) en relaties (S3) toe.

import { createSkills } from "../skills/flow.js";
import { topo } from "./laden.js";

export var TOPO_NLBE_KAARTEN = ["nlbe"];

var DEFS = [
  { id: "nb01", label: "Nederland en zijn buren", desc: "Nederland, België en Duitsland aanwijzen", kaart: "nlbe", laag: "landen", prefix: "", soortwoord: "het land", minCorrect: 6 },
  { id: "nb02", label: "Provincies aanwijzen", desc: "De 12 provincies van Nederland", kaart: "nlbe", laag: "provincies-nl", prefix: "", soortwoord: "de provincie", minCorrect: 12 },
  { id: "nb06", label: "Steden aanwijzen", desc: "De grote steden van Nederland", kaart: "nlbe", laag: "steden", prefix: "stad-nl-", soortwoord: "de stad", minCorrect: 29 },
  { id: "nb12", label: "België: steden aanwijzen", desc: "Acht Belgische steden; Brussel, Leuven en Waver volgen later", kaart: "nlbe", laag: "steden", prefix: "stad-be-", soortwoord: "de stad", minCorrect: 8 },
];

// Tip, uitleg en voorbeeld bij een fout (het oefenscherm toont ze na 1, 2 en 3 fouten; elke vaardigheid heeft ze, net als in
// rekenen en wiskunde). Alleen ligging die op de kaart te zien is; geen getallen of feiten zonder bron.
var HULP = {
  nb01: {
    strategy: "Ligging",
    tip: "Nederland ligt aan de Noordzee. België ligt ten zuiden van Nederland, Duitsland ten oosten.",
    uitleg: "Op deze kaart zie je drie landen. Het blauw links en boven is de Noordzee. Nederland ligt aan die zee, België eronder en Duitsland aan de rechterkant.",
    voorbeeld: "Tik het land België aan: ga van Nederland naar beneden (naar het zuiden) en tik in het land onder de grens.",
  },
  nb02: {
    strategy: "Kaartbeeld",
    tip: "Begin bij wat je zeker weet: Noord-Holland en Zuid-Holland aan de kust in het westen, Groningen in het noordoosten, Limburg als smalle punt in het zuidoosten.",
    uitleg: "Nederland heeft 12 provincies. In het noorden: Friesland, Groningen en Drenthe. In het westen: Noord-Holland, Zuid-Holland en Zeeland (de eilanden in het zuidwesten). In het midden: Utrecht en Flevoland (het land in het IJsselmeer). In het oosten: Overijssel en Gelderland. In het zuiden: Noord-Brabant en Limburg.",
    voorbeeld: "Tik de provincie Utrecht aan: zoek het midden van het land, tussen Zuid-Holland (west) en Gelderland (oost). Utrecht is daar een kleine provincie.",
  },
  nb06: {
    strategy: "Stip zoeken",
    tip: "Bedenk eerst in welke provincie de stad ligt; de stip ligt in die provincie.",
    uitleg: "Elke stad is een stip op de kaart. Tik op of vlak bij de stip. Liggen twee stippen dicht bij elkaar, dan vraagt de app welke je bedoelt. Met + zoom je in.",
    voorbeeld: "Tik de stad Rotterdam aan: Rotterdam ligt in Zuid-Holland, ten zuiden van Den Haag. Zoek de stip daar.",
  },
  nb12: {
    strategy: "Stip zoeken",
    tip: "Antwerpen ligt in het noorden van België, vlak bij de grens met Nederland. Luik ligt in het oosten.",
    uitleg: "Elke stad is een stip op de kaart. Brugge ligt in het westen, dicht bij de kust; Gent iets oostelijker. Bergen en Namen liggen in het zuiden (Wallonië), Hasselt in het oosten en Aarlen helemaal in het zuidoosten.",
    voorbeeld: "Tik de stad Gent aan: begin bij Brugge in het westen en ga naar het oosten. De volgende grote stip is Gent.",
  },
};

var RUW = DEFS.map(function(v) {
  var h = HULP[v.id];
  return {
    id: v.id, label: v.label, desc: v.desc, minCorrect: v.minCorrect,
    strategy: h.strategy, tip: h.tip, uitleg: h.uitleg, voorbeeld: h.voorbeeld,
    inputType: "kaart", gradingRule: "kaart_item",
    deck: true,
    make: function() { return topo().wijsAan(v); },
  };
});

var GEMAAKT = createSkills("topo_nlbe", RUW);
export var TOPO_NLBE_SKILLS = GEMAAKT.list;
export var TOPO_NLBE_ORDER = DEFS.map(function(v) { return v.id; });
export var TOPO_NLBE_DEFS = DEFS;
