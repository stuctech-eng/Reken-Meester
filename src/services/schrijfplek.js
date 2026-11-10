// Schrijfplek per tabblad en de wachtrij van bewerkingen (plan IN, fase IN-1, §3g punt 5 en 9).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// - Toestel-id: één keer per installatie (localStorage rekenmeester_toestel).
// - Schrijfplek: elk tabblad claimt plek 1, 2, ... met de Web Locks API en houdt die lock zolang het open is.
//   De browser garandeert één tabblad per plek. Zonder Web Locks: een eigen plek per keer openen ("x...").
// - Schrijver-id: toestel-id + "/" + plek.
// - Per plek één sleutel rekenmeester_wachtrij_<plek> = { schrijver, laatste, items }. Alleen het tabblad met
//   de lock van die plek schrijft die sleutel, altijd in één setItem. Het voegt alleen achteraan toe (nummer
//   laatste + 1) en ruimt alleen vooraan op (tot en met wat de server bevestigd heeft).
// - Lezen van andere plekken mag altijd (alleen lezen); een momentopname is altijd heel en aaneengesloten.
// - Het open concept per plek: rekenmeester_concept_<plek>.

var TOESTEL_KEY    = "rekenmeester_toestel";
var WACHTRIJ_KEY   = "rekenmeester_wachtrij_";
var CONCEPT_KEY    = "rekenmeester_concept_";
var MAX_PLEKKEN    = 20;

function willekeurig() { return Math.random().toString(36).slice(2, 10); }

// omgeving: { storage (zoals localStorage), locks (zoals navigator.locks, of null) }
export function maakSchrijfplek(omgeving) {
  var storage = omgeving.storage;
  var locks   = omgeving.locks || null;
  var plek    = null;

  function toestelId() {
    var id = storage.getItem(TOESTEL_KEY);
    if (!id) { id = "t_" + willekeurig(); storage.setItem(TOESTEL_KEY, id); }
    return id;
  }

  // Probeer plek n: "ja" als de lock er is (en vastgehouden wordt), "bezet", of "fout" als Web Locks zelf
  // weigert (een fout of een afgewezen belofte); dan valt claim terug op een eigen plek
  function probeer(n) {
    return new Promise(function(resolve) {
      try {
        var p = locks.request("rekenmeester_plek_" + n, { ifAvailable: true }, function(lock) {
          if (!lock) { resolve("bezet"); return undefined; }
          resolve("ja");
          return new Promise(function() {});   // vasthouden zolang het tabblad open is
        });
        if (p && typeof p.catch === "function") p.catch(function() { resolve("fout"); });
      } catch (e) {
        resolve("fout");
      }
    });
  }

  async function claim() {
    var gevonden = null;
    if (locks && typeof locks.request === "function") {
      for (var n = 1; n <= MAX_PLEKKEN && gevonden === null; n++) {
        var r = await probeer(n);
        if (r === "ja") gevonden = String(n);
        if (r === "fout") break;
      }
    }
    plek = gevonden !== null ? gevonden : "x" + willekeurig();
    return plek;
  }

  function schrijverVan(p) { return toestelId() + "/" + p; }
  function lees(p) {
    var leeg = { schrijver: schrijverVan(p), laatste: 0, items: [] };
    var s = storage.getItem(WACHTRIJ_KEY + p);
    if (!s) return leeg;
    try { var w = JSON.parse(s); return (w && Array.isArray(w.items)) ? w : leeg; } catch (e) { return leeg; }
  }

  // Bewerkingen vastleggen op de eigen plek: nummers en bewerkingen in één setItem (alles of niets). Gooit
  // een fout als dat niet lukt; dan is er niets veranderd (ook laatste niet).
  function voegMeerToe(inhouden) {
    var w = lees(plek);
    var nieuw = inhouden.map(function(inhoud, i) {
      var b = {};
      for (var k in inhoud) b[k] = inhoud[k];
      b.schrijver = w.schrijver;
      b.nr = w.laatste + 1 + i;
      return b;
    });
    if (nieuw.length === 0) return nieuw;
    storage.setItem(WACHTRIJ_KEY + plek, JSON.stringify({ schrijver: w.schrijver, laatste: w.laatste + nieuw.length, items: w.items.concat(nieuw) }));
    return nieuw;
  }
  function voegToe(inhoud) { return voegMeerToe([inhoud])[0]; }

  // Alleen de eigen plek: bewerkingen tot en met nummer tot weghalen (bevestigd door de server)
  function ruimOp(tot) {
    var w = lees(plek);
    var rest = w.items.filter(function(b) { return b.nr > tot; });
    if (rest.length === w.items.length) return;
    storage.setItem(WACHTRIJ_KEY + plek, JSON.stringify({ schrijver: w.schrijver, laatste: w.laatste, items: rest }));
  }

  // Momentopnames van alle plekken op dit toestel (eigen en andere), alleen lezen
  function alle() {
    var uit = [];
    for (var i = 0; i < storage.length; i++) {
      var key = storage.key(i);
      if (key && key.indexOf(WACHTRIJ_KEY) === 0) {
        var w = lees(key.slice(WACHTRIJ_KEY.length));
        if (w.items.length > 0) uit.push({ schrijver: w.schrijver, items: w.items });
      }
    }
    return uit;
  }

  // Bewerkingen op dit toestel (alle plekken) die volgens bevestigd (toegepastTot van de laatst bekende
  // serverstand) nog niet op de server staan
  function wachtend(bevestigd) {
    var b = bevestigd || {};
    return alle().reduce(function(som, w) {
      return som + w.items.filter(function(x) { return x.nr > (b[w.schrijver] || 0); }).length;
    }, 0);
  }

  function leesConcept() {
    var s = storage.getItem(CONCEPT_KEY + plek);
    if (!s) return null;
    try { return JSON.parse(s); } catch (e) { return null; }
  }
  function schrijfConcept(c) { storage.setItem(CONCEPT_KEY + plek, JSON.stringify(c)); }
  function wisConcept() { storage.removeItem(CONCEPT_KEY + plek); }

  return {
    claim: claim,
    plek: function() { return plek; },
    schrijver: function() { return schrijverVan(plek); },
    voegToe: voegToe,
    voegMeerToe: voegMeerToe,
    ruimOp: ruimOp,
    alle: alle,
    wachtend: wachtend,
    leesConcept: leesConcept,
    schrijfConcept: schrijfConcept,
    wisConcept: wisConcept,
  };
}
