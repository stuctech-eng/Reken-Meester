// Topografie in de app: de kennisbank en de kaarten, pas geladen als je een modus van Topografie opent (plan T3 par. 3.1).
// Dit bestand en alles wat het importeert staat nooit in de standaardbundel van rekenen en wiskunde (test: tools/topo/test-bundel.mjs).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Identiteit (plan T3 par. 3.2): de kennisbank-id is de identiteit van een gebied. naamVan(id) geeft de voorkeursnaam uit de
// kennisbank, nooit uit de kaart. Een kaart wordt gekoppeld via zetKaart(id, kaartbestand); de doelen per laag krijgen hun naam
// uit naamVan.

import { LANDEN } from "./items/landen.js";
import { STEDEN } from "./items/steden-nl.js";
import { PROVINCIES } from "./items/provincies.js";
import { GEWESTEN } from "./items/gewesten.js";
import { STEDEN_BE } from "./items/steden-be.js";
import { WATER_NLBE } from "./items/water-nlbe.js";
import { EILANDEN_NL } from "./items/eilanden-nl.js";
import { TAALGEBIEDEN } from "./items/taalgebieden.js";
import { GEMEENTEN_NL } from "./items/gemeenten-nl.js";
import { STREKEN_NL } from "./items/streken-nl.js";
import { GRENSGEBIEDEN } from "./items/grensgebieden.js";
import { KONINKRIJK } from "./items/koninkrijk.js";
import { WATER_NL } from "./items/water-nl.js";
import { PARKEN_NL } from "./items/parken-nl.js";
import { KANALEN_NL } from "./items/kanalen-nl.js";
import { PARKEN_BE } from "./items/parken-be.js";
import { WATER_BE } from "./items/water-be.js";
import { STREKEN_BE } from "./items/streken-be.js";
import { pakUit, pakDeelUit } from "./kaart/bogen.js";
import { maakDoelen } from "./kaart/tikregel.js";
import { ringDelen } from "./kaart/beeld.js";
import { HOOFDSTEDEN_NLBE } from "./afgeleid/hoofdsteden-nlbe.js";
import { LIGGING_NLBE } from "./afgeleid/ligging-nlbe.js";
import { GRENSGEMEENTEN_NL } from "./afgeleid/grensgemeenten-nl.js";
import { RELATIES as RELATIESOORTEN } from "./relaties.js";
import { maakWijsAan, vraagIds } from "./sjablonen/wijs-aan.js";
import { maakBenoem } from "./sjablonen/benoem.js";
import { maakRelatie, genoemdeIds, juisteIds } from "./sjablonen/relatie.js";
import { maakWijsRelatie } from "./sjablonen/wijs-relatie.js";
import { maakNietBij, genoemdNietBij } from "./sjablonen/niet-bij.js";
import { maakRichting, maakAfstand, windrichting, WINDSTREKEN, MARGE_8 } from "./sjablonen/meten.js";
import { maakKeten, ketenIds } from "./sjablonen/keten.js";
import { alleenVan } from "./sjablonen/wijs-aan.js";
import { maakSessie } from "./sessie.js";
import { allesMinstensInOntwikkeling, telling } from "./beheersing.js";
import { deckPick } from "../skills/flow.js";

var KB = {};
[LANDEN, STEDEN, PROVINCIES, GEWESTEN, STEDEN_BE, WATER_NLBE, EILANDEN_NL, TAALGEBIEDEN, GEMEENTEN_NL, STREKEN_NL, GRENSGEBIEDEN, KONINKRIJK, WATER_NL, PARKEN_NL, KANALEN_NL, PARKEN_BE, WATER_BE, STREKEN_BE].forEach(function(lijst) {
  lijst.forEach(function(it) { if (it && it.id && it.naam) KB[it.id] = it; });
});

export function item(id) { return KB[id] || null; }

