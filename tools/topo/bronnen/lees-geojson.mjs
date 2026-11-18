// GeoJSON-lezer voor de bronlaag (bouwplan T2b-2 fase 6.2 v3, par. 2; plan v2 par. 5.4). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
// leesGeojson leest een FeatureCollection met vlakken en geeft de genormaliseerde vorm
// { crs, records: [{ kenmerken, delen }] } (zie bron.mjs); delen = lijst van polygonen, elk een lijst van gesloten ringen.
// CRS_GEOJSON: de definitie van EPSG:3812 (Belgian Lambert 2008, ETRS89, zonder datumverschuiving). Ze staat hier en niet
// in bron.mjs, omdat bron.mjs in fase 6.2 niet mag wijzigen (toestemming GPT 18-11-2026: alleen vier bestaande bestanden).

export var CRS_GEOJSON = {
  "EPSG:3812": "+proj=lcc +lat_0=50.797815 +lon_0=4.35921583333333 +lat_1=49.8333333333333 +lat_2=51.1666666666667 +x_0=649328 +y_0=665262 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
};

function crsVan(fc) {
  var n = fc.crs && fc.crs.properties && fc.crs.properties.name;
  var m = typeof n === "string" ? n.match(/EPSG::?([0-9]+)$/) : null;
  if (!m) throw new Error("GeoJSON zonder herkenbare crs");
  return "EPSG:" + m[1];
}
function controleerRing(r) {
  var a = r[0], z = r[r.length - 1];
  if (r.length < 4 || a[0] !== z[0] || a[1] !== z[1]) throw new Error("ring niet gesloten");
}
// leest alle features; kolommen = de kenmerken die worden overgenomen (in deze volgorde)
export function leesGeojson(buf, kolommen) {
  var fc = JSON.parse(buf.toString("utf8"));
  if (fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) throw new Error("geen FeatureCollection");
  var records = fc.features.map(function(f) {
    var g = f.geometry, delen;
    if (!g) throw new Error("feature zonder geometrie");
    if (g.type === "Polygon") delen = [g.coordinates];
    else if (g.type === "MultiPolygon") delen = g.coordinates;
    else throw new Error("alleen Polygon of MultiPolygon, kreeg " + g.type);
    delen.forEach(function(d) { d.forEach(controleerRing); });
    var kenmerken = {};
    kolommen.forEach(function(k) {
      if (!Object.prototype.hasOwnProperty.call(f.properties, k)) throw new Error("kenmerk ontbreekt: " + k);
      kenmerken[k] = f.properties[k];
    });
    return { kenmerken: kenmerken, delen: delen };
  });
  return { crs: crsVan(fc), records: records };
}
