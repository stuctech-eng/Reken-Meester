// GeoPackage-lezer voor de bronlaag (bouwplan T2b-2 fase 6.1 v1.9, par. 5.4). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
// leesGeometrie en alleRingen zijn ongewijzigd verhuisd uit maak-steden-nl.mjs. leesGpkg leest een laag en geeft de
// genormaliseerde vorm { crs, lastChange, records: [{ kenmerken, delen }] } (zie bron.mjs).

import initSqlJs from "sql.js";

// ---- GeoPackage-geometrie (OGC GeoPackage 1.x): kop "GP", versie, vlaggen, srs_id, envelop; daarna WKB ----
export function leesGeometrie(b) {
  if (b[0] !== 0x47 || b[1] !== 0x50) throw new Error("geen GeoPackage-geometrie (magic)");
  var vlag = b[3], envelop = (vlag >> 1) & 7, leeg = (vlag >> 4) & 1;
  if (leeg) throw new Error("lege geometrie");
  var envLengte = [0, 32, 48, 48, 64][envelop];
  if (envLengte === undefined) throw new Error("ongeldige envelop-indicator " + envelop);
  var dv = new DataView(b.buffer, b.byteOffset, b.byteLength), o = 8 + envLengte;
  function byteOrde() { var le = b[o] === 1; o += 1; return le; }
  function u32(le) { var v = dv.getUint32(o, le); o += 4; return v; }
  function f64(le) { var v = dv.getFloat64(o, le); o += 8; return v; }
  function polygoon() {
    var le = byteOrde(), t = u32(le);
    if (t !== 3) throw new Error("verwacht Polygon (3), kreeg " + t);
    var n = u32(le), ringen = [];
    for (var i = 0; i < n; i++) {
      var m = u32(le), r = [];
      for (var j = 0; j < m; j++) { var x = f64(le), y = f64(le); r.push([x, y]); }
      ringen.push(r);
    }
    return ringen;
  }
  var le = byteOrde(), type = u32(le);
  var delen;
  if (type === 6) { var k = u32(le); delen = []; for (var i = 0; i < k; i++) delen.push(polygoon()); }
  else if (type === 3) { o -= 5; delen = [polygoon()]; }
  else throw new Error("alleen 2D Polygon of MultiPolygon, kreeg type " + type);
  if (o !== b.length) throw new Error("WKB niet volledig gelezen");
  delen.forEach(function(d) { d.forEach(function(r) { var a = r[0], z = r[r.length - 1]; if (r.length < 4 || a[0] !== z[0] || a[1] !== z[1]) throw new Error("ring niet gesloten"); }); });
  return delen;
}
// alle ringen van alle delen samen: even-oneven over het hele multivlak
export function alleRingen(delen) { var a = []; delen.forEach(function(d) { d.forEach(function(r) { a.push(r); }); }); return a; }

// leest een featurelaag; kolommen = de kenmerken die worden overgenomen (in deze volgorde), geomKolom = de geometrie
export async function leesGpkg(buf, laag, kolommen, geomKolom, orde) {
  var SQL = await initSqlJs();
  var db = new SQL.Database(new Uint8Array(buf));
  var inhoud = db.exec("select last_change, srs_id from gpkg_contents where table_name = '" + laag + "'")[0].values[0];
  var sel = kolommen.concat([geomKolom]).join(", ");
  var res = db.exec("select " + sel + " from " + laag + (orde ? " order by " + orde : ""))[0];
  var records = res.values.map(function(v) {
    var kenmerken = {};
    kolommen.forEach(function(k, i) { kenmerken[k] = v[i]; });
    return { kenmerken: kenmerken, geom: v[kolommen.length] };
  });
  db.close();
  return { crs: "EPSG:" + inhoud[1], lastChange: inhoud[0], records: records };
}
