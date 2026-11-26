// Het water van Nederland uit de landelijke KRW-oppervlaktewaterlichamen (plan T5b par. 3.2, B7 en B8; plan T1 par. 2.1).
// Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=6000 maak-water-nl.mjs <INSPIRESurfaceWaterBody.gml> <top10nl-waterdeel-t5b2.json> <uitvoermap>
// - T5b-2, tweede ronde: de wateren die in KRW samengevoegd zijn of ontbreken, uit BRT TOP10NL (alle waterdelen met de naam uit
//   de tabel); stopt als een deel tot aan de rand van het doorzochte gebied loopt (dan kan er een deel ontbreken);
// - controleert de SHA-256 van de GML en van water-nl.json tegen het register in bronnen.json;
// - per item de KRW-lichamen uit de tabel: elk lichaam bestaat precies een keer, met precies de naam uit de tabel; geen lichaam
//   wordt twee keer gebruikt; de geometrie past bij de soort (rivier: lijn; zee, meer, zeearm: vlak) en het KRW-type ook
//   (rivier: riverWaterBody; meer: lakeWaterBody; zeearm: transitionalWaterBody of coastalWaterBody; zee: coastalWaterBody);
// - een item uit twee lichamen: de vereniging (besluit in de tabel), gemeld in de GEOREF;
// - feiten: de beheerder (bron KRW); een meer en een zeearm liggen in Nederland (de landelijke set van Nederland); een zee en een
//   rivier zijn internationaal water, zonder landrelatie (zoals water-nlbe.js);
// - schrijft items/water-nl.js; twee keer draaien geeft een byte-gelijk bestand.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { openBron } from "./bronnen/bron.mjs";
import { leesKrwGml } from "./bronnen/lees-gml-krw.mjs";
import { leesTop10, doorzocht } from "./bronnen/lees-top10.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var KRWB = BRONNEN.krwOppervlaktewaterlichamen, T10 = BRONNEN.top10nlWaterdeel, REG = BRONNEN.register.ids;
// een punt van een waterdeel moet minstens zoveel graden (ongeveer 50 m) binnen het doorzochte gebied liggen
export var MARGE_TOP10 = 0.0005;
export var GEOM_PER_SOORT = { rivier: "lijn", zee: "vlak", meer: "vlak", zeearm: "vlak" };
export var KRW_TYPE_PER_SOORT = { rivier: ["riverWaterBody"], zee: ["coastalWaterBody"], meer: ["lakeWaterBody"], zeearm: ["transitionalWaterBody", "coastalWaterBody"] };

function fout(t) { throw new Error(t); }

export function openKrw(pad) {
  var b = openBron(pad, "KRW", KRWB.gml.bestand);
  if (b.sha256 !== KRWB.gml.sha256) fout("SHA-256 van de KRW-GML wijkt af van krwOppervlaktewaterlichamen");
  var K = leesKrwGml(b.buf);
  if (K.records.length !== KRWB.gml.features || K.crs !== KRWB.gml.crs) fout("KRW: onverwacht aantal lichamen of CRS");
  var per = {}; K.records.forEach(function(r) { per[r.kenmerken.localId] = r; });
  return { sha: b.sha256, records: K.records, per: per };
}

export function openTop10(pad) {
  var b = openBron(pad, "TOP10", T10.bestand);
  if (b.sha256 !== T10.sha256) fout("SHA-256 van de TOP10NL-bundel wijkt af van top10nlWaterdeel");
  var R = leesTop10(b.buf);
  // een kader met een ontbrekende pagina telt niet als doorzocht (zie lees-top10.mjs); de waterdelen erop worden wel gelezen
  var per = {}; R.records.forEach(function(r) { per[r.kenmerken.lokaal_id] = r; });
  return { sha: b.sha256, records: R.records, per: per, kaders: R.kaders, onvolledig: R.onvolledig };
}

