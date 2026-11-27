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
// nb05 vraagt alleen officieel vastgelegde rollen (T1 par. 3.6): Amsterdam (Grondwet, art. 32) en Brussel (Belgische Grondwet,
// art. 194). Den Haag als regeringszetel is niet officieel vastgelegd en staat alleen in de uitleg (besluit 24-11-2026).
// IJmond (een CBS-kern met een regionaam, geen woonplaats) blijft op de kaart, maar wordt niet gevraagd (besluit 24-11-2026).

import { createSkills } from "../skills/flow.js";
import { topo } from "./laden.js";
import { delenVoorLagen } from "./kaartdelen.js";

// T5c-3: ook de kaart van het Koninkrijk (nb21; klein, gzip ongeveer 5 kB)
export var TOPO_NLBE_KAARTEN = ["nlbe", "koninkrijk"];

var K = "nlbe";
function wijsAan(laag, prefix, soortwoord, zonder) { return { sjabloon: "wijs-aan", kaart: K, laag: laag, prefix: prefix, soortwoord: soortwoord, zonder: zonder || [] }; }
function benoem(laag, prefix, vraag, typen) { return { sjabloon: "benoem", kaart: K, laag: laag, prefix: prefix, vraag: vraag, typen: !!typen, zonder: [] }; }
function relatie(rel, gevraagd, prefix, pool, tekst, zonder) { return { sjabloon: "relatie", relatie: rel, gevraagd: gevraagd, prefix: prefix, pool: pool, tekst: tekst, zonder: zonder || [] }; }
// T5a (plan T5 par. 4)
function wijsRelatie(rel, prefix, laag, tekst, zonder) { return { sjabloon: "wijs-relatie", relatie: rel, prefix: prefix, kaart: K, laag: laag, tekst: tekst, zonder: zonder || [] }; }
function nietBij(rel, prefix, pool, tekst, minDoelen) { var o = { sjabloon: "niet-bij", relatie: rel, prefix: prefix, pool: pool, tekst: tekst }; if (minDoelen) o.minDoelen = minDoelen; return o; }
function typLeeg(laag, prefix, vraag, metRelatie) { return { sjabloon: "benoem", kaart: K, laag: laag, prefix: prefix, vraag: vraag, typen: false, alleenTypen: true, metRelatie: metRelatie || null, zonder: [] }; }
function wijsVrij(laag, prefix, soortwoord, zonder) { return { sjabloon: "wijs-aan", kaart: K, laag: laag, prefix: prefix, soortwoord: soortwoord, zonder: zonder || [], vrijeStart: true }; }
function meet(soort) { return { sjabloon: soort, kaart: K, laag: "steden", prefix: "", zonder: [IJMOND], minKm: 40 }; }
function keten(stappen, prefix, tekst) { return { sjabloon: "keten", stappen: stappen, prefix: prefix, zonder: [IJMOND], tekst: tekst }; }
var IJMOND = "stad-nl-ijmond";
// T5c-3 (nb23): de vier grensgebieden, elk in een andere laag van de kaart; benoemen met deze vier als keuzes
var GRENSGEBIEDEN = ["grenspunt-drielandenpunt", "gebied-baarle", "streek-nl-zeeuws-vlaanderen", "zeearm-dollard"];
function benoemGrens(laag, prefix) { return { sjabloon: "benoem", kaart: K, laag: laag, prefix: prefix, vraag: "Welk grensgebied is oranje?", typen: false, zonder: [], keuzeIds: GRENSGEBIEDEN }; }
var BUURLANDEN = { ids: ["BEL", "DEU", "FRA", "LUX", "GBR"] };
// T5c-3 (nb21): de status van de zes Caribische eilanden (feit status: Statuut art. 1 en Rijksoverheid); "een provincie van Nederland"
// alleen als foute keuze (geen van de zes is een van de 12 provincies)
var STATUS_KONINKRIJK = { sjabloon: "status", kaart: "koninkrijk", laag: "koninkrijk", prefix: "", zonder: [],
  omschrijving: { "land binnen het Koninkrijk": "een land binnen het Koninkrijk", "openbaar lichaam": "een bijzondere gemeente van Nederland (openbaar lichaam)" },
  extra: ["een provincie van Nederland"],
  tekst: function(n) { return "Wat is " + n + " binnen het Koninkrijk der Nederlanden?"; } };
