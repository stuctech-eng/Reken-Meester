// De 194 landen: namen, hoofdsteden, codes en werelddelen (plan T2b §1.3 A en §5). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-landen.mjs <countries.json van world-countries 5.1.0> <uitvoermap>
// Invoer (vastgelegd in tools/topo/bron/, per regel overgenomen met de leesfunctie; zie bronnen.json):
// - taalunie-landen.tsv: per land de velden van de landpagina van de Taalunie (TU);
// - m49-regio.txt: per code het werelddeel en de groep volgens VN M49;
// - vn-lidstaten.json: de 194 (UN), met de koppeling aan Natural Earth en de slug van de TU-pagina.
// world-countries (WC) is alleen controle: het levert geen enkele waarde.
// Schrijft items/landen.js; twee keer draaien geeft een byte-gelijk bestand.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var WC_BESTAND = process.argv[2];
var UIT = process.argv[3];
var bronnen = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var VN = JSON.parse(fs.readFileSync(path.join(HIER, "vn-lidstaten.json"), "utf8"));

function sha(buf) { return crypto.createHash("sha256").update(buf).digest("hex"); }
function leesBron(naam) {
  var buf = fs.readFileSync(path.join(HIER, "bron", naam));
  if (sha(buf) !== bronnen.lijsten[naam].sha256) throw new Error("SHA-256 klopt niet voor bron/" + naam);
  return buf.toString("utf8");
}
var wcBuf = fs.readFileSync(WC_BESTAND);
if (sha(wcBuf) !== bronnen.worldCountries.countriesJson) throw new Error("SHA-256 klopt niet voor countries.json");
var WC = JSON.parse(wcBuf.toString("utf8"));

// De 12 bijzondere gevallen (plan T1 §3.6): geen automatische hoofdstad; een aparte lijst per rol (OV), ter beoordeling.
var BIJZONDER = ["BDI", "BEN", "BOL", "CIV", "IDN", "ISR", "LKA", "MYS", "NLD", "NRU", "SWZ", "ZAF"];
// De zes aanvullende Aziatische landen in de modus Europa (plan T2b §0.2, D7-a)
var MODUS_EUROPA = ["ARM", "AZE", "CYP", "GEO", "KAZ", "TUR"];
var WERELDDEEL = { Africa: "Afrika", Americas: "Amerika", Asia: "Azië", Europe: "Europa", Oceania: "Oceanië" };
// Landen waarvoor de TU meer dan een Nederlandse naam geeft. De keuze volgt de aantekeningen op de TU-pagina
// (bron/taalunie-landen.tsv, kolom opmerking_naam): een naam die "vrijwel alleen in Vlaanderen / Nederland gebruikelijk" is,
// wordt een variant met dat gebied; een naam die de TU "de meest gebruikte vorm" noemt, wordt de voorkeursnaam.
// Waar de TU geen aanwijzing geeft, is de keuze een besluit (besluit: ...), vastgelegd op de open lijst.
// De test controleert dat deze tabel precies de namen van de TU bevat.
var MEER_NAMEN = {
  BLR: { voorkeur: "Wit-Rusland", varianten: [["Belarus", null]], besluit: "GPT 17-11-2026: Wit-Rusland (de meest gebruikte vorm buiten officiele teksten), Belarus als variant" },
  BOL: { voorkeur: "Bolivia", varianten: [["Bolivië", "Vlaanderen"]], open: false },
  GBR: { voorkeur: "Verenigd Koninkrijk", varianten: [["Groot-Brittannië", null]], besluit: "GPT 17-11-2026: Verenigd Koninkrijk (de landnaam; Groot-Brittannie is ook het eiland), Groot-Brittannie als variant" },
  MDV: { voorkeur: "Malediven", varianten: [["Maldiven", null]], open: false },
  SAU: { voorkeur: "Saoedi-Arabië", varianten: [["Saudi-Arabië", null]], besluit: "GPT 17-11-2026: Saoedi-Arabie, Saudi-Arabie als variant" },
  SDN: { voorkeur: "Soedan", varianten: [["Sudan", "Nederland"]], open: false },
  SSD: { voorkeur: "Zuid-Soedan", varianten: [["Zuid-Sudan", "Nederland"]], open: false },
  SVK: { voorkeur: "Slowakije", varianten: [["Slovakije", "Vlaanderen"]], open: false },
  UGA: { voorkeur: "Oeganda", varianten: [["Uganda", "Nederland"]], open: false }
};

