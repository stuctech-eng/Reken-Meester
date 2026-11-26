// Lezer voor een bundel van opgehaalde GeoJSON-pagina's (OGC API Features of ArcGIS REST, door Dick opgehaald als Webarchief;
// plan T5b-3). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
// Het bronbestand bevat per pagina de URL en de GeoJSON-tekst. leesBundel(buf, sleutel) geeft
// { records: [{ kenmerken, geometrie }], volledig, ontbrekend }:
// - een record per waarde van het kenmerk sleutel (bijvoorbeeld vwk_id), ook als het op meer pagina's staat (dan gelijk);
// - volledig: elke volgende pagina (link rel=next) staat ook in de bundel; ontbrekend: de cursors die niet in de bundel staan;
// - stopt bij een record zonder sleutel of een record dat op twee pagina's verschilt.

function fout(t) { throw new Error(t); }
function cursor(url) { var m = /[?&]cursor=([^&]*)/.exec(url); return m ? decodeURIComponent(m[1]) : ""; }

export function leesBundel(buf, sleutel) {
  var B = JSON.parse(buf.toString("utf8")), per = {}, cursors = {}, volgende = [];
  B.paginas.forEach(function(p) {
    var d = JSON.parse(p.tekst), c = cursor(p.url);
    if (cursors[c]) fout("bundel: pagina twee keer: " + p.url);
    cursors[c] = 1;
    (d.links || []).forEach(function(l) { if (l.rel === "next") volgende.push(cursor(l.href)); });
    d.features.forEach(function(f) {
      var k = f.properties[sleutel];
      if (k === undefined || k === null) fout("bundel: record zonder " + sleutel);
      var r = { kenmerken: f.properties, geometrie: f.geometry };
      if (per[k] && JSON.stringify(per[k]) !== JSON.stringify(r)) fout("bundel: record " + k + " verschilt tussen twee pagina's");
      per[k] = r;
    });
  });
  var ontbrekend = volgende.filter(function(c) { return !cursors[c]; });
  return { records: Object.keys(per).sort().map(function(k) { return per[k]; }), volledig: ontbrekend.length === 0, ontbrekend: ontbrekend };
}