export function bouw(paden) {
  var K = openKrw(paden.gml), D = openTop10(paden.top10);
  var tab = openBron(path.join(HIER, "water-nl.json"), "tabellenNlbe", "tools/topo/water-nl.json");
  if (REG.tabellenNlbe.bestanden["tools/topo/water-nl.json"] !== tab.sha256) fout("SHA-256 van water-nl.json wijkt af van het register");
  var T = JSON.parse(tab.buf.toString("utf8"));
  var bronKrw = { id: "KRW", bestand: KRWB.gml.bestand, sha256: KRWB.gml.sha256, versie: KRWB.gml.versie, gedownload: KRWB.gedownload };
  var bronTop10 = { id: "TOP10", bestand: T10.bestand, sha256: T10.sha256, opgehaald: T10.opgehaald };
  var gebruikt = {}, namen = {};
  var ITEMS = Object.keys(T.water).sort().map(function(id) {
    var t = T.water[id];
    if (!GEOM_PER_SOORT[t.soort]) fout("onbekende soort: " + t.soort);
    // T5b-2: een brede benedenrivier als vlak (besluitRivierVlak); anders de vorm van de soort
    var vorm = t.vorm || GEOM_PER_SOORT[t.soort];
    if (t.vorm && (t.soort !== "rivier" || t.vorm !== "vlak")) fout("alleen een rivier kan als vlak: " + id);
    if (!!t.krw === !!t.top10) fout("item met precies een bron (krw of top10): " + id);
    if (namen[t.soort + "|" + t.naam]) fout("naam twee keer: " + t.naam); namen[t.soort + "|" + t.naam] = 1;
    var it = { id: id, soort: t.soort, naam: null, feiten: {}, geometrie: null, relaties: [] };
    var bron;
    if (t.krw) {
      var ids = Object.keys(t.krw).sort(), beheerders = {};
      if (!ids.length) fout("item zonder KRW-lichaam: " + id);
      ids.forEach(function(k) {
        var r = K.per[k] || fout("KRW: geen lichaam " + k);
        if (r.kenmerken.naam !== t.krw[k]) fout("KRW: " + k + " heet " + r.kenmerken.naam + ", niet " + t.krw[k]);
        if (gebruikt[k]) fout("KRW: " + k + " twee keer gebruikt (" + gebruikt[k] + ", " + id + ")"); gebruikt[k] = id;
        if (r.soort !== vorm) fout("KRW: " + k + " is een " + r.soort + ", " + id + " vraagt een " + vorm);
        if (KRW_TYPE_PER_SOORT[t.soort].concat(t.vorm ? ["transitionalWaterBody"] : []).indexOf(r.kenmerken.type) < 0) fout("KRW: " + k + " heeft type " + r.kenmerken.type + ", past niet bij " + t.soort);
        beheerders[r.kenmerken.beheerder || fout("KRW: " + k + " zonder beheerder")] = 1;
      });
      var krwNamen = ids.map(function(k) { return t.krw[k]; });
      it.naam = { waarde: t.naam, varianten: ids.length === 1 && krwNamen[0] !== t.naam && !t.besluit ? [krwNamen[0]] : [], herkomst: "besluit", status: "vastgesteld", besluit: T.naamBesluit, controle: { id: "KRW", waarde: krwNamen.join("; ") } };
      it.geometrie = { bron: { bronId: "KRW", bestand: KRWB.gml.bestand, sha256: KRWB.gml.sha256, sleutel: "localId", waarden: ids, crs: KRWB.gml.crs }, kaart: {} };
      if (ids.length > 1) it.geometrie.bron.aggregatie = "de vereniging van deze " + ids.length + " KRW-lichamen (" + krwNamen.join(", ") + "); besluit in tools/topo/water-nl.json (besluitSamen)";
      var bh = Object.keys(beheerders).sort();
      it.feiten.beheerder = { waarde: bh.length === 1 ? bh[0] : bh, herkomst: "bron", status: "vastgesteld", bron: bronKrw };
      if (ids.length > 1) it.feiten.samengesteld = { waarde: ids.length, herkomst: "besluit", status: "vastgesteld", besluit: T.besluitSamen };
      if (t.besluit) it.feiten.afbakening = { waarde: krwNamen.join("; "), herkomst: "besluit", status: "vastgesteld", besluit: T[t.besluit] || fout("onbekend besluit: " + t.besluit) };
      bron = bronKrw;
    } else {
      // TOP10NL: alle waterdelen met precies deze naam (naamnl); elk punt ervan ligt in het doorzochte gebied (dus geen deel gemist)
      var gb = t.gebied || fout("TOP10-item zonder gebied: " + id);
      function inGebied(r) { var c = r.delen[0][0][0]; return c[0] >= gb[0] && c[0] <= gb[2] && c[1] >= gb[1] && c[1] <= gb[3]; }
      var delen = D.records.filter(function(r) { return t.top10.indexOf(r.kenmerken.naamnl) >= 0 && inGebied(r); });
      var elders = D.records.filter(function(r) { return t.top10.indexOf(r.kenmerken.naamnl) >= 0 && !inGebied(r); }).length;
      t.top10.forEach(function(n) { if (!delen.some(function(r) { return r.kenmerken.naamnl === n; })) fout("TOP10: geen waterdeel met de naam " + n); });
      delen.forEach(function(r) {
        var k = r.kenmerken.lokaal_id;
        if (gebruikt[k]) fout("TOP10: " + k + " twee keer gebruikt"); gebruikt[k] = id;
        r.delen.forEach(function(p) { p[0].forEach(function(c) { if (!doorzocht(c, D.kaders, MARGE_TOP10)) fout("TOP10: " + id + " loopt door buiten het doorzochte gebied bij " + c.join(",")); }); });
      });
      var lid = delen.map(function(r) { return r.kenmerken.lokaal_id; }).sort();
      var types = {}; delen.forEach(function(r) { types[r.kenmerken.typewater || fout("TOP10: waterdeel zonder typewater")] = 1; });
      it.naam = { waarde: t.naam, varianten: [], herkomst: "besluit", status: "vastgesteld", besluit: T.naamBesluit, controle: { id: "TOP10", waarde: t.top10.join("; ") } };
      it.geometrie = { bron: { bronId: "TOP10", bestand: T10.bestand, sha256: T10.sha256, sleutel: "lokaal_id", waarden: lid, crs: "CRS84",
        aggregatie: "alle " + lid.length + " waterdelen met naamnl " + t.top10.join(" of ") + " in het gebied " + gb.join(",") + "; besluit in tools/topo/water-nl.json (besluitTop10)" }, kaart: {} };
      it.feiten.typewater = { waarde: Object.keys(types).sort(), herkomst: "bron", status: "vastgesteld", bron: bronTop10 };
      it.feiten.afbakening = { waarde: "TOP10NL naamnl: " + t.top10.join(", ") + "; gebied " + gb.join(",") + (elders ? "; " + elders + " waterdelen met dezelfde naam elders" : ""), herkomst: "besluit", status: "vastgesteld", besluit: T.besluitTop10 };
      bron = bronTop10;
    }
    if (t.vorm) { it.geometrie.bron.vorm = t.vorm; it.feiten.vorm = { waarde: t.vorm, herkomst: "besluit", status: "vastgesteld", besluit: T.besluitRivierVlak }; }
    if (t.grensgebied) it.feiten.grensgebied = { waarde: t.grensgebied.landen, herkomst: "besluit", status: "vastgesteld", besluit: T[t.grensgebied.besluit] || fout("onbekend besluit: " + t.grensgebied.besluit) };
    else if (t.soort === "meer" || t.soort === "zeearm") it.feiten.land = { waarde: "NLD", herkomst: "bron", status: "vastgesteld", bron: bron };
    return it;
  });
  return { ITEMS: ITEMS };
}

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "water-nl.js"), "// GEGENEREERD door tools/topo/maak-water-nl.mjs uit tools/topo/water-nl.json, de landelijke KRW-oppervlaktewaterlichamen en BRT TOP10NL (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" + regel("WATER_NL", r.ITEMS));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = bouw({ gml: process.argv[2], top10: process.argv[3] });
  schrijf(process.argv[4], r);
  console.log(JSON.stringify(r.ITEMS.map(function(i) { return i.id + " " + i.geometrie.bron.waarden.join("+"); })));
}