// Twee landen met dezelfde TU-naam (Congo). De naam ter onderscheiding staat letterlijk in de opmerking op de TU-pagina;
// hij wordt de getoonde naam, "Congo" blijft een variant. De id (ISO alpha-3) staat hier los van (besluit GPT 17-11-2026).
var ONDERSCHEIDING = { COG: "Congo-Brazzaville", COD: "Congo-Kinshasa" };
// Hoofdsteden die een gewone TU-hoofdstad blijven, maar nog met een officiele bron (OV) worden nagekeken, in de deelstap
// van de bijzondere gevallen (besluit GPT 17-11-2026). Ze tellen mee bij de 182 gewone hoofdsteden.
var TE_VERIFIEREN = { GNQ: "Ciudad de la Paz is bij decreet van januari 2026 tot hoofdstad verklaard; de verplaatsing van de overheidsdiensten mocht nog tot een jaar duren. Wettelijke hoofdstad en feitelijke regeringszetel nakijken met OV" };

function leeg(v) { return v === "-" || v === "" ? null : v; }
function lijst(v) { return leeg(v) ? v.split(" ; ").map(function(x) { return x.trim(); }) : []; }

var TU = {};
leesBron("taalunie-landen.tsv").trim().split("\n").slice(1).forEach(function(r) {
  var k = r.split("\t");
  TU[k[0]] = { naam: lijst(k[1]), opmNaam: leeg(k[2]), hoofdstad: lijst(k[4]), altHoofdstad: lijst(k[5]), opmHoofdstad: leeg(k[6]), iso2: leeg(k[7]), iso3: leeg(k[8]), isoN: leeg(k[9]) };
});
var M49 = {};
leesBron("m49-regio.txt").trim().split("\n").slice(1).forEach(function(r) { var k = r.split("|"); M49[k[0]] = { regio: k[1], groep: k[2], middengroep: leeg(k[3]) }; });

var tuBron = function(slug) { return { id: "TU", url: bronnen.lijsten["taalunie-landen.tsv"].basisUrl + slug, geraadpleegd: bronnen.lijsten["taalunie-landen.tsv"].geraadpleegd, peildatum: null }; };
var m49Bron = { id: "M49", url: bronnen.lijsten["m49-regio.txt"].url, geraadpleegd: bronnen.lijsten["m49-regio.txt"].geraadpleegd, peildatum: null };
var unBron = { id: "UN", url: VN.bron.url, geraadpleegd: VN.bron.geraadpleegd, peildatum: VN.bron.paginaGewijzigd };

var wcPer = {};
WC.forEach(function(w) { wcPer[w.cca3] = w; });
function norm(s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, ""); }

var AFWIJKINGEN = [];
function afw(id, soort, tekst, gegevens) { AFWIJKINGEN.push({ id: id, soort: soort, tekst: tekst, gegevens: gegevens || null }); }

function kiesNaam(t, id) {
  var k = MEER_NAMEN[id];
  if (!k) { if (t.naam.length !== 1) throw new Error("meer namen zonder regel in MEER_NAMEN: " + id); return { voorkeur: t.naam[0], varianten: [], open: false }; }
  var tuSet = t.naam.slice().sort().join("|"), tabel = [k.voorkeur].concat(k.varianten.map(function(v) { return v[0]; })).sort().join("|");
  if (tuSet !== tabel) throw new Error("MEER_NAMEN wijkt af van de TU voor " + id);
  return { voorkeur: k.voorkeur, varianten: k.varianten.map(function(v) { return { naam: v[0], gebied: v[1] }; }), besluit: k.besluit || null };
}
function metOnderscheiding(n, t, id) {
  var o = ONDERSCHEIDING[id];
  if (!o) return n;
  if ((t.opmNaam || "").indexOf("‘" + o + "’") < 0) throw new Error("naam ter onderscheiding staat niet in de TU-opmerking: " + id);
  return { voorkeur: o, varianten: [{ naam: n.voorkeur, gebied: null }].concat(n.varianten), besluit: "GPT 17-11-2026: " + o + " (de TU-naam ter onderscheiding), Congo als variant", tuNaam: n.voorkeur };
}
// dubbele namen worden bepaald op de TU-namen zelf, voor de onderscheiding
var tuPerNaam = {};
VN.landen.forEach(function(l) { var n = kiesNaam(TU[l.tu], l.wc || l.ne); (tuPerNaam[n.voorkeur] = tuPerNaam[n.voorkeur] || []).push(l.wc || l.ne); });

