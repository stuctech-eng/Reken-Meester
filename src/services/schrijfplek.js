// Schrijfplek per tabblad en de wachtrij van bewerkingen (plan IN, fase IN-1 §3g en fase IN-2 §22.3).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// - Toestel-id: één keer per installatie (localStorage rekenmeester_toestel).
// - Schrijfplek: elk tabblad claimt plek 1, 2, ... met de Web Locks API (rekenmeester_wplek_<n>) en houdt die
//   lock zolang het open is. Zonder Web Locks: een eigen plek per keer openen ("x...").
// - Per plek en per eigenaar (een uid, of "lokaal") één wachtrijsleutel rekenmeester_wq_<plek>~<eigenaar> =
//   { uid, schrijver, laatste, items }, altijd in één setItem geschreven door het tabblad van die plek. Een
//   nieuwe sleutel krijgt een nieuwe schrijver-id toestel/w<plek>/<generatie> en begint bij nummer 1: een
//   schrijver-id hoort zo bij één eigenaar, en botst nooit met toegepastTot van een ander account (R1).
// - Het open concept per plek en eigenaar: rekenmeester_cc_<plek>~<eigenaar>.
// - De sleutels van IN-1 (rekenmeester_wachtrij_<plek>, rekenmeester_concept_<plek>, locks rekenmeester_plek_<n>)
//   worden alleen gelezen, onder de eigenaar in1Eigenaar(). Een IN-1-concept wordt alleen overgenomen met de
//   IN-1-lock van die plek in handen (neemIn1ConceptenOver).

var TOESTEL_KEY  = "rekenmeester_toestel";
var WQ_KEY       = "rekenmeester_wq_";
var CC_KEY       = "rekenmeester_cc_";
var LOCK_NAAM    = "rekenmeester_wplek_";
var IN1_WQ_KEY   = "rekenmeester_wachtrij_";
var IN1_CC_KEY   = "rekenmeester_concept_";
var IN1_LOCK     = "rekenmeester_plek_";
var MAX_PLEKKEN  = 20;

function willekeurig() { return Math.random().toString(36).slice(2, 10); }

// Een lock proberen (ifAvailable): "ja" (vastgehouden tot los() wordt aangeroepen of het tabblad sluit),
// "bezet", of "fout" als Web Locks zelf weigert. los is een functie die de lock vrijgeeft (alleen bij "ja").
export function probeerLock(locks, naam) {
  return new Promise(function(resolve) {
    try {
      var p = locks.request(naam, { ifAvailable: true }, function(lock) {
        if (!lock) { resolve({ r: "bezet" }); return undefined; }
        return new Promise(function(vrij) { resolve({ r: "ja", los: vrij }); });
      });
      if (p && typeof p.catch === "function") p.catch(function() { resolve({ r: "fout" }); });
    } catch (e) {
      resolve({ r: "fout" });
    }
  });
}

// Alle IN-1-locks proberen (plan §22.3, "De eerste wissel en IN-1"). Uitkomst { ok, los } met los() die alle
// verkregen locks vrijgeeft; ok = alle locks verkregen (geen levend IN-1-tabblad met een plek).
export async function pakIn1Locks(locks) {
  var verkregen = [];
  function los() { verkregen.forEach(function(f) { f(); }); verkregen = []; }
  if (!locks || typeof locks.request !== "function") return { ok: false, los: los };
  for (var n = 1; n <= MAX_PLEKKEN; n++) {
    var p = await probeerLock(locks, IN1_LOCK + n);
    if (p.r !== "ja") { los(); return { ok: false, los: los }; }
    verkregen.push(p.los);
  }
  return { ok: true, los: los };
}