function provNL() { return { soort: "provincie", prefix: "prov-nl-" }; }
function provBE() { return { soort: "provincie", prefix: "prov-be-" }; }

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
  { id: "nb05", label: "Hoofdsteden van Nederland en België", desc: "Amsterdam en Brussel, en de zetel van de Belgische regering", minCorrect: 5, onderdelen: [
    relatie("hoofdstad-van", "van", "", function(id) { return { ids: id === "NLD" ? ["stad-nl-den-haag", "stad-nl-rotterdam", "stad-nl-utrecht"] : ["stad-be-antwerpen", "stad-be-gent", "stad-be-luik"] }; }, function(n) { return "Wat is de hoofdstad van " + n + "?"; }),
    relatie("regeringszetel-van", "van", "BEL", { ids: ["stad-be-antwerpen", "stad-be-gent", "stad-be-luik"] }, function(n) { return "In welke stad zetelt de federale regering van " + n + "?"; }),
    relatie("hoofdstad-van", "naar", "", { ids: ["NLD", "BEL", "DEU"] }, function(n) { return "Van welk land is " + n + " de hoofdstad?"; }) ] },
  { id: "nb06", label: "Steden aanwijzen", desc: "De grote steden van Nederland", minCorrect: 28, onderdelen: [
    wijsAan("steden", "stad-nl-", "de stad", ["stad-nl-ijmond"]) ] },
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
  { id: "nb12", label: "België: steden aanwijzen", desc: "Elf Belgische steden: Brussel en de tien provinciehoofdsteden", minCorrect: 11, onderdelen: [
    wijsAan("steden", "stad-be-", "de stad") ] },
  // Gevorderd en Meesterschap, de vaardigheden die met de kennisbank van nu kunnen (plan T5a). nb15 tot en met nb23 en nb27 volgen in
  // T5c op hun plek in de rij. minCorrect = het aantal kennisitems (elk moet minstens een keer goed zijn); zonder kennisitems 12.
  { id: "nb13", niveau: "G", label: "Steden: in welke provincie?", desc: "Bij elke stad de provincie kiezen of aanwijzen", minCorrect: 38, onderdelen: [
    relatie("ligt-in", "naar", "stad-nl-", provNL(), function(n) { return "In welke provincie ligt " + n + "?"; }, [IJMOND]),
    relatie("ligt-in", "naar", "stad-be-", provBE(), function(n) { return "In welke Belgische provincie ligt " + n + "?"; }),
    wijsRelatie("ligt-in", "stad-nl-", "provincies-nl", function(n) { return "Tik de provincie aan waarin " + n + " ligt."; }, [IJMOND]),
    wijsRelatie("ligt-in", "stad-be-", "provincies-be", function(n) { return "Tik de Belgische provincie aan waarin " + n + " ligt."; }) ] },
  { id: "nb14", niveau: "G", label: "Buurprovincies", desc: "Welke provincies grenzen aan elkaar, in Nederland en in België", minCorrect: 22, onderdelen: [
    relatie("grenst-aan", "naar", "prov-nl-", provNL(), function(n) { return "Welke provincie grenst aan " + n + "?"; }),
    nietBij("grenst-aan", "prov-nl-", provNL(), function(n) { return "Welke provincie grenst níet aan " + n + "?"; }),
    relatie("grenst-aan", "naar", "prov-be-", provBE(), function(n) { return "Welke Belgische provincie grenst aan " + n + "?"; }),
    nietBij("grenst-aan", "prov-be-", provBE(), function(n) { return "Welke Belgische provincie grenst níet aan " + n + "?"; }) ] },
  // T5c-2 (plan T5c): de vaardigheden met de gegevens van T5b. Alleen items met een vlak of lijn op de kaart; de Belgische rivieren
  // en kanalen volgen als hun lijnen er zijn. Kanalen mogen in aanwijzen: de lijnproef op de iPhone slaagde (26-11-2026).
  { id: "nb15", niveau: "G", label: "Rivieren en zeearmen", desc: "Alle rivieren en zeearmen van Nederland benoemen en aanwijzen", minCorrect: 44, onderdelen: [
    benoem("rivieren", "", "Welke rivier is oranje?", true), benoem("rivieren-nl", "", "Welke rivier is oranje?", true),
    benoem("rivieren-vlak", "", "Welke rivier is oranje?", true), benoem("zeearmen", "", "Welke zeearm is oranje?", true),
    wijsAan("rivieren", "", "de rivier"), wijsAan("rivieren-nl", "", "de rivier"), wijsAan("rivieren-vlak", "", "de rivier"), wijsAan("zeearmen", "", "de zeearm") ] },
  { id: "nb18", niveau: "G", label: "Meren en kanalen", desc: "De meren en kanalen van Nederland benoemen en aanwijzen", minCorrect: 50, onderdelen: [
    benoem("meren", "", "Welk meer is oranje?", true), wijsAan("meren", "", "het meer"),
    benoem("kanalen", "", "Welk kanaal is oranje?", true), wijsAan("kanalen", "", "het kanaal") ] },
  { id: "nb19", niveau: "G", label: "Streken en landschappen", desc: "Streken in Nederland en België benoemen en aanwijzen", minCorrect: 32, onderdelen: [
    benoem("streken", "", "Welke streek is oranje?", true), wijsAan("streken", "", "de streek"),
    benoem("streken-be", "", "Welke Belgische streek is oranje?", true), wijsAan("streken-be", "", "de Belgische streek") ] },
  { id: "nb20", niveau: "G", label: "Nationale parken", desc: "De nationale parken aanwijzen, en in welke provincie ze liggen", minCorrect: 48, onderdelen: [
    wijsAan("parken", "", "het nationaal park"), wijsAan("parken-be", "", "het park"),
    relatie("ligt-in", "naar", "park-nl-", provNL(), function(n) { return "In welke provincie ligt het nationaal park " + n + "?"; }),
    relatie("ligt-in", "naar", "streek-nl-", provNL(), function(n) { return "In welke provincie ligt het nationaal park " + n + "?"; }),
    relatie("ligt-in", "naar", "park-be-", provBE(), function(n) { return "In welke Belgische provincie ligt het " + n + "?"; }) ] },
  { id: "nb21", niveau: "G", label: "Het Koninkrijk der Nederlanden", desc: "Aruba, Curaçao, Sint Maarten, Bonaire, Sint Eustatius en Saba: herkennen en hun plaats in het Koninkrijk", minCorrect: 12, onderdelen: [
    { sjabloon: "benoem", kaart: "koninkrijk", laag: "koninkrijk", prefix: "", vraag: "Welk eiland is oranje?", typen: true, zonder: [] },
    STATUS_KONINKRIJK ] },
  // nb22 (T1 par. 2.3): Brussel-Hoofdstad alleen met de institutionele bevoegdheid in de vraag, nooit typen, nooit een enkel antwoord
  { id: "nb22", niveau: "G", label: "België: taalgebieden en gemeenschappen", desc: "In welk gewest ligt een taalgebied, en welke gemeenschap is er bevoegd", minCorrect: 8, onderdelen: [
    relatie("ligt-in", "naar", "taalgebied-be-", { soort: "gewest", prefix: "gewest-be-" }, function(n) { return "In welk gewest ligt het " + n + "?"; }),
    relatie("bevoegd-in", "van", "taalgebied-be-", { soort: "gemeenschap", prefix: "gemeenschap-be-" }, function(n) { return "Welke gemeenschap is bevoegd in het " + n + "?"; }, ["taalgebied-be-bru"]),
    nietBij("valt-onder-gemeenschap", "taalgebied-be-bru", { soort: "gemeenschap", prefix: "gemeenschap-be-" }, function(n) { return "Welke gemeenschap is níet bevoegd voor instellingen (zoals scholen) in het " + n + "?"; }, 2) ] },
  { id: "nb23", niveau: "G", label: "Grensgebieden", desc: "Het Drielandenpunt, Baarle, Zeeuws-Vlaanderen en de Dollard: herkennen en het buurland", minCorrect: 8, onderdelen: [
    benoemGrens("grenspunten", "grenspunt-drielandenpunt"), benoemGrens("baarle", "gebied-baarle"),
    benoemGrens("streken", "streek-nl-zeeuws-vlaanderen"), benoemGrens("zeearmen", "zeearm-dollard"),
    relatie("grenst-aan", "naar", "grenspunt-drielandenpunt", BUURLANDEN, function() { return "Welk land grenst bij het Drielandenpunt aan Nederland?"; }),
    relatie("grenst-aan", "naar", "gebied-baarle", BUURLANDEN, function() { return "Met welk land deelt Nederland het enclavegebied Baarle?"; }),
    relatie("grenst-aan", "naar", "streek-nl-zeeuws-vlaanderen", BUURLANDEN, function() { return "Aan welk land grenst Zeeuws-Vlaanderen?"; }),
    relatie("grenst-aan", "naar", "zeearm-dollard", BUURLANDEN, function() { return "Aan welk land grenst de Dollard?"; }) ] },
  { id: "nb24", niveau: "M", label: "Lege kaart: provincies en hoofdsteden", desc: "De naam typen van een provincie of provinciehoofdstad, zonder keuzes", minCorrect: 44, onderdelen: [
    typLeeg("provincies-nl", "", "Typ de naam van de oranje provincie."),
    typLeeg("provincies-be", "", "Typ de naam van de oranje Belgische provincie."),
    typLeeg("steden", "", "Typ de naam van deze provinciehoofdstad.", "provinciehoofdstad-van") ] },
  { id: "nb25", niveau: "M", label: "Lege kaart: steden, rivieren en meren", desc: "Aanwijzen op de hele kaart, zonder startbeeld", minCorrect: 58, onderdelen: [
    wijsVrij("steden", "", "de stad", [IJMOND]),
    wijsVrij("rivieren", "", "de rivier"),
    wijsVrij("meren", "", "het meer") ] },
  { id: "nb26", niveau: "M", zonderItems: true, label: "Richting en afstand", desc: "In welke richting en hoe ver hemelsbreed, tussen twee steden", minCorrect: 12, onderdelen: [
    meet("richting"), meet("afstand") ] },
  { id: "nb27", niveau: "M", label: "Grensgemeenten", desc: "De Nederlandse gemeenten aan de grens met België en Duitsland: aanwijzen en de naam typen", minCorrect: 122, onderdelen: [
    wijsVrij("grensgemeenten", "", "de grensgemeente"),
    typLeeg("grensgemeenten", "", "Typ de naam van de oranje grensgemeente.") ] },
  { id: "nb28", niveau: "M", zonderItems: true, label: "Combinatievragen", desc: "Twee stappen: de stad, de provincie en dan de hoofdstad of het gewest", minCorrect: 12, onderdelen: [
    keten([{ relatie: "ligt-in", richting: "heen" }, { relatie: "provinciehoofdstad-van", richting: "terug" }], "stad-", function(n) { return "Wat is de hoofdstad van de provincie waarin " + n + " ligt?"; }),
    keten([{ relatie: "ligt-in", richting: "heen" }, { relatie: "ligt-in", richting: "heen" }], "stad-be-", function(n) { return "In welk gewest ligt de provincie van " + n + "?"; }) ] },
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
  nb05: {
    strategy: "Hoofdsteden",
    tip: "Pas op: de hoofdstad van Nederland is Amsterdam, niet Den Haag.",
    uitleg: "Volgens de Grondwet is Amsterdam de hoofdstad van Nederland. De regering zetelt in Den Haag, maar Den Haag is niet de hoofdstad. In België is Brussel de hoofdstad, en daar zetelt ook de federale regering.",
    voorbeeld: "Van welk land is Brussel de hoofdstad? Van België.",
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
    uitleg: "Elke stad is een stip op de kaart. Brussel ligt in het midden van België, met Leuven ten oosten en Waver ten zuidoosten ervan. Brugge ligt in het westen, dicht bij de kust; Gent iets oostelijker. Bergen en Namen liggen in het zuiden (Wallonië), Hasselt in het oosten en Aarlen helemaal in het zuidoosten.",
    voorbeeld: "Tik de stad Gent aan: begin bij Brugge in het westen en ga naar het oosten. De volgende grote stip is Gent.",
  },
  nb13: {
    strategy: "Ligging",
    tip: "Zoek de stad eerst op de kaart in je hoofd: ligt hij in het noorden, het westen, het oosten of het zuiden? Dan weet je de provincie.",
    uitleg: "Elke stad ligt in een provincie. Rotterdam, Den Haag, Leiden, Dordrecht en Zoetermeer liggen in Zuid-Holland; Eindhoven, Tilburg en Breda in Noord-Brabant. Bij Aanwijzen tik je het vlak van de provincie aan, niet de stip van de stad.",
    voorbeeld: "In welke provincie ligt Nijmegen? Nijmegen ligt in het oosten, aan de Waal, vlak bij Duitsland: dat is Gelderland.",
  },
  nb14: {
    strategy: "Buren",
    tip: "Twee provincies zijn buren als ze een grens delen. Een punt waar ze elkaar alleen raken telt niet. Provincies aan de andere kant van de landsgrens tellen hier niet mee.",
    uitleg: "Gelderland heeft in Nederland de meeste buren: Flevoland, Limburg, Noord-Brabant, Overijssel, Utrecht en Zuid-Holland. Groningen, Zeeland en Limburg hebben er maar twee.",
    voorbeeld: "Welke provincie grenst níet aan Utrecht: Gelderland, Noord-Holland, Zuid-Holland of Drenthe? Drenthe ligt in het noordoosten, ver van Utrecht.",
  },
  nb15: {
    strategy: "Water op de kaart",
    tip: "Een rivier is een lijn of een smal vlak. Een zeearm is een brede arm van de zee: in Zeeland en Zuid-Holland, en de Dollard in het noordoosten.",
    uitleg: "De Rijn en de Maas komen Nederland binnen in het oosten en het zuiden en stromen naar het westen, naar de zee. In het westen splitsen ze in smallere rivieren. De zeearmen liggen tussen de eilanden in de zuidwesthoek.",
    voorbeeld: "Tik de Westerschelde aan: dat is de zeearm het verst naar het zuiden, tussen Zeeuws-Vlaanderen en de rest van Zeeland.",
  },
  nb18: {
    strategy: "Meren en kanalen",
    tip: "Een meer is een vlak met water. Een kanaal is gegraven: je herkent het aan de lange rechte stukken.",
    uitleg: "Het IJsselmeer is het grote water midden in het land; het Markermeer ligt eronder. Andere meren liggen in Friesland, Groningen en Zeeland. Een kanaal is een lijn die vaak twee wateren of steden verbindt.",
    voorbeeld: "Tik het Noordzeekanaal aan: het loopt van Amsterdam recht naar het westen, naar de zee.",
  },
  nb19: {
    strategy: "Streken",
    tip: "Een streek is een gebied met een eigen naam. Het ligt meestal binnen een of twee provincies.",
    uitleg: "De Veluwe en de Achterhoek liggen in Gelderland, Twente en Salland in Overijssel. In België liggen de Kempen in het noorden, de Ardennen in het zuidoosten.",
    voorbeeld: "Tik Twente aan: dat is het oostelijke deel van Overijssel, tegen Duitsland.",
  },
  nb20: {
    strategy: "Nationale parken",
    tip: "Een nationaal park is een beschermd natuurgebied. Zoek eerst de provincie waarin het ligt.",
    uitleg: "Sommige parken liggen in twee provincies, zoals de Biesbosch (Noord-Brabant en Zuid-Holland). Dan is elk van die provincies goed.",
    voorbeeld: "In welke provincie ligt De Hoge Veluwe? Op de Veluwe, dus in Gelderland.",
  },
  nb21: {
    strategy: "Het Koninkrijk",
    tip: "Aruba, Curaçao en Sint Maarten zijn landen binnen het Koninkrijk, net als Nederland. Bonaire, Sint Eustatius en Saba horen bij Nederland zelf.",
    uitleg: "Het Koninkrijk der Nederlanden bestaat uit vier landen: Nederland, Aruba, Curaçao en Sint Maarten. Bonaire, Sint Eustatius en Saba zijn openbare lichamen van Nederland: bijzondere gemeenten. Aruba, Curaçao en Bonaire liggen bij elkaar, voor de kust van Venezuela; Sint Maarten, Saba en Sint Eustatius liggen verder naar het noordoosten.",
    voorbeeld: "Wat is Saba binnen het Koninkrijk? Saba hoort bij Nederland zelf: een bijzondere gemeente van Nederland (openbaar lichaam).",
  },
  nb22: {
    strategy: "Taal en bestuur",
    tip: "Het Nederlands taalgebied ligt in het Vlaams Gewest, het Frans en het Duits taalgebied in het Waals Gewest, Brussel-Hoofdstad in het Brussels Hoofdstedelijk Gewest.",
    uitleg: "De Vlaamse Gemeenschap is bevoegd in het Nederlands taalgebied, de Franse in het Frans taalgebied en de Duitstalige in het Duits taalgebied (Grondwet, art. 127 en 130). In Brussel-Hoofdstad zijn de Vlaamse en de Franse Gemeenschap bevoegd, maar alleen voor instellingen die bij een van beide horen, zoals Nederlandstalige en Franstalige scholen.",
    voorbeeld: "Welke gemeenschap is níet bevoegd voor instellingen in Brussel-Hoofdstad? Daar zijn de Vlaamse en de Franse Gemeenschap bevoegd voor hun eigen scholen; de Duitstalige niet.",
  },
  nb23: {
    strategy: "Grensgebieden",
    tip: "Het Drielandenpunt ligt in de zuidoosthoek van Limburg, Baarle in Noord-Brabant, Zeeuws-Vlaanderen in het zuidwesten en de Dollard in het noordoosten.",
    uitleg: "Bij het Drielandenpunt komen Nederland, België en Duitsland samen. In Baarle liggen Belgische stukjes midden in Nederland. Zeeuws-Vlaanderen grenst aan België, de Dollard aan Duitsland.",
    voorbeeld: "Aan welk land grenst de Dollard? De Dollard ligt in het noordoosten van Groningen, tegen Duitsland: Duitsland.",
  },
  nb24: {
    strategy: "Uit je hoofd",
    tip: "Hier zijn geen keuzes: je typt de naam zelf. Hoofdletters, accenten en streepjes tellen niet mee; een kleine tikfout telt wel als fout.",
    uitleg: "Je ziet een provincie of een provinciehoofdstad in het oranje. Typ de naam zoals op de kaarten in de vorige vaardigheden. Bij een Belgische plaats is de Nederlandse naam goed (Luik, Bergen, Namen, Aarlen).",
    voorbeeld: "De oranje stip ligt in het zuidoosten, aan de Maas, helemaal onderin Limburg: typ Maastricht.",
  },
  nb25: {
    strategy: "Uit je hoofd",
    tip: "De kaart begint helemaal uitgezoomd. Zoek eerst de streek, zoom dan zelf in en tik pas aan als je het zeker weet.",
    uitleg: "Steden, rivieren en meren door elkaar, op de hele kaart van Nederland en België. Een stad is een stip, een rivier een lijn, een meer een vlak.",
    voorbeeld: "Tik de rivier de IJssel aan: hij loopt van de Rijn bij Arnhem naar het noorden, naar het IJsselmeer.",
  },
  nb26: {
    strategy: "Rekenen",
    tip: "Noord is boven op de kaart. Kijk of de tweede stad vooral hoger of lager ligt (noord of zuid), en vooral links of rechts (west of oost).",
    uitleg: "De richting is de koers van de eerste stad naar de tweede. Hemelsbreed is in een rechte lijn, niet over de weg. Er komt alleen een vraag als de richting duidelijk is.",
    voorbeeld: "Groningen vanuit Utrecht: Groningen ligt hoger (noord) en rechts (oost) op de kaart, dus noordoost.",
  },
  nb27: {
    strategy: "Langs de grens",
    tip: "Volg de grens van noord naar zuid: eerst langs Duitsland (Groningen, Drenthe, Overijssel, Gelderland, Limburg), dan langs België (Limburg, Noord-Brabant, Zeeland).",
    uitleg: "Een grensgemeente is een Nederlandse gemeente die aan België of Duitsland grenst. Je tikt het vlak van de gemeente aan, niet een stad. Sommige gemeenten heten net als een stad erin, zoals Enschede of Maastricht.",
    voorbeeld: "Tik Vaals aan: de gemeente in de uiterste zuidoosthoek van Limburg, waar Nederland, België en Duitsland samenkomen.",
  },
  nb28: {
    strategy: "Twee stappen",
    tip: "Doe het in twee stappen: eerst de provincie van de stad, dan de hoofdstad of het gewest van die provincie.",
    uitleg: "Een combinatievraag gebruikt twee feiten na elkaar. Voorbeeld: Eindhoven ligt in Noord-Brabant, en de hoofdstad van Noord-Brabant is 's-Hertogenbosch.",
    voorbeeld: "Wat is de hoofdstad van de provincie waarin Tilburg ligt? Tilburg ligt in Noord-Brabant; de hoofdstad daarvan is 's-Hertogenbosch.",
  },
};

