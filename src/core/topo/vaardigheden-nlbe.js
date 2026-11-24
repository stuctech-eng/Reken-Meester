// De vaardigheden van de modus Nederland en België (topo_nlbe): de Basis-vaardigheden nb01 tot en met nb12 (plan T1 deel 2 par. 2.3;
// plan T3 par. 4). Alleen de beschrijving staat in de standaardbundel; de vragen maakt data.js, dat pas bij het openen van de modus
// laadt (laden.js).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Per vaardigheid de onderdelen; elk onderdeel heeft een sjabloon (src/core/topo/sjablonen):
//   wijs-aan (S2)  kaart, laag, prefix (welke items van de laag gevraagd worden; de hele laag blijft tikbaar), soortwoord
//   benoem (S1)    kaart, laag, prefix, vraag, typen (mag met Typen; anders alleen kiezen)
//   relatie (S3)   relatie, gevraagd ("van" of "naar"), prefix, pool (de foute keuzes), tekst
// Een ronde gaat langs alle combinaties van onderdeel en item (data.maak); minCorrect is het aantal combinaties (test-topo-app).
// nb05 (hoofdstad en regeringszetel) ontbreekt nog: de regeringszetel Den Haag staat nog niet als relatie in de kennisbank.

import { createSkills } from "../skills/flow.js";
import { topo } from "./laden.js";

export var TOPO_NLBE_KAARTEN = ["nlbe"];

var K = "nlbe";
function wijsAan(laag, prefix, soortwoord) { return { sjabloon: "wijs-aan", kaart: K, laag: laag, prefix: prefix, soortwoord: soortwoord }; }
function benoem(laag, prefix, vraag, typen) { return { sjabloon: "benoem", kaart: K, laag: laag, prefix: prefix, vraag: vraag, typen: !!typen }; }
function relatie(rel, gevraagd, prefix, pool, tekst) { return { sjabloon: "relatie", relatie: rel, gevraagd: gevraagd, prefix: prefix, pool: pool, tekst: tekst }; }

