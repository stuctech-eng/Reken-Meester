// De vier taalgebieden van Belgie (plan T5b par. 3.8, B6; plan T1 par. 2.2). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-taalgebieden-be.mjs <TU_COM_REFNIS.txt> <sectoren.geojson> <uitvoermap>
// - controleert de SHA-256 van de bronbestanden en van taalgebieden-be.json tegen het register in bronnen.json;
// - past de regel van de taalwet (art. 3 tot en met 6) toe op de gemeenten van de Statbel-sectoren:
//   Nederlands  = de provincies en arrondissementen van art. 3 (namen gezocht in REFNIS);
//   Duits       = de gemeenten met een deelgemeente uit art. 5, gezocht in de provincie Luik (spelling als besluit in de tabel);
//   Frans       = de provincies en het arrondissement van art. 4, zonder de Duitse gemeenten;
//   Brussel     = de 19 gemeenten van art. 6 (namen gezocht in de sectoren), gelijk aan hun arrondissement;
// - stopt bij elke afwijking: elke gemeente in precies een taalgebied, elke naam van de wet precies gevonden;
// - maakt items/taalgebieden.js; de geometrie is een verwijzing (GEOREF) naar de sectoren van de gemeenten;
// - twee keer draaien geeft een byte-gelijk bestand.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { openBron } from "./bronnen/bron.mjs";
import { leesGeojson } from "./bronnen/lees-geojson.mjs";
import { leesRefnis } from "./maak-bestuur-nlbe.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var SCRIPT = "tools/topo/maak-taalgebieden-be.mjs";
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var STB = BRONNEN.statbel;
var BESLUIT_NAMEN = "T1 par. 2.2: de namen van de vier taalgebieden (Nederlands taalgebied, Frans taalgebied, Duits taalgebied, tweetalig gebied Brussel-Hoofdstad)";

function fout(t) { throw new Error(t); }
function uniek(a) { var u = []; a.forEach(function(x) { if (u.indexOf(x) < 0) u.push(x); }); return u.sort(); }
// hoofdletters zonder accenten, in woorden (koppeltekens, spaties, sterretjes en haakjes scheiden)
export function woorden(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().split(/[^A-Z]+/).filter(function(w) { return w.length; }); }
// komt de reeks woorden w aaneengesloten voor in de reeks z?
export function bevat(z, w) { for (var i = 0; i + w.length <= z.length; i++) { var ok = true; for (var j = 0; j < w.length; j++) if (z[i + j] !== w[j]) { ok = false; break; } if (ok) return true; } return false; }
function plat(s) { return woorden(s).join(""); }

export function leesGemeenten(buf) {
  var g = leesGeojson(buf, ["cd_sector", "cd_sub_munty", "tx_sub_munty_nl", "cd_munty_refnis", "tx_munty_descr_nl", "cd_dstr_refnis", "cd_prov_refnis", "cd_rgn_refnis"]);
  if (g.crs !== "EPSG:3812") fout("sectoren: onverwacht CRS " + g.crs);
  var gem = {};
  g.records.forEach(function(r) {
    var k = r.kenmerken, c = k.cd_munty_refnis;
    var x = gem[c] || (gem[c] = { code: c, naam: k.tx_munty_descr_nl, dstr: k.cd_dstr_refnis, prov: k.cd_prov_refnis, rgn: k.cd_rgn_refnis, deel: {} });
    if (x.naam !== k.tx_munty_descr_nl || x.dstr !== k.cd_dstr_refnis || x.prov !== k.cd_prov_refnis || x.rgn !== k.cd_rgn_refnis) fout("sectoren: gemeente " + c + " met twee namen, arrondissementen, provincies of gewesten");
    if (x.deel[k.cd_sub_munty] !== undefined && x.deel[k.cd_sub_munty] !== k.tx_sub_munty_nl) fout("sectoren: deelgemeente " + k.cd_sub_munty + " met twee namen");
    x.deel[k.cd_sub_munty] = k.tx_sub_munty_nl;
  });
  return gem;
}