var RUW = DEFS.map(function(v) {
  var h = HULP[v.id];
  return {
    id: v.id, label: v.label, desc: v.desc, minCorrect: v.minCorrect,
    strategy: h.strategy, tip: h.tip, uitleg: h.uitleg, voorbeeld: h.voorbeeld,
    deck: true,
    make: function() { return topo().maak(v, DEFS); },
  };
});

var GEMAAKT = createSkills("topo_nlbe", RUW);
// Mag de vaardigheid namen typen (een onderdeel benoem met typen, of een keten)? Dan toont de modus de schakelaar Kiezen | Typen
// (inputResolve)
GEMAAKT.list.forEach(function(sk, i) { if (DEFS[i].onderdelen.some(function(o) { return o.typen || o.sjabloon === "keten"; })) sk.typenNaam = true; });
// Beheersing per item (plan T4 par. 4.5 en 5.2): de hooks die het oefenscherm en de voortgang gebruiken. Rekenen en wiskunde hebben ze
// niet; daar gaat alles zoals voor T4.
//   itemVoorwaarde  mastered pas als ook elk kennisitem minstens in ontwikkeling is
//   kennisSleutels  de kennisitems van de vaardigheid (gaan mee in het sessieresultaat, skillItems)
//   extraVoorwaarde de itemVoorwaarde op de stand van nu, voor de live promotie
//   opAntwoord      verwerkt een antwoord in de sessie; geeft het kennisrecord voor de lijst results
// T5a (plan T5 par. 4.8 en 5.1): niveau B, G of M; meesterschap (de itemVoorwaarde telt alleen goed zonder opties); een vaardigheid
// zonder kennisitems (nb26, nb28) heeft geen itemVoorwaarde en wordt beheerst met de bestaande regel, zoals kl05
GEMAAKT.list.forEach(function(sk, i) {
  var def = DEFS[i];
  sk.niveau = def.niveau || "B";
  sk.opAntwoord = function(q, goed, invoer) { return topo().opAntwoord(q, goed, invoer); };
  sk.uitlegBijFout = function(q, keuze) { return topo().uitlegBijFout(q, keuze); };
  if (def.zonderItems) return;
  sk.itemVoorwaarde = true;
  if (def.niveau === "M") sk.meesterschap = true;
  sk.kennisSleutels = function() { return topo().sleutelsVanDef(def); };
  sk.extraVoorwaarde = function() { return topo().itemsOk(def); };
});
export var TOPO_NLBE_SKILLS = GEMAAKT.list;
export var TOPO_NLBE_ORDER = DEFS.map(function(v) { return v.id; });
export var TOPO_NLBE_DEFS = DEFS;