var DEFS = [
  { id: "nb01", label: "Nederland en zijn buren", desc: "Nederland, België en Duitsland benoemen en aanwijzen", minCorrect: 6, onderdelen: [
    benoem("landen", "", "Welk land is oranje?", false), wijsAan("landen", "", "het land") ] },
  { id: "nb02", label: "Provincies aanwijzen", desc: "De 12 provincies van Nederland", minCorrect: 12, onderdelen: [
    wijsAan("provincies-nl", "", "de provincie") ] },
  { id: "nb03", label: "Provincies benoemen", desc: "De 12 provincies van Nederland: kiezen of typen", minCorrect: 12, onderdelen: [
    benoem("provincies-nl", "", "Welke provincie is oranje?", true) ] },
  { id: "nb04", label: "Provinciehoofdsteden", desc: "De hoofdsteden van de 12 provincies, in beide richtingen", minCorrect: 24, onderdelen: [
    relatie("provinciehoofdstad-van", "van", "prov-nl-", { soort: "stad", prefix: "stad-nl-" }, function(n) { return "Wat is de hoofdstad van de provincie " + n + "?"; }),
    relatie("provinciehoofdstad-van", "naar", "stad-nl-", { soort: "provincie", prefix: "prov-nl-" }, function(n) { return "Van welke provincie is " + n + " de hoofdstad?"; }) ] },
  { id: "nb06", label: "Steden aanwijzen", desc: "De grote steden van Nederland", minCorrect: 29, onderdelen: [
    wijsAan("steden", "stad-nl-", "de stad") ] },
  { id: "nb07", label: "Waddeneilanden", desc: "De vijf bewoonde Waddeneilanden benoemen en aanwijzen", minCorrect: 10, onderdelen: [
    benoem("waddeneilanden", "", "Welk Waddeneiland is oranje?", false), wijsAan("waddeneilanden", "", "het Waddeneiland") ] },
  { id: "nb08", label: "De grote rivieren", desc: "Rijn, Waal, Nederrijn, Lek, IJssel en Maas", minCorrect: 12, onderdelen: [
    benoem("rivieren", "", "Welke rivier is oranje?", false), wijsAan("rivieren", "", "de rivier") ] },
  { id: "nb09", label: "België: gewesten", desc: "De drie gewesten, en de hoofdstad van het Waals Gewest", minCorrect: 8, onderdelen: [
    benoem("gewesten", "", "Welk gewest is oranje?", true), wijsAan("gewesten", "", "het"),
    relatie("gewesthoofdstad-van", "van", "gewest-be-", { soort: "stad", prefix: "stad-be-" }, function(n) { return "Wat is de hoofdstad van het " + n + "?"; }),
    relatie("gewesthoofdstad-van", "naar", "stad-be-", { soort: "gewest", prefix: "gewest-be-" }, function(n) { return "Van welk gewest is " + n + " de hoofdstad?"; }) ] },
  { id: "nb10", label: "België: provincies", desc: "De 10 provincies van België benoemen en aanwijzen", minCorrect: 20, onderdelen: [
    benoem("provincies-be", "", "Welke Belgische provincie is oranje?", true), wijsAan("provincies-be", "", "de Belgische provincie") ] },
  { id: "nb11", label: "België: provinciehoofdsteden", desc: "De hoofdsteden van de 10 Belgische provincies, in beide richtingen", minCorrect: 20, onderdelen: [
    relatie("provinciehoofdstad-van", "van", "prov-be-", { soort: "stad", prefix: "stad-be-" }, function(n) { return "Wat is de hoofdstad van de Belgische provincie " + n + "?"; }),
    relatie("provinciehoofdstad-van", "naar", "stad-be-", { soort: "provincie", prefix: "prov-be-" }, function(n) { return "Van welke Belgische provincie is " + n + " de hoofdstad?"; }) ] },
  { id: "nb12", label: "België: steden aanwijzen", desc: "Acht Belgische steden; Brussel, Leuven en Waver volgen later", minCorrect: 8, onderdelen: [
    wijsAan("steden", "stad-be-", "de stad") ] },
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
  nb03: {
    strategy: "Kaartbeeld",
    tip: "Kijk waar het oranje gebied ligt: aan de kust in het westen (Noord-Holland, Zuid-Holland, Zeeland), in het noorden (Friesland, Groningen, Drenthe), in het oosten (Overijssel, Gelderland), in het midden (Utrecht, Flevoland) of in het zuiden (Noord-Brabant, Limburg).",
    uitleg: "Nederland heeft 12 provincies. Flevoland is het land in het IJsselmeer; Zeeland bestaat uit eilanden en schiereilanden in het zuidwesten; Limburg is de smalle punt in het zuidoosten. Bij Typen tellen hoofdletters, accenten en streepjes niet mee.",
    voorbeeld: "Het oranje gebied ligt helemaal in het noordoosten, aan de Waddenzee en tegen Duitsland: dat is Groningen.",
  },
  nb04: {
    strategy: "Hoofdsteden",
    tip: "Twee provincies hebben een hoofdstad met dezelfde naam: Groningen en Utrecht.",
    uitleg: "Groningen – Groningen; Friesland – Leeuwarden; Drenthe – Assen; Overijssel – Zwolle; Flevoland – Lelystad; Gelderland – Arnhem; Utrecht – Utrecht; Noord-Holland – Haarlem; Zuid-Holland – Den Haag; Zeeland – Middelburg; Noord-Brabant – 's-Hertogenbosch; Limburg – Maastricht.",
    voorbeeld: "De hoofdstad van Noord-Holland is Haarlem, niet Amsterdam. Amsterdam is wel de hoofdstad van Nederland.",
  },
  nb06: {
    strategy: "Stip zoeken",
    tip: "Bedenk eerst in welke provincie de stad ligt; de stip ligt in die provincie.",
    uitleg: "Elke stad is een stip op de kaart. Tik op of vlak bij de stip. Liggen twee stippen dicht bij elkaar, dan zoomt de kaart in; tik dan iets verder van de andere stip. Met + zoom je zelf in.",
    voorbeeld: "Tik de stad Rotterdam aan: Rotterdam ligt in Zuid-Holland, ten zuiden van Den Haag. Zoek de stip daar.",
  },
  nb07: {
    strategy: "Van west naar oost",
    tip: "Van west naar oost: Texel, Vlieland, Terschelling, Ameland, Schiermonnikoog.",
    uitleg: "De Waddeneilanden liggen in een rij boven Noord-Holland, Friesland en Groningen, tussen de Noordzee en de Waddenzee. Texel is het grootste en ligt het meest naar het westen.",
    voorbeeld: "Ameland ligt tussen Terschelling en Schiermonnikoog.",
  },
  nb08: {
    strategy: "Volg de rivier",
    tip: "De Rijn komt in het oosten Nederland binnen en splitst zich: de Waal en de Nederrijn gaan naar het westen, de IJssel naar het noorden.",
    uitleg: "Verderop heet de Nederrijn de Lek. De IJssel stroomt naar het IJsselmeer. De Maas komt in het zuiden uit België binnen, stroomt langs Maastricht naar het noorden en buigt daarna naar het westen.",
    voorbeeld: "De IJssel is de rivier die bij Arnhem van de Rijn afgaat naar het noorden.",
  },
  nb09: {
    strategy: "Drie gewesten",
    tip: "België heeft drie gewesten: het Vlaams Gewest in het noorden, het Waals Gewest in het zuiden en het Brussels Hoofdstedelijk Gewest daartussen.",
    uitleg: "Het Brussels Hoofdstedelijk Gewest is het kleine gebied midden in het Vlaams Gewest. Namen is de hoofdstad van het Waals Gewest.",
    voorbeeld: "Het oranje gebied beslaat het hele zuiden van België: dat is het Waals Gewest.",
  },
  nb10: {
    strategy: "Noord en zuid",
    tip: "In het noorden (Vlaanderen) liggen West-Vlaanderen, Oost-Vlaanderen, Antwerpen, Limburg en Vlaams-Brabant; in het zuiden (Wallonië) Henegouwen, Waals-Brabant, Namen, Luik en Luxemburg.",
    uitleg: "West-Vlaanderen ligt aan de kust. Antwerpen en Limburg liggen tegen Nederland. Vlaams-Brabant en Waals-Brabant liggen rond Brussel. Luxemburg is de provincie in het zuidoosten.",
    voorbeeld: "Het oranje gebied ligt aan de zee in het westen: dat is West-Vlaanderen.",
  },
  nb11: {
    strategy: "Hoofdsteden",
    tip: "Drie provincies hebben een hoofdstad met dezelfde naam: Antwerpen, Luik en Namen.",
    uitleg: "Antwerpen – Antwerpen; Limburg – Hasselt; Oost-Vlaanderen – Gent; West-Vlaanderen – Brugge; Vlaams-Brabant – Leuven; Henegouwen – Bergen; Luik – Luik; Luxemburg – Aarlen; Namen – Namen; Waals-Brabant – Waver.",
    voorbeeld: "De hoofdstad van de Belgische provincie Luxemburg is Aarlen.",
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
    deck: true,
    make: function() { return topo().maak(v); },
  };
});

var GEMAAKT = createSkills("topo_nlbe", RUW);
// Mag de vaardigheid namen typen (een onderdeel benoem met typen)? Dan toont de modus de schakelaar Kiezen | Typen (inputResolve)
GEMAAKT.list.forEach(function(sk, i) { if (DEFS[i].onderdelen.some(function(o) { return o.typen; })) sk.typenNaam = true; });
export var TOPO_NLBE_SKILLS = GEMAAKT.list;
export var TOPO_NLBE_ORDER = DEFS.map(function(v) { return v.id; });
export var TOPO_NLBE_DEFS = DEFS;
