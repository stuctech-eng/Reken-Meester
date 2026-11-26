// Laden van Topografie bij het openen van een modus (plan T3 par. 3.1). Dit kleine bestand staat in de standaardbundel; de
// kennisbank, de sjablonen en de kaarten (data.js en kaarten/*.js) worden pas hier, met import(), geladen.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Het oefenscherm maakt zijn eerste vraag meteen (synchroon). Daarom wacht de app met het oefenscherm tot laadTopo klaar is
// (ModusLader in App.jsx); daarna maken de vaardigheden hun vragen gewoon synchroon via topo().
// T5c (plan T5c par. 3.3): een kaart in delen (kaartdelen.js). laadTopo(kaartIds) laadt de basis; laadTopo(kaartIds, delen) ook de
// delen ("nlbe/water"). Elk bestand wordt een keer geladen en een keer klaargezet; een mislukte lading mag opnieuw.

var KAARTBESTAND = {
  nlbe: function() { return import("./kaarten/nlbe-basis.js"); },
};
var DEELBESTAND = {
  "nlbe/water": function() { return import("./kaarten/nlbe-water.js"); },
  "nlbe/gebieden": function() { return import("./kaarten/nlbe-gebieden.js"); },
  "nlbe/grens": function() { return import("./kaarten/nlbe-grens.js"); },
};

var BEZIG = {}, GEZET = {}, DATA = null;

function haal(sleutel, laad) {
  if (!BEZIG[sleutel]) {
    BEZIG[sleutel] = Promise.resolve().then(laad).then(null, function(e) { delete BEZIG[sleutel]; throw e; });
  }
  return BEZIG[sleutel];
}

export function laadTopo(kaartIds, delen) {
  delen = delen || [];
  var ids = kaartIds.slice();
  delen.forEach(function(d) { var k = d.split("/")[0]; if (ids.indexOf(k) < 0) ids.push(k); });
  var lijst = [haal("data", function() { return import("./data.js"); })];
  ids.forEach(function(id) { lijst.push(haal(id, function() { if (!KAARTBESTAND[id]) throw new Error("onbekende kaart: " + id); return KAARTBESTAND[id](); })); });
  delen.forEach(function(d) { lijst.push(haal(d, function() { if (!DEELBESTAND[d]) throw new Error("onbekend deel van een kaart: " + d); return DEELBESTAND[d](); })); });
  return Promise.all(lijst).then(function(m) {
    var data = m[0];
    ids.forEach(function(id, i) { if (!GEZET[id]) { data.zetKaart(id, m[i + 1].default); GEZET[id] = true; } });
    delen.forEach(function(d, i) { if (!GEZET[d]) { data.zetDeel(d.split("/")[0], m[1 + ids.length + i].default); GEZET[d] = true; } });
    DATA = data;
    return data;
  });
}

export function topo() {
  if (!DATA) throw new Error("Topografie is nog niet geladen");
  return DATA;
}