export function deel(T, RF, gem) {
  var codes = Object.keys(gem).sort();
  // elke gemeente uit de sectoren staat in REFNIS, met hetzelfde arrondissement en dezelfde provincie
  codes.forEach(function(c) {
    var k = RF.keten(c).map(function(r) { return r.code; });
    if (k.indexOf(gem[c].dstr) < 0 || (gem[c].prov && k.indexOf(gem[c].prov) < 0) || k.indexOf(gem[c].rgn) < 0) fout("sectoren en REFNIS: andere keten voor " + c);
  });
  function opNaam(niveau, voor, n) {
    var x = Object.keys(RF.geldig).map(function(c) { return RF.geldig[c]; }).filter(function(r) { return r.niveau === niveau && r.nl === voor + n; });
    return x.length === 1 ? x[0].code : fout("REFNIS: geen unieke " + voor + n);
  }
  function volgensRegel(g) {
    var pv = g.provincies.map(function(n) { return opNaam(2, "Provincie ", n); }), ar = g.arrondissementen.map(function(n) { return opNaam(3, "Arrondissement ", n); });
    return codes.filter(function(c) { return pv.indexOf(gem[c].prov) >= 0 || ar.indexOf(gem[c].dstr) >= 0; });
  }
  var G = T.gebieden, per = {};
  // Duits (art. 5): de gemeenten van voor 1977 zijn deelgemeenten
  var D = G["taalgebied-be-de"], luik = opNaam(2, "Provincie ", D.binnenProvincie), gevonden = {}, perWet = {};
  D.deelgemeenten.forEach(function(wn) {
    var vormen = (D.spelling[wn] || [wn]).map(woorden), treffers = [];
    codes.filter(function(c) { return gem[c].prov === luik; }).forEach(function(c) {
      Object.keys(gem[c].deel).sort().forEach(function(d) { var z = woorden(gem[c].deel[d]); if (vormen.some(function(v) { return bevat(z, v); })) { treffers.push(d); gevonden[d] = c; } });
    });
    if (!treffers.length) fout("art. 5: geen deelgemeente voor " + wn);
    perWet[wn] = treffers;
  });
  per["taalgebied-be-de"] = uniek(Object.keys(gevonden).map(function(d) { return gevonden[d]; }));
  // elke deelgemeente van die gemeenten komt uit art. 5
  per["taalgebied-be-de"].forEach(function(c) { Object.keys(gem[c].deel).forEach(function(d) { if (!gevonden[d]) fout("art. 5: deelgemeente " + d + " (" + gem[c].deel[d] + ") van " + c + " staat niet in de wet"); }); });
  per["taalgebied-be-nl"] = volgensRegel(G["taalgebied-be-nl"]);
  per["taalgebied-be-fr"] = volgensRegel(G["taalgebied-be-fr"]).filter(function(c) { return per[G["taalgebied-be-fr"].behalve].indexOf(c) < 0; });
  // Brussel-Hoofdstad (art. 6): 19 gemeenten op naam, samen precies hun arrondissement
  var B = G["taalgebied-be-bru"];
  per["taalgebied-be-bru"] = uniek(B.gemeenten.map(function(n) { var x = codes.filter(function(c) { return plat(gem[c].naam) === plat(n); }); return x.length === 1 ? x[0] : fout("art. 6: geen unieke gemeente " + n); }));
  if (per["taalgebied-be-bru"].length !== 19) fout("art. 6: niet 19 gemeenten");
  var arB = uniek(per["taalgebied-be-bru"].map(function(c) { return gem[c].dstr; }));
  if (arB.length !== 1 || codes.filter(function(c) { return gem[c].dstr === arB[0]; }).length !== 19) fout("art. 6: de gemeenten zijn niet precies een arrondissement");
  // elke gemeente in precies een taalgebied
  codes.forEach(function(c) { var n = Object.keys(per).filter(function(t) { return per[t].indexOf(c) >= 0; }).length; if (n !== 1) fout("gemeente " + c + " (" + gem[c].naam + ") in " + n + " taalgebieden"); });
  return { per: per, perWet: perWet };
}

