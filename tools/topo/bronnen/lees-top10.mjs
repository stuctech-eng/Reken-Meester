// Lezer voor de waterdelen van BRT TOP10NL uit de PDOK OGC API, gebundeld in een bronbestand (plan T5b par. 3.2, T5b-2).
// Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
// Het bronbestand bevat per opgehaalde pagina de URL en de GeoJSON-tekst. leesTop10(buf) geeft
// { crs, records: [{ kenmerken, delen }], kaders, onvolledig }:
// - een record per waterdeel (lokaal_id), ook als het op meer pagina's staat (dan moet het gelijk zijn);
// - kenmerken: lokaal_id, naamnl, naamofficieel, typewater, bronactualiteit; delen: de polygonen in lon/lat (CRS84);
// - kaders: de zoekkaders (bbox) waarvan alle pagina's aanwezig zijn; een kader met een ontbrekende volgende pagina staat in
//   onvolledig en telt niet mee als doorzocht gebied;
// - stopt bij een onbekende geometrie of een waterdeel dat op twee pagina's verschilt.

function fout(t) { throw new Error(t); }
function param(url, k) { var m = new RegExp("[?&]" + k + "=([^&]*)").exec(url); return m ? decodeURIComponent(m[1]) : null; }
function sleutel(url) { return param(url, "bbox") + "|" + (param(url, "cursor") || ""); }

export function leesTop10(buf) {
  var B = JSON.parse(buf.toString("utf8")), per = {}, paginas = {}, volgende = {};
  B.paginas.forEach(function(p) {
    var d = JSON.parse(p.tekst), k = sleutel(p.url);
    if (paginas[k]) fout("TOP10: pagina twee keer: " + k);
    paginas[k] = 1;
    var nx = (d.links || []).filter(function(l) { return l.rel === "next"; });
    if (nx.length) volgende[k] = sleutel(nx[0].href);
    d.features.forEach(function(f) {
      var q = f.properties, id = q.lokaal_id || fout("TOP10: waterdeel zonder lokaal_id");
      var g = f.geometry, delen = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : fout("TOP10: onbekende geometrie " + g.type + " bij " + id);
      var r = { kenmerken: { lokaal_id: id, naamnl: q.naamnl, naamofficieel: q.naamofficieel, typewater: q.typewater, bronactualiteit: q.bronactualiteit }, delen: delen };
      if (per[id] && JSON.stringify(per[id]) !== JSON.stringify(r)) fout("TOP10: waterdeel " + id + " verschilt tussen twee pagina's");
      per[id] = r;
    });
  });
  // een kader is volledig als elke volgende pagina van dat kader aanwezig is
  var kaders = {}, onvolledig = {};
  Object.keys(paginas).forEach(function(k) { var bb = k.split("|")[0]; kaders[bb] = kaders[bb] || 0; });
  Object.keys(volgende).forEach(function(k) { if (!paginas[volgende[k]]) onvolledig[k.split("|")[0]] = 1; });
  var vol = Object.keys(kaders).filter(function(bb) { return !onvolledig[bb]; }).sort().map(function(bb) { return bb.split(",").map(Number); });
  return { crs: "CRS84", records: Object.keys(per).sort().map(function(id) { return per[id]; }), kaders: vol, onvolledig: Object.keys(onvolledig).sort() };
}

// ligt een punt binnen het doorzochte gebied (binnen een volledig kader, niet op de buitenrand van alle kaders samen)?
export function doorzocht(p, kaders, marge) {
  var binnen = kaders.filter(function(b) { return b[0] <= p[0] && p[0] <= b[2] && b[1] <= p[1] && p[1] <= b[3]; });
  if (!binnen.length) return false;
  if (binnen.some(function(b) { return b[0] + marge < p[0] && p[0] < b[2] - marge && b[1] + marge < p[1] && p[1] < b[3] - marge; })) return true;
  // op of vlak bij de rand van een kader: elk punt op de afstand marge in de vier richtingen moet in een kader liggen
  return [[marge, 0], [-marge, 0], [0, marge], [0, -marge]].every(function(d) { var q = [p[0] + d[0], p[1] + d[1]]; return kaders.some(function(b) { return b[0] <= q[0] && q[0] <= b[2] && b[1] <= q[1] && q[1] <= b[3]; }); });
}
