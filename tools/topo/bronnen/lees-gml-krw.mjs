// GML-lezer voor de landelijke KRW-oppervlaktewaterlichamen (INSPIRE Area Management, plan T5b par. 3.2). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
// leesKrwGml(buf) geeft de genormaliseerde vorm { crs, records: [{ kenmerken, soort, delen of lijnen }] } (zie bron.mjs):
// - kenmerken: localId, naam (gn:text), beheerder (competentAuthority), type (specialisedZoneType), versie (versionId);
// - de geometrie in lon/lat (de GML heeft EPSG:4258 in de volgorde lat lon; hier omgedraaid naar lon lat);
// - soort "vlak" (MultiSurface: per Polygon de buitenring en de binnenringen) of "lijn" (MultiCurve: de LineStrings);
// - de geometrie wordt pas gelezen als een maak-script erom vraagt (geometrie()), zodat niet alle 745 lichamen in het geheugen staan;
// - stopt bij een onbekende geometrie, een open ring, een oneven aantal getallen of een tweede CRS.

var CRS_GML = "http://www.opengis.net/def/crs/EPSG/0/4258";

function fout(t) { throw new Error(t); }
function tekstVan(s, tag) { var i = s.indexOf("<" + tag + ">"); if (i < 0) return null; var j = s.indexOf("</" + tag + ">", i); return s.slice(i + tag.length + 2, j).trim(); }
function posList(s) {
  var n = s.trim().split(/\s+/).map(Number);
  if (n.length % 2 || n.some(function(v) { return !isFinite(v); })) fout("KRW: ongeldige posList");
  var uit = []; for (var i = 0; i < n.length; i += 2) uit.push([n[i + 1], n[i]]);
  return uit;
}
function alle(s, open, sluit) { var uit = [], i = 0; for (;;) { var a = s.indexOf(open, i); if (a < 0) return uit; var b = s.indexOf(sluit, a); if (b < 0) fout("KRW: " + sluit + " ontbreekt"); uit.push(s.slice(a, b + sluit.length)); i = b + sluit.length; } }
function ring(s) { var r = posList(tekstVan(s, "gml:posList") || fout("KRW: ring zonder posList")); var a = r[0], z = r[r.length - 1]; if (r.length < 4 || a[0] !== z[0] || a[1] !== z[1]) fout("KRW: ring niet gesloten"); return r; }

function geometrie(s) {
  var srs = s.match(/srsName="([^"]*)"/g) || [];
  srs.forEach(function(x) { if (x !== "srsName=\"" + CRS_GML + "\"") fout("KRW: onverwacht CRS " + x); });
  if (s.indexOf("<gml:MultiSurface") >= 0) {
    return { soort: "vlak", delen: alle(s, "<gml:Polygon", "</gml:Polygon>").map(function(p) {
      var buiten = alle(p, "<gml:exterior>", "</gml:exterior>"), binnen = alle(p, "<gml:interior>", "</gml:interior>");
      if (buiten.length !== 1) fout("KRW: polygoon zonder precies een buitenring");
      return [ring(buiten[0])].concat(binnen.map(ring));
    }) };
  }
  if (s.indexOf("<gml:MultiCurve") >= 0) {
    return { soort: "lijn", lijnen: alle(s, "<gml:LineString", "</gml:LineString>").map(function(l) { var r = posList(tekstVan(l, "gml:posList") || fout("KRW: lijn zonder posList")); if (r.length < 2) fout("KRW: lijn met minder dan 2 punten"); return r; }) };
  }
  return fout("KRW: onbekende geometrie");
}

export function leesKrwGml(buf) {
  var s = buf.toString("utf8"), stukken = s.split("<gml:featureMember>").slice(1);
  var records = stukken.map(function(m) {
    var k = {
      localId: tekstVan(m, "base:localId") || fout("KRW: lichaam zonder localId"),
      naam: tekstVan(m, "gn:text") || fout("KRW: lichaam zonder naam"),
      beheerder: (m.match(/<base2:organisationName>\s*<gco:CharacterString>([^<]*)</) || [null, null])[1],
      type: ((m.match(/<am:specialisedZoneType xlink:href="([^"]*)"/) || [null, ""])[1]).split("/").pop(),
      versie: tekstVan(m, "base:versionId")
    };
    var g = m.indexOf("<am:geometry>"), h = m.indexOf("</am:geometry>");
    if (g < 0 || h < 0) fout("KRW: lichaam zonder geometrie: " + k.localId);
    var gs = m.slice(g, h), soort = gs.indexOf("<gml:MultiSurface") >= 0 ? "vlak" : gs.indexOf("<gml:MultiCurve") >= 0 ? "lijn" : fout("KRW: onbekende geometrie: " + k.localId);
    return { kenmerken: k, soort: soort, geometrie: function() { return geometrie(gs); } };
  });
  var gezien = {}; records.forEach(function(r) { if (gezien[r.kenmerken.localId]) fout("KRW: localId twee keer: " + r.kenmerken.localId); gezien[r.kenmerken.localId] = 1; });
  return { crs: "EPSG:4258", records: records };
}
