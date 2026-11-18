// Zuivere functies voor de kennisbank Topografie: waarde, bewijs, vraagbaarheid en de relatie-index
// (bouwplan T2b-2 fase 6.1 v1.13, par. 3.3, 3.4, 3.6 en 5.1). Alleen voor de kennisbank en de tests, niet voor de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.

import { RELATIES } from "./relaties.js";

export var HERKOMSTEN = ["bron", "afgeleid", "besluit", "onderzoek"];
export var STATUSSEN = ["vastgesteld", "gedeeltelijk", "niet aangetoond", "onzeker", "te verifiëren"];
var NIET_VASTGESTELD = ["gedeeltelijk", "niet aangetoond", "onzeker"];
// toegestane combinaties herkomst x status (par. 3.3)
export function combinatieToegestaan(herkomst, status) {
  if (STATUSSEN.indexOf(status) < 0) return false;
  if (herkomst === "bron" || herkomst === "afgeleid") return true;
  if (herkomst === "besluit") return status === "vastgesteld";
  if (herkomst === "onderzoek") return status !== "vastgesteld";
  return false;
}
// vaste tabel van plaatsen (par. 3.3, 3.6): het pad van een FEIT in een item; nooit geraden
var PLAATSEN = [
  { patroon: /^naam$/, veld: "waarde" },
  { patroon: /^feiten\.vn$/, veld: "waarde" },
  { patroon: /^feiten\.iso\.(alpha3|alpha2|numeriek)$/, veld: "waarde" },
  { patroon: /^feiten\.werelddeel$/, veld: "waarde" },
  { patroon: /^feiten\.hoofdstad$/, veld: "waarde" },
  { patroon: /^feiten\.hoofdstad\.rollen\[[0-9]+\]$/, veld: "stad" },
  { patroon: /^feiten\.hoofdstad\.open\[[0-9]+\]$/, veld: "stad" },
  { patroon: /^feiten\.modusEuropa$/, veld: "waarde" },
  { patroon: /^feiten\.selectie$/, veld: "waarde" },
  { patroon: /^feiten\.cbs$/, veld: "waarde" },
  { patroon: /^feiten\.inwoners$/, veld: "waarde" },
  { patroon: /^feiten\.provincie$/, veld: "waarde" },
  { patroon: /^feiten\.samenstelling$/, veld: "waarde" },
  { patroon: /^geometrie\.punt$/, veld: "lon-lat" },
  { patroon: /^relatie$/, veld: "naar" }
];
export function veldVoorPlaats(plaats) {
  if (typeof plaats !== "string" || !plaats) throw new Error("plaats ontbreekt");
  for (var i = 0; i < PLAATSEN.length; i++) if (PLAATSEN[i].patroon.test(plaats)) return PLAATSEN[i].veld;
  throw new Error("onbekende plaats: " + plaats);
}
// leeg = undefined, null of een tekst die na het weghalen van spaties leeg is; 0, false en een lege lijst zijn niet leeg
export function isLeeg(w) {
  if (w === undefined || w === null) return true;
  if (typeof w === "string") return w.trim() === "";
  return false;
}
export function waardeVan(feit, plaats) {
  var veld = veldVoorPlaats(plaats);
  if (!feit || typeof feit !== "object") return undefined;
  if (veld === "lon-lat") return Number.isFinite(feit.lon) && Number.isFinite(feit.lat) ? [feit.lon, feit.lat] : undefined;
  return feit[veld];
}
var BESLUITVORM = /^(GPT [0-9]{2}-[0-9]{2}-[0-9]{4}|T1 par\. |plan T2b )/;
export function besluitVerwijzing(feit) {
  var a = typeof feit.besluit === "string" && !isLeeg(feit.besluit), b = typeof feit.besluitRegel === "string" && !isLeeg(feit.besluitRegel);
  if (a === b) return null;
  var t = a ? feit.besluit : feit.besluitRegel;
  return BESLUITVORM.test(t) ? t : null;
}
function afleidingCompleet(a) {
  if (!a || typeof a !== "object" || isLeeg(a.script) || isLeeg(a.regel) || !Array.isArray(a.invoer) || !a.invoer.length) return false;
  return a.invoer.every(function(x) { return x && !isLeeg(x.bronId) && /^[0-9a-f]{64}$/.test(x.sha256 || ""); });
}
// de velden die bij de herkomst horen (par. 3.3); een veld "bron" bij een afgeleid FEIT is alleen metadata
export function herkomstCompleet(feit) {
  if (feit.herkomst === "bron") return !!(feit.bron && !isLeeg(feit.bron.id)) && feit.afleiding === undefined;
  if (feit.herkomst === "afgeleid") return afleidingCompleet(feit.afleiding);
  if (feit.herkomst === "besluit") return besluitVerwijzing(feit) !== null;
  if (feit.herkomst === "onderzoek") return !isLeeg(feit.reden);
  return false;
}
export function bewezen(feit, plaats) {
  var w = waardeVan(feit, plaats);
  if (!feit || typeof feit !== "object") return false;
  if (feit.status !== "vastgesteld") return false;
  if (feit.herkomst !== "bron" && feit.herkomst !== "afgeleid" && feit.herkomst !== "besluit") return false;
  if (!herkomstCompleet(feit)) return false;
  return !isLeeg(w);
}
// ouder: het dichtstbijzijnde omvattende FEIT (nooit een container), of undefined
export function isVraagbaar(feit, plaats, ouder) {
  if (!bewezen(feit, plaats)) return false;
  if (ouder !== undefined && ouder !== null && ouder.status !== "vastgesteld") return false;
  return true;
}
export function isNietVastgesteld(status) { return NIET_VASTGESTELD.indexOf(status) >= 0 || status === "te verifiëren"; }