// De voorkeursnaam en de goedgekeurde varianten (voor typen, plan T3 par. 3.3)
export function namenVan(id) {
  var it = KB[id];
  return [naamVan(id)].concat(((it && it.naam && it.naam.varianten) || []).map(function(v) { return typeof v === "string" ? v : v.waarde; }));
}

// Kennisbank-items van een soort, eventueel met een voorvoegsel van de id (voor de foute keuzes van S3)
export function ids(soort, prefix) {
  return Object.keys(KB).filter(function(id) { return KB[id].soort === soort && (!prefix || id.indexOf(prefix) === 0); }).sort();
}

// Vastgestelde relaties van een soort: de afgeleide hoofdstadrelaties van Nederland en Belgie (fase 6.2) en de relaties die in de
// items zelf staan (bijvoorbeeld Brussel: hoofdstad en zetel van de federale regering van Belgie, Grondwet art. 194), zoals de index
// van de kennisbank ze leest (relatie-index.js, bouwIndex)
// T5a: ook de afgeleide liggingsrelaties (ligt-in, grenst-aan; afgeleid/ligging-nlbe.js). Een symmetrische relatie (grenst-aan) staat
// daar een keer; hier ook in de andere richting, zodat elke provincie als bron voorkomt.
var RELATIES = HOOFDSTEDEN_NLBE.concat(LIGGING_NLBE, GRENSGEMEENTEN_NL);
Object.keys(KB).sort().forEach(function(id) { (KB[id].relaties || []).forEach(function(r) { var x = {}; for (var k in r) x[k] = r[k]; x.van = id; RELATIES.push(x); }); });
RELATIES = RELATIES.filter(function(r) { return r.status === "vastgesteld"; });
RELATIES = RELATIES.concat(RELATIES.filter(function(r) { return RELATIESOORTEN[r.type] && RELATIESOORTEN[r.type].symmetrisch; }).map(function(r) { var x = {}; for (var k in r) x[k] = r[k]; x.van = r.naar; x.naar = r.van; return x; }));
export function relaties(type) { return RELATIES.filter(function(r) { return r.type === type; }); }

export function naamVan(id) {
  var it = KB[id];
  if (!it || !it.naam || !it.naam.waarde) throw new Error("onbekend gebied in de kennisbank: " + id);
  return it.naam.waarde;
}

var KAARTEN = {};

// Buren (plan T4 par. 8): twee gebieden van dezelfde laag die een boog van de kaart delen, delen een grenslijn (een hoekpunt alleen
// is geen boog). Alleen voor de lagen waarvan alle gebieden uit een bron komen, zodat de grenzen precies samenvallen: de provincies
// van Nederland (CBS), van Belgie en de gewesten. De laag landen niet: daar komen de grenzen niet uit een bestand (Nederland en
// Duitsland delen er geen boog); de grenzen tussen landen staan in afgeleid/randen.js (grenst-aan, voor de modus Europa).
var BUREN_LAGEN = ["provincies-nl", "provincies-be", "gewesten"];
var BUREN = {};
function zetBuren(bestand) {
  bestand.lagen.forEach(function(l) {
    if (BUREN_LAGEN.indexOf(l.id) < 0) return;
    var perBoog = {};
    l.items.forEach(function(it) { (it.r || []).forEach(function(ring) { ring.forEach(function(a) { var b = a < 0 ? ~a : a; (perBoog[b] = perBoog[b] || {})[it.id] = 1; }); }); });
    var bu = {};
    Object.keys(perBoog).forEach(function(b) { var ids = Object.keys(perBoog[b]); ids.forEach(function(x) { ids.forEach(function(y) { if (x !== y) (bu[x] = bu[x] || {})[y] = 1; }); }); });
    l.items.forEach(function(it) { BUREN[it.id] = Object.keys(bu[it.id] || {}).sort(); });
  });
}
export function buren(id) { return BUREN[id] || []; }