var LANDEN = VN.landen.map(function(l) {
  var id = l.wc || l.ne, t = TU[l.tu], m = M49[id], w = wcPer[id];
  if (!t) throw new Error("geen TU-regel voor " + id);
  if (!m) throw new Error("geen M49-regel voor " + id);
  var bijzonder = BIJZONDER.indexOf(id) >= 0;
  var n = metOnderscheiding(kiesNaam(t, id), t, id);
  var rec = {
    id: id,
    vn: { waarde: l.vn, bron: unBron },
    ne: l.ne,
    naam: { waarde: n.voorkeur, varianten: n.varianten, opmerking: t.opmNaam, besluit: n.besluit, bron: tuBron(l.tu) },
    hoofdstad: bijzonder
      ? { bijzonder: true, waarde: null, tu: { hoofdstad: t.hoofdstad, opmerking: t.opmHoofdstad }, bron: tuBron(l.tu) }
      : { bijzonder: false, waarde: t.hoofdstad[0], varianten: t.hoofdstad.slice(1).concat(t.altHoofdstad), opmerking: t.opmHoofdstad, teVerifieren: TE_VERIFIEREN[id] || null, bron: tuBron(l.tu) },
    // alpha-3 uniform uit M49 (besluit GPT 17-11-2026); alpha-2 en numeriek uit de TU; de alpha-3 van de TU is alleen controle
    iso: {
      alpha3: { waarde: id, bron: m49Bron, controle: { id: "TU", waarde: t.iso3, uitkomst: t.iso3 === id ? "gelijk" : "afwijkend, zie open lijst" } },
      alpha2: { waarde: t.iso2, bron: tuBron(l.tu) },
      numeriek: { waarde: t.isoN ? Number(t.isoN) : null, bron: tuBron(l.tu) }
    },
    werelddeel: { waarde: WERELDDEEL[m.regio], m49: m.regio, groep: m.groep, middengroep: m.middengroep, bron: m49Bron },
    modusEuropa: MODUS_EUROPA.indexOf(id) >= 0
  };
  // ---- controles ----
  if (t.iso3 !== id) afw("iso-" + id, "iso", "TU geeft als ISO alpha-3 " + (t.iso3 || "niets") + "; M49 (de bron van het veld) en WC geven " + id + (t.iso2 ? "" : "; alpha-2 en numeriek staan niet op de TU-pagina en blijven leeg"), { tu: t.iso3, m49: id, wc: w ? w.cca3 : null });
  if (w && t.iso2 && t.iso2 !== w.cca2) afw("iso2-wc-" + id, "iso", "ISO alpha-2: TU " + t.iso2 + ", WC " + w.cca2);
  if (w && t.isoN && Number(t.isoN) !== Number(w.ccn3)) afw("ison-wc-" + id, "iso", "ISO numeriek: TU " + t.isoN + ", WC " + w.ccn3);
  if (w) {
    var wNaam = w.translations && w.translations.nld ? w.translations.nld.common : null;
    if (wNaam !== n.voorkeur) {
      var alsVariant = n.varianten.some(function(v) { return v.naam === wNaam; });
      afw("naam-wc-" + id, alsVariant ? "naam-variant" : "naam", "naam: TU " + n.voorkeur + (n.varianten.length ? " (varianten: " + n.varianten.map(function(v) { return v.naam; }).join(", ") + ")" : "") + ", WC " + wNaam, { tu: n.voorkeur, wc: wNaam });
    }
    if (!bijzonder) {
      var tuH = [rec.hoofdstad.waarde].concat(rec.hoofdstad.varianten).map(norm), wcH = (w.capital || []).map(norm);
      if (!wcH.some(function(c) { return tuH.indexOf(c) >= 0; })) afw("hoofdstad-wc-" + id, "hoofdstad", "hoofdstad: TU " + rec.hoofdstad.waarde + ", WC " + (w.capital || []).join(", "), { tu: rec.hoofdstad.waarde, wc: w.capital || [] });
    }
    var wcDeel = { Africa: "Afrika", Americas: "Amerika", Asia: "Azië", Europe: "Europa", Oceania: "Oceanië" }[w.region];
    if (wcDeel !== rec.werelddeel.waarde) afw("werelddeel-wc-" + id, "werelddeel", "werelddeel: M49 " + rec.werelddeel.waarde + ", WC " + w.region + " (" + w.subregion + ")");
  }
  if (MEER_NAMEN[id] && MEER_NAMEN[id].besluit) afw("naam-voorkeur-" + id, "naam-voorkeur", "TU noemt de namen zonder voorkeur; besloten: " + MEER_NAMEN[id].besluit);
  if (bijzonder) afw("bijzonder-" + id, "bijzonder", "bijzonder geval (T1 §3.6): geen automatische hoofdstad; TU: " + t.hoofdstad.join(", ") + (t.opmHoofdstad ? " (" + t.opmHoofdstad + ")" : ""));
  if (t.opmNaam && t.opmNaam.indexOf("[ingekort") >= 0) afw("ingekort-naam-" + id, "ingekort", "de opmerking bij de naam is door de leesfunctie ingekort");
  if (t.opmHoofdstad && (t.opmHoofdstad.indexOf("[ingekort") >= 0 || t.opmHoofdstad.indexOf("[…]") >= 0)) afw("ingekort-hoofdstad-" + id, "ingekort", "de opmerking bij de hoofdstad is door de leesfunctie ingekort");
  return rec;
});
// dezelfde voorkeursnaam voor twee landen (Congo): de TU geeft in de opmerking een naam ter onderscheiding; de keuze is open
Object.keys(tuPerNaam).sort().forEach(function(n) { if (tuPerNaam[n].length > 1) afw("naam-dubbel-" + tuPerNaam[n].join("-"), "naam-dubbel", "de TU geeft " + tuPerNaam[n].join(" en ") + " dezelfde naam " + n + "; getoond wordt " + tuPerNaam[n].map(function(c) { return ONDERSCHEIDING[c] || n; }).join(" en ") + " (de TU-namen ter onderscheiding)"); });
var perNaam = {};
LANDEN.forEach(function(r) { (perNaam[r.naam.waarde] = perNaam[r.naam.waarde] || []).push(r.id); });
Object.keys(perNaam).forEach(function(n) { if (perNaam[n].length > 1) throw new Error("dubbele getoonde naam: " + n); });
AFWIJKINGEN.sort(function(x, y) { return x.id < y.id ? -1 : x.id > y.id ? 1 : 0; });

var TELLING = {};
LANDEN.forEach(function(r) { TELLING[r.werelddeel.waarde] = (TELLING[r.werelddeel.waarde] || 0) + 1; });

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
var tekst = "// GEGENEREERD door tools/topo/maak-landen.mjs uit tools/topo/bron/ (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n" +
  "// Per feit een bron: TU (namen, hoofdsteden, ISO-codes), M49 (werelddeel en groep), UN (de lijst). WC is alleen controle.\n" +
  "// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" +
  regel("TELLING", TELLING) +
  regel("LANDEN", LANDEN) +
  "// verschillen met de controlebron en andere punten voor de open lijst (src/core/topo/open-vragen.md)\n" +
  regel("AFWIJKINGEN_LANDEN", AFWIJKINGEN);
fs.mkdirSync(UIT, { recursive: true });
fs.writeFileSync(path.join(UIT, "landen.js"), tekst);
var soorten = {};
AFWIJKINGEN.forEach(function(a) { soorten[a.soort] = (soorten[a.soort] || 0) + 1; });
console.log(JSON.stringify({ landen: LANDEN.length, telling: TELLING, afwijkingen: AFWIJKINGEN.length, soorten: soorten }));
