// Laden van Topografie bij het openen van een modus (plan T3 par. 3.1). Dit kleine bestand staat in de standaardbundel; de
// kennisbank, de sjablonen en de kaarten (data.js en kaarten/*.js) worden pas hier, met import(), geladen.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Het oefenscherm maakt zijn eerste vraag meteen (synchroon). Daarom wacht de app met het oefenscherm tot laadTopo klaar is
// (ModusLader in App.jsx); daarna maken de vaardigheden hun vragen gewoon synchroon via topo().

var KAARTBESTAND = {
  nlbe: function() { return import("./kaarten/nlbe.js"); },
};

var GELADEN = null, BEZIG = {};

export function laadTopo(kaartIds) {
  var sleutel = kaartIds.join(",");
  if (GELADEN && kaartIds.every(function(id) { return GELADEN.heeft[id]; })) return Promise.resolve(GELADEN.data);
  if (!BEZIG[sleutel]) {
    BEZIG[sleutel] = Promise.all([import("./data.js")].concat(kaartIds.map(function(id) {
      if (!KAARTBESTAND[id]) throw new Error("onbekende kaart: " + id);
      return KAARTBESTAND[id]();
    }))).then(function(m) {
      var data = m[0];
      kaartIds.forEach(function(id, i) { data.zetKaart(id, m[i + 1].default); });
      if (!GELADEN) GELADEN = { data: data, heeft: {} };
      kaartIds.forEach(function(id) { GELADEN.heeft[id] = true; });
      delete BEZIG[sleutel];
      return data;
    }, function(e) { delete BEZIG[sleutel]; throw e; });
  }
  return BEZIG[sleutel];
}

export function topo() {
  if (!GELADEN) throw new Error("Topografie is nog niet geladen");
  return GELADEN.data;
}