// Een kaart klaarzetten: uitpakken (bogen), per item de ringen met oppervlakte (voor de rand), per laag de doelen met naam.
// T5c (plan T5c par. 3.3): een kaart in delen (kaartdelen.js) komt eerst als basis. Van de lagen van een deel kent de basis alleen de
// items (de id's); zetDeel geeft ze daarna hun vormen en doelen. Tot dan geeft laag() voor zo'n laag een fout, en laagInhoud() de items.
var BASIS = {};
function klaarLaag(l) {
  var items = l.items.map(function(it) { var n = {}; for (var s in it) n[s] = it[s]; n.naam = naamVan(it.id); if (it.d) n.delen = ringDelen(it.d); return n; });
  var laag = { id: l.id, soort: l.soort, bron: l.bron, items: items };
  laag.doelen = maakDoelen(laag);
  return laag;
}
export function zetKaart(id, bestand) {
  if (KAARTEN[id]) return KAARTEN[id];
  zetBuren(bestand);
  var k = pakUit(bestand);
  var lagen = k.lagen.map(function(l) {
    if (!l.deel) return klaarLaag(l);
    return { id: l.id, soort: l.soort, bron: l.bron, deel: l.deel, items: l.items.map(function(it) { return { id: it.id, naam: naamVan(it.id) }; }), doelen: null };
  });
  BASIS[id] = bestand;
  KAARTEN[id] = {
    id: k.id, breedte: k.breedte, hoogte: k.hoogte,
    achtergrond: k.achtergrond.map(function(a) { return { id: a.id, d: a.d, delen: ringDelen(a.d) }; }),
    lagen: lagen,
  };
  return KAARTEN[id];
}
export function zetDeel(id, deelBestand) {
  var K = KAARTEN[id];
  if (!K || !BASIS[id]) throw new Error("eerst de basis van de kaart " + id + ", dan het deel " + deelBestand.deel);
  pakDeelUit(BASIS[id], deelBestand).forEach(function(l) {
    var i = K.lagen.map(function(x) { return x.id; }).indexOf(l.id);
    if (i < 0 || K.lagen[i].deel !== deelBestand.deel) throw new Error("de laag " + l.id + " hoort niet bij het deel " + deelBestand.deel);
    if (K.lagen[i].doelen) return;
    var nieuw = klaarLaag(l);
    nieuw.deel = deelBestand.deel;
    if (nieuw.items.map(function(it) { return it.id; }).join() !== K.lagen[i].items.map(function(it) { return it.id; }).join()) throw new Error("de laag " + l.id + " van het deel " + deelBestand.deel + " heeft andere items dan de basis");
    K.lagen[i] = nieuw;
  });
}

export function kaart(id) {
  if (!KAARTEN[id]) throw new Error("kaart niet geladen: " + id);
  return KAARTEN[id];
}

export function laagInhoud(kaartId, laagId) {
  var l = kaart(kaartId).lagen.filter(function(x) { return x.id === laagId; })[0];
  if (!l) throw new Error("onbekende laag " + laagId + " op de kaart " + kaartId);
  return l;
}
export function laag(kaartId, laagId) {
  var l = laagInhoud(kaartId, laagId);
  if (!l.doelen) throw new Error("de laag " + laagId + " (deel " + l.deel + " van de kaart " + kaartId + ") is nog niet geladen");
  return l;
}

// De omhullende (viewBox-eenheden) van een reeks gebieden van een laag: [x0, y0, x1, y1]; het beginbeeld van een vraag
var OMHULLING = {};
export function omhulling(kaartId, laagId, ids) {
  var sleutel = kaartId + "/" + laagId + "/" + ids.join(",");
  if (OMHULLING[sleutel]) return OMHULLING[sleutel];
  var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, wel = {};
  ids.forEach(function(id) { wel[id] = 1; });
  laag(kaartId, laagId).doelen.forEach(function(d) {
    if (!wel[d.id]) return;
    var pts = d.soort === "punt" ? [[d.x, d.y]] : [].concat.apply([], d.ringen);
    pts.forEach(function(p) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; });
  });
  OMHULLING[sleutel] = [x0, y0, x1, y1];
  return OMHULLING[sleutel];
}