// ---- relaties ----
export function inverseVan(rel, relaties) {
  var R = relaties || RELATIES, t = R[rel.type];
  if (!t) throw new Error("onbekend relatietype: " + rel.type);
  if (!t.inverse || !R[t.inverse]) throw new Error("geen inverse voor: " + rel.type);
  var inv = {};
  Object.keys(rel).forEach(function(k) { inv[k] = rel[k]; });
  inv.type = t.inverse;
  inv.van = rel.naar;
  inv.naar = rel.van;
  inv.kwalificaties = JSON.parse(JSON.stringify(rel.kwalificaties || {}));
  return inv;
}
function sleutel(r) { return r.type + "|" + r.van + "|" + r.naar; }
// bouwIndex(items, afgeleideRelaties): de relaties uit de items en de opgegeven afgeleide relaties, plus hun inversen;
// alleen in het geheugen. Geeft { heen, inversen, alle, dubbel }
export function bouwIndex(items, afgeleideRelaties, relaties, inverseFn) {
  var inv = inverseFn || inverseVan, heen = [], gezien = {}, dubbel = [];
  (items || []).forEach(function(it) { (it.relaties || []).forEach(function(r) { var x = {}; Object.keys(r).forEach(function(k) { x[k] = r[k]; }); x.van = it.id; heen.push(x); }); });
  (afgeleideRelaties || []).forEach(function(r) { heen.push(r); });
  heen.forEach(function(r) { var k = sleutel(r); if (gezien[k]) dubbel.push(k); gezien[k] = 1; });
  var inversen = heen.map(function(r) { return inv(r, relaties); });
  var alle = heen.concat(inversen), perSleutel = {};
  alle.forEach(function(r) { perSleutel[sleutel(r)] = (perSleutel[sleutel(r)] || []).concat([r]); });
  return { heen: heen, inversen: inversen, alle: alle, perSleutel: perSleutel, dubbel: dubbel, sleutel: sleutel };
}
// de afgeleide relaties uit randen.js (par. 5.1): grenst-aan, met km en via als kwalificaties
// omzetting van de Natural Earth-codes in randen.js naar item-id's, via de GEOREF-sleutel van de landen (v1.13)
export function grensCodeTabel(landen) {
  var t = {};
  landen.forEach(function(it) {
    var k = it.geometrie && it.geometrie.bron ? it.geometrie.bron.waarde : undefined;
    if (isLeeg(k)) throw new Error("GEOREF-sleutel ontbreekt: " + it.id);
    if (t[k] !== undefined) throw new Error("dubbele GEOREF-sleutel: " + k + " (" + t[k] + ", " + it.id + ")");
    t[k] = it.id;
  });
  return t;
}
export function grensRelaties(R, landen) {
  var tabel = grensCodeTabel(landen);
  function id(code) { if (tabel[code] === undefined) throw new Error("onbekende grenscode: " + code); return tabel[code]; }
  var afleiding = {
    script: R.BRON.script,
    invoer: R.BRON.naturalEarth.bestanden.map(function(b) { return { bronId: "NE", sha256: b[1] }; }),
    regel: "grenst-aan bij minstens 1 km gedeelde rand, plus enclaves (plan T2b par. 3.4)"
  };
  return R.GRENST_AAN.map(function(g) {
    return { type: "grenst-aan", van: id(g.a), naar: id(g.b), kwalificaties: { km: g.km, via: g.via }, herkomst: "afgeleid", status: "vastgesteld", afleiding: afleiding };
  });
}