export async function bouw(paden) {
  var refnisBron = openBron(paden.refnis, "STB", STB.refnis.txt.bestand);
  if (refnisBron.sha256 !== STB.refnis.txt.sha256) fout("SHA-256 van REFNIS wijkt af van statbel.refnis");
  var sectBron = openBron(paden.sectoren, "STB", STB.sectoren.geojson.bestand);
  if (sectBron.sha256 !== STB.sectoren.geojson.sha256) fout("SHA-256 van de sectoren wijkt af van statbel.sectoren");
  var tBron = openBron(path.join(HIER, "taalgebieden-be.json"), "tabellenNlbe", "tools/topo/taalgebieden-be.json");
  var reg = BRONNEN.register.ids;
  if (reg.tabellenNlbe.bestanden["tools/topo/taalgebieden-be.json"] !== tBron.sha256) fout("SHA-256 van taalgebieden-be.json wijkt af van het register");
  var T = JSON.parse(tBron.buf.toString("utf8"));
  if (reg.OV.bestanden[T.bron.bestand] !== T.bron.sha256) fout("de taalwet staat niet met deze SHA-256 in het register (OV)");
  var RF = leesRefnis(refnisBron.buf), gem = leesGemeenten(sectBron.buf), d = deel(T, RF, gem);
  function ovBron(artikel, passage) { return { id: "OV", uitgever: T.bron.uitgever, document: T.bron.document + ", " + artikel, url: T.bron.url, bestand: T.bron.bestand, sha256: T.bron.sha256, passage: passage, geraadpleegd: T.bron.geraadpleegd }; }
  var invoer = [{ bronId: "tabellenNlbe", sha256: tBron.sha256 }, { bronId: "OV", sha256: T.bron.sha256 }, { bronId: "STB", sha256: refnisBron.sha256 }, { bronId: "STB", sha256: sectBron.sha256 }];
  var ITEMS = Object.keys(T.gebieden).sort().map(function(id) {
    var g = T.gebieden[id], codes = d.per[id];
    return {
      id: id, soort: "taalgebied",
      naam: { waarde: g.naam, varianten: g.varianten, herkomst: "besluit", status: "vastgesteld", besluit: BESLUIT_NAMEN, controle: { id: "OV", waarde: g.wet } },
      feiten: {
        land: { waarde: "BEL", herkomst: "bron", status: "vastgesteld", bron: ovBron(T.indeling.artikel, T.indeling.passage) },
        aantalGemeenten: { waarde: codes.length, herkomst: "afgeleid", status: "vastgesteld",
          afleiding: { script: SCRIPT, invoer: invoer, regel: "de gemeenten volgens de taalwet, " + g.artikel + " (passage in taalgebieden-be.json" + (g.besluit ? "; spelling als besluit" : "") + "), toegepast op Statbel REFNIS (geldig op 2026-01-01) en de gemeenten van de statistische sectoren " + STB.sectoren.situatie + " (gemeentegrenzen " + STB.sectoren.gemeentegrenzen + "); elke gemeente in precies een taalgebied" } }
      },
      geometrie: { bron: { bronId: "STB", bestand: STB.sectoren.geojson.bestand, sha256: STB.sectoren.geojson.sha256, sleutel: "cd_munty_refnis", waarden: codes, crs: STB.sectoren.geojson.crs, aggregatie: "de vereniging van de statistische sectoren van deze gemeenten", situatie: STB.sectoren.situatie }, kaart: {} },
      relaties: []
    };
  });
  return { ITEMS: ITEMS, perWet: d.perWet };
}

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "taalgebieden.js"), "// GEGENEREERD door tools/topo/maak-taalgebieden-be.mjs uit tools/topo/taalgebieden-be.json (de taalwet van 1966), Statbel REFNIS en de statistische sectoren 2024 (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" + regel("TAALGEBIEDEN", r.ITEMS));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = await bouw({ refnis: process.argv[2], sectoren: process.argv[3] });
  schrijf(process.argv[4], r);
  console.log(JSON.stringify(r.ITEMS.map(function(i) { return [i.id, i.feiten.aantalGemeenten.waarde]; })));
}