// T5c (plan T5c par. 3.3): de delen van de kaart die een vaardigheid nodig heeft (de lagen van haar onderdelen; zonder de basis)
var DELEN = {};
DEFS.forEach(function(v) { DELEN[v.id] = delenVoorLagen(v.onderdelen.filter(function(o) { return o.kaart && o.laag; }).map(function(o) { return { kaart: o.kaart, laag: o.laag }; })); });
export function delenVanVaardigheid(id) { return (DELEN[id] || []).slice(); }

// Wat het oefenscherm moet laden: de doelvaardigheid is de vaste (los oefenen) of de eerste die nog niet beheerst is. Nodig zijn de
// delen van alle vaardigheden tot en met de doelvaardigheid (ook voor de herhaling en de terugval, die alleen eerdere vaardigheden
// vragen) en van de volgende (na een promotie in dezelfde sessie); vooruit, op de achtergrond, die van de vaardigheid daarna.
export function topoNlbeDelen(skillStats, fixedSkillId) {
  var stats = skillStats || {}, doel = fixedSkillId ? TOPO_NLBE_ORDER.indexOf(fixedSkillId) : -1;
  if (doel < 0) { doel = 0; while (doel < TOPO_NLBE_ORDER.length - 1 && stats[TOPO_NLBE_ORDER[doel]] && stats[TOPO_NLBE_ORDER[doel]].mastered) doel++; }
  var nodig = {}, vooruit = {};
  TOPO_NLBE_ORDER.forEach(function(id, i) { if (i <= doel + 1) DELEN[id].forEach(function(d) { nodig[d] = 1; }); });
  if (doel + 2 < TOPO_NLBE_ORDER.length) DELEN[TOPO_NLBE_ORDER[doel + 2]].forEach(function(d) { if (!nodig[d]) vooruit[d] = 1; });
  return { nodig: Object.keys(nodig).sort(), vooruit: Object.keys(vooruit).sort() };
}