// De lengte- en breedtegraad van een item (geometrie.punt in de kennisbank), voor richting en afstand (T5a)
export function punt(id) {
  var it = KB[id], p = it && it.geometrie && it.geometrie.punt;
  if (!p || !Number.isFinite(p.lon) || !Number.isFinite(p.lat)) throw new Error("geen punt in de kennisbank: " + id);
  return { lon: p.lon, lat: p.lat };
}

// De sjablonen (plan T3 par. 3.4; T5a: wijs-relatie, niet-bij, richting, afstand, keten)
var BRON = { laag: laag, kaart: kaart, item: item, punt: punt, meetIds: meetIds, naamVan: naamVan, namenVan: namenVan, omhulling: omhulling, relaties: relaties, ids: ids, buren: buren };
var SJABLONEN = {
  "wijs-aan": maakWijsAan(BRON), "benoem": maakBenoem(BRON), "relatie": maakRelatie(BRON),
  "wijs-relatie": maakWijsRelatie(BRON), "niet-bij": maakNietBij(BRON), "richting": maakRichting(BRON), "afstand": maakAfstand(BRON), "keten": maakKeten(BRON),
};

// De plaatsen van richting en afstand: de items van een laag met een punt in de kennisbank (o.laag, o.prefix, o.zonder)
function meetIds(o) { return vraagIds(laagInhoud(o.kaart, o.laag), o.prefix, o.zonder).filter(function(id) { var it = KB[id]; return !!(it && it.geometrie && it.geometrie.punt); }); }

// De gevraagde items van een onderdeel
export function onderdeelIds(o) {
  if (o.sjabloon === "relatie") return genoemdeIds(BRON, o);
  if (o.sjabloon === "wijs-relatie") return genoemdeIds(BRON, { relatie: o.relatie, gevraagd: "naar", prefix: o.prefix, zonder: o.zonder });
  if (o.sjabloon === "niet-bij") return genoemdNietBij(BRON, o);
  if (o.sjabloon === "richting" || o.sjabloon === "afstand") return meetIds(o);
  if (o.sjabloon === "keten") return ketenIds(BRON, o);
  return vraagIds(laagInhoud(o.kaart, o.laag), o.prefix, o.zonder, alleenVan(BRON, o));
}

// Alle combinaties (onderdeel, item) van een vaardigheid
export function combinaties(def) {
  var uit = [];
  def.onderdelen.forEach(function(o, i) { onderdeelIds(o).forEach(function(id) { uit.push({ o: i, id: id }); }); });
  return uit;
}

// De kennisitems (plan T4 par. 3): de sleutel "<item-id>|<kennissoort>". Per combinatie (onderdeel, item) de sleutels die de vraag
// kan trainen: aanwijzen a, benoemen b, relatie r:<relatie> op het paar (de bron-id van); bij "van" met meer juiste bronnen elk paar
// T5a: benoemen met alleen typen (nb24) is s; wijs-relatie en niet-bij zijn r: op het genoemde item (zoals relatie "naar"); richting,
// afstand en keten hebben geen kennisitem (plan T5 par. 5.1)
export function sleutelsVan(o, id) {
  if (o.sjabloon === "wijs-aan") return [id + "|a"];
  if (o.sjabloon === "benoem") return [id + (o.alleenTypen ? "|s" : "|b")];
  if (o.sjabloon === "richting" || o.sjabloon === "afstand" || o.sjabloon === "keten") return [];
  if (o.sjabloon === "wijs-relatie" || o.sjabloon === "niet-bij" || o.gevraagd === "naar") return [id + "|r:" + o.relatie];
  return juisteIds(BRON, o, id).map(function(v) { return v + "|r:" + o.relatie; });
}
// Alle kennisitems van een vaardigheid (de itemVoorwaarde en de balk); schrijven (s) hoort er niet bij: dat is Meesterschap (T5)
var SLEUTELS = {};
export function sleutelsVanDef(def) {
  if (SLEUTELS[def.id]) return SLEUTELS[def.id];
  var gezien = {};
  combinaties(def).forEach(function(c) { sleutelsVan(def.onderdelen[c.o], c.id).forEach(function(s) { gezien[s] = 1; }); });
  SLEUTELS[def.id] = Object.keys(gezien).sort();
  return SLEUTELS[def.id];
}