// omgeving: { storage (zoals localStorage), locks (zoals navigator.locks, of null), in1Eigenaar() }
export function maakSchrijfplek(omgeving) {
  var storage = omgeving.storage;
  var locks   = omgeving.locks || null;
  var in1Eigenaar = omgeving.in1Eigenaar || function() { return null; };
  var plek    = null;

  function toestelId() {
    var id = storage.getItem(TOESTEL_KEY);
    if (!id) { id = "t_" + willekeurig(); storage.setItem(TOESTEL_KEY, id); }
    return id;
  }

  async function claim() {
    var gevonden = null;
    if (locks && typeof locks.request === "function") {
      for (var n = 1; n <= MAX_PLEKKEN && gevonden === null; n++) {
        var r = await probeerLock(locks, LOCK_NAAM + n);
        if (r.r === "ja") gevonden = String(n);
        if (r.r === "fout") break;
      }
    }
    plek = gevonden !== null ? gevonden : "x" + willekeurig();
    return plek;
  }

  function sleutel(p, eigenaar) { return WQ_KEY + p + "~" + eigenaar; }
  function leesSleutel(key) {
    var s = storage.getItem(key);
    if (!s) return null;
    try { var w = JSON.parse(s); return (w && Array.isArray(w.items) && typeof w.schrijver === "string") ? w : null; } catch (e) { return null; }
  }

  // Bewerkingen vastleggen op de eigen plek voor deze eigenaar: nummers en bewerkingen in één setItem (alles
  // of niets). Gooit een fout als dat niet lukt; dan is er niets veranderd.
  function voegMeerToe(inhouden, eigenaar) {
    var key = sleutel(plek, eigenaar);
    var w = leesSleutel(key) || { uid: eigenaar, schrijver: toestelId() + "/w" + plek + "/" + willekeurig(), laatste: 0, items: [] };
    var nieuw = inhouden.map(function(inhoud, i) {
      var b = {};
      for (var k in inhoud) b[k] = inhoud[k];
      b.schrijver = w.schrijver;
      b.nr = w.laatste + 1 + i;
      return b;
    });
    if (nieuw.length === 0) return nieuw;
    storage.setItem(key, JSON.stringify({ uid: eigenaar, schrijver: w.schrijver, laatste: w.laatste + nieuw.length, items: w.items.concat(nieuw) }));
    return nieuw;
  }
  function voegToe(inhoud, eigenaar) { return voegMeerToe([inhoud], eigenaar)[0]; }

  // Alleen de eigen plek van deze eigenaar: de bewerkingen weghalen die de server bevestigd heeft
  // (toegepastTot van de serverstand, voor de schrijver van deze sleutel)
  function ruimOp(toegepastTot, eigenaar) {
    var key = sleutel(plek, eigenaar);
    var w = leesSleutel(key);
    if (!w || w.uid !== eigenaar) return;
    var tot = (toegepastTot && toegepastTot[w.schrijver]) || 0;
    var rest = w.items.filter(function(b) { return b.nr > tot; });
    if (rest.length === w.items.length) return;
    storage.setItem(key, JSON.stringify({ uid: w.uid, schrijver: w.schrijver, laatste: w.laatste, items: rest }));
  }

  function sleutels() {
    var uit = [];
    for (var i = 0; i < storage.length; i++) { var k = storage.key(i); if (k) uit.push(k); }
    return uit;
  }

  // Momentopnames van alle wachtrijen van deze eigenaar (alle plekken, alle generaties), alleen lezen. Plus de
  // IN-1-wachtrijen als deze eigenaar de IN-1-eigenaar is.
  function alle(eigenaar) {
    var uit = [];
    var achter = "~" + eigenaar;
    var metIn1 = eigenaar !== null && eigenaar === in1Eigenaar();
    sleutels().forEach(function(key) {
      var w = null;
      if (key.indexOf(WQ_KEY) === 0 && key.slice(-achter.length) === achter) {
        w = leesSleutel(key);
        if (w && w.uid !== eigenaar) w = null;
      } else if (metIn1 && key.indexOf(IN1_WQ_KEY) === 0) {
        w = leesSleutel(key);
      }
      if (w && w.items.length > 0) uit.push({ schrijver: w.schrijver, items: w.items });
    });
    return uit;
  }

  // Bewerkingen van deze eigenaar die volgens bevestigd (toegepastTot van de laatst bekende serverstand) nog
  // niet op de server staan
  function wachtend(bevestigd, eigenaar) {
    var b = bevestigd || {};
    return alle(eigenaar).reduce(function(som, w) {
      return som + w.items.filter(function(x) { return x.nr > (b[w.schrijver] || 0); }).length;
    }, 0);
  }

  // Aantal items in de IN-1-wachtrijen (voor de melding als de IN-1-eigenaar niet meer actief is)
  function in1Items() {
    return sleutels().reduce(function(som, key) {
      if (key.indexOf(IN1_WQ_KEY) !== 0) return som;
      var w = leesSleutel(key);
      return som + (w ? w.items.length : 0);
    }, 0);
  }

  // Een concept-id dat al als sessie in een wachtrij van deze eigenaar staat (§22.4, "Gevonden in IN-1")
  function conceptAlVastgelegd(id, eigenaar) {
    return alle(eigenaar).some(function(w) {
      return w.items.some(function(x) { return x.soort === "sessie" && x.result && x.result.conceptId === id; });
    });
  }

  function conceptSleutel(eigenaar) { return CC_KEY + plek + "~" + eigenaar; }
  function leesConcept(eigenaar) {
    var s = storage.getItem(conceptSleutel(eigenaar));
    if (!s) return null;
    try { return JSON.parse(s); } catch (e) { return null; }
  }
  function schrijfConcept(c, eigenaar) { storage.setItem(conceptSleutel(eigenaar), JSON.stringify(c)); }
  function wisConcept(eigenaar) { storage.removeItem(conceptSleutel(eigenaar)); }

  // Alle open concepten van een eigenaar (alle plekken), voor de overname
  function alleConcepten(eigenaar) {
    var achter = "~" + eigenaar;
    var uit = [];
    sleutels().forEach(function(key) {
      if (key.indexOf(CC_KEY) === 0 && key.slice(-achter.length) === achter) {
        try { var c = JSON.parse(storage.getItem(key)); if (c) uit.push(c); } catch (e) {}
      }
    });
    return uit;
  }

  // Alle IN-2-sleutels van een eigenaar wissen (wachtrijen en concepten van alle plekken). IN-1-sleutels nooit.
  function wisEigenaar(eigenaar) {
    var achter = "~" + eigenaar;
    sleutels().forEach(function(key) {
      if ((key.indexOf(WQ_KEY) === 0 || key.indexOf(CC_KEY) === 0) && key.slice(-achter.length) === achter) storage.removeItem(key);
    });
  }

  // De eigenaars waarvan er IN-2-sleutels op dit toestel staan
  function eigenaars() {
    var gezien = {};
    sleutels().forEach(function(key) {
      if (key.indexOf(WQ_KEY) === 0 || key.indexOf(CC_KEY) === 0) {
        var i = key.indexOf("~");
        if (i > 0) gezien[key.slice(i + 1)] = true;
      }
    });
    return Object.keys(gezien);
  }

  // IN-1-concepten overnemen als sessie in de eigen wachtrij van eigenaar (alleen de IN-1-eigenaar). Per IN-1-
  // plek alleen met de IN-1-lock in handen; houdtLocks: de aanroeper heeft alle IN-1-locks al (bij een wissel).
  // maakSessie(c) geeft de bewerking voor een geldig concept, of null. Geeft het aantal overgenomen concepten.
  async function neemIn1ConceptenOver(eigenaar, maakSessie, houdtLocks) {
    if (eigenaar === null || eigenaar !== in1Eigenaar()) return 0;
    var aantal = 0;
    for (var n = 1; n <= MAX_PLEKKEN; n++) {
      var key = IN1_CC_KEY + n;
      if (storage.getItem(key) === null) continue;
      var los = null;
      if (!houdtLocks) {
        if (!locks || typeof locks.request !== "function") continue;
        var p = await probeerLock(locks, IN1_LOCK + n);
        if (p.r !== "ja") continue;
        los = p.los;
      }
      try {
        var c = null;
        try { c = JSON.parse(storage.getItem(key)); } catch (e) { c = null; }
        var b = c ? maakSessie(c) : null;
        if (b && !conceptAlVastgelegd(c.id, eigenaar)) { voegToe(b, eigenaar); aantal++; }
        storage.removeItem(key);
      } finally {
        if (los) los();
      }
    }
    return aantal;
  }

  return {
    claim: claim,
    plek: function() { return plek; },
    voegToe: voegToe,
    voegMeerToe: voegMeerToe,
    ruimOp: ruimOp,
    alle: alle,
    wachtend: wachtend,
    in1Items: in1Items,
    conceptAlVastgelegd: conceptAlVastgelegd,
    leesConcept: leesConcept,
    schrijfConcept: schrijfConcept,
    wisConcept: wisConcept,
    alleConcepten: alleConcepten,
    wisEigenaar: wisEigenaar,
    eigenaars: eigenaars,
    neemIn1ConceptenOver: neemIn1ConceptenOver,
  };
}