// Het kennisitem van een gemaakte vraag: sleutel (en typ: de sleutel bij typen, alleen bij benoemen met typen), met wat de sessie
// nodig heeft om een fout terug te laten komen (de vaardigheid, het onderdeel en het item)
function kennisVan(def, oi, id, q) {
  var o = def.onderdelen[oi], sleutel;
  if (o.sjabloon === "relatie") sleutel = (o.gevraagd === "van" ? q.relatie.antwoordId : q.relatie.genoemd) + "|r:" + o.relatie;
  else sleutel = sleutelsVan(o, id)[0];
  if (!sleutel) return null;
  var k = { sleutel: sleutel, defId: def.id, o: oi, id: id };
  if (o.sjabloon === "benoem" && o.typen && !o.alleenTypen) k.typ = id + "|s";
  return k;
}

var SESSIE = maakSessie({ combinaties: combinaties, sleutelsVan: sleutelsVan, sleutelsVanDef: sleutelsVanDef });

// De sessie (plan T4 par. 5): bij het openen van de modus de opgeslagen itemstand en de datum
export function startSessie(items, datum) { SESSIE.start(items, datum); }
// Na elk antwoord: het kennisrecord voor de lijst results (invoer: "kaart", "naam" of "choice")
export function opAntwoord(q, goed, invoer) { return SESSIE.antwoord(q, goed, invoer); }
// De itemVoorwaarde op de stand van nu (voor de live promotie in het oefenscherm, plan T4 par. 4.5)
export function itemsOk(def) { return allesMinstensInOntwikkeling(SESSIE.items(), sleutelsVanDef(def), def.niveau === "M"); }
export function itemTelling(def, items) { return telling(items || SESSIE.items(), sleutelsVanDef(def), def.niveau === "M"); }
export function sessieItems() { return SESSIE.items(); }

// Een vraag van een vaardigheid: eerst de keuze van de sessie (fouten, herhaling, aan de beurt, nieuw), anders een ronde langs
// alle combinaties (deckPick); daarna het sjabloon van het onderdeel. defs: alle vaardigheden van de modus (voor de herhaling).
// Een herhalingsvraag uit een andere vaardigheid krijgt vanSkillId: het oefenscherm telt hem dan bij die vaardigheid.
export function maak(def, defs) {
  var k = SESSIE.kies(def, defs || [def]);
  if (!k) {
    // de ronde langs alle combinaties; is het kennisitem hetzelfde als de vorige vraag (een paar in de andere richting), dan een
    // willekeurige andere combinatie
    var combos = combinaties(def), c = deckPick(def.id, combos), vorig = SESSIE.laatste();
    function zelfde(x) { return vorig !== null && sleutelsVan(def.onderdelen[x.o], x.id).indexOf(vorig) >= 0; }
    if (zelfde(c)) { var anders = combos.filter(function(x) { return !zelfde(x); }); if (anders.length) c = anders[Math.floor(Math.random() * anders.length)]; }
    k = { def: def, o: c.o, id: c.id };
  }
  var o = k.def.onderdelen[k.o];
  var q = SJABLONEN[o.sjabloon](o, k.id);
  var kn = kennisVan(k.def, k.o, k.id, q);
  if (kn) q.kennis = kn;
  if (k.def !== def) q.vanSkillId = k.def.id;
  SESSIE.gevraagd(q);
  return q;
}
export function maakMet(def, o, id) { return SJABLONEN[o.sjabloon](o, id); }

// De meester zonder AI: uitleg bij een verwisseling (plan T5 par. 4.7). Alleen uit de gegevens; ontbreekt een gegeven, dan valt dat
// stuk weg; zonder enig stuk null (dan toont het oefenscherm niets extra).
//   richting   het juiste item ten opzichte van het gekozen item, op de kaart (noord is boven), alleen bij een duidelijke richting
//              (dezelfde marge als S6 met 8 windrichtingen, MARGE_8); niet bij lijnen
//   buren      "Ze grenzen aan elkaar." (de buren uit de kaart)
//   relatie    grenst-aan: of het gekozen item wel of niet aan het genoemde grenst; provinciehoofdstad: de provincie van de gekozen stad
function middenOpKaart(id) {
  var gevonden = null;
  Object.keys(KAARTEN).forEach(function(k) { KAARTEN[k].lagen.forEach(function(l) { if (gevonden) return; (l.doelen || []).forEach(function(d) { if (d.id === id && !gevonden) gevonden = d.soort === "punt" ? { x: d.x, y: d.y } : d.soort === "vlak" ? { x: d.mx, y: d.my } : null; }); }); });
  return gevonden;
}
function idVanNaam(naam, antwoordId) {
  var voor = antwoordId.split("-").slice(0, 2).join("-") + "-", soort = KB[antwoordId] ? KB[antwoordId].soort : null;
  var zelfde = Object.keys(KB).filter(function(id) { return id.indexOf(voor) === 0 && KB[id].naam.waarde === naam; });
  if (zelfde.length === 1) return zelfde[0];
  var soortGelijk = Object.keys(KB).filter(function(id) { return KB[id].soort === soort && KB[id].naam.waarde === naam; });
  return soortGelijk.length === 1 ? soortGelijk[0] : null;
}
export function uitlegBijFout(q, keuze) {
  var antwoordId = q.kaart ? q.kaart.antwoordId : q.relatie ? q.relatie.antwoordId : null;
  if (!antwoordId || typeof keuze !== "string") return null;
  var gekozen = idVanNaam(keuze, antwoordId);
  if (!gekozen || gekozen === antwoordId) return null;
  var delen = [], A = naamVan(antwoordId), B = naamVan(gekozen);
  var r = q.relatie;
  if (r && r.relatie === "grenst-aan") {
    var wel = juisteIds(BRON, { relatie: "grenst-aan", gevraagd: "naar" }, r.genoemd).indexOf(gekozen) >= 0;
    delen.push(B + (wel ? " grenst wel" : " grenst niet") + " aan " + naamVan(r.genoemd) + ".");
  } else {
    var pa = middenOpKaart(antwoordId), pb = middenOpKaart(gekozen);
    if (pa && pb) {
      var graden = (Math.atan2(pa.x - pb.x, pb.y - pa.y) * 180 / Math.PI + 360) % 360, w = windrichting(graden, MARGE_8);
      if (w >= 0) delen.push(A + " ligt ten " + WINDSTREKEN[w] + " van " + B + ".");
    }
    if (buren(antwoordId).indexOf(gekozen) >= 0) delen.push("Ze grenzen aan elkaar.");
  }
  if (r && r.relatie === "provinciehoofdstad-van") {
    var vanGekozen = relaties("provinciehoofdstad-van").filter(function(x) { return x.van === gekozen; })[0];
    var naarGekozen = relaties("provinciehoofdstad-van").filter(function(x) { return x.naar === gekozen; })[0];
    if (vanGekozen) delen.push(B + " is de hoofdstad van " + naamVan(vanGekozen.naar) + ".");
    else if (naarGekozen) delen.push("De hoofdstad van " + B + " is " + naamVan(naarGekozen.van) + ".");
  }
  return delen.length ? delen.join(" ") : null;
}
