// Beheersing per kennisitem (plan T4 par. 3 en 4; regels uit T1 par. 1.6 punt 3). Zuivere functies: geen klok, geen toeval, geen
// opslag; ze veranderen hun invoer niet. Dit bestand staat in de standaardbundel, want voortgang.js verwerkt er de sessies mee.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Kennisitem: de sleutel "<item-id>|<kennissoort>"; kennissoort a (aanwijzen), b (benoemen, kiezen), s (schrijven, typen) of
// r:<relatie> (het paar, op de bron-id). Geen modus in de sleutel: de stand is gedeeld tussen de modi.
//
// De stand van een kennisitem (plan T4 par. 4.1, uitgebreid met gd):
//   g   aantal keer goed            f   aantal keer fout
//   st  stap in de herhaling, 0 tot en met 6 (0 = nooit goed)
//   dg  aantal verschillende dagen met een goed antwoord
//   ld  laatste dag met een antwoord   lg  laatste antwoord goed (1) of fout (0)
//   gz  aantal keer goed zonder antwoordopties (Meesterschap)
//   gd  laatste dag met een goed antwoord (alleen betekenisvol als g > 0): zo telt een tweede goed op dezelfde dag niet als
//       nieuwe dag en zet hij de herhaling niet nog een stap verder
// Opslag: de acht getallen in base 36, met een punt ertussen, in deze volgorde (schrijfItem en leesItem).
// Een dag is het aantal dagen sinds 2026-01-01 (dagNr), uit de datum van de bewerking sessie (voortgang.js).

export var TUSSENPOZEN = [1, 3, 7, 14, 30, 60];
var VELDEN = ["g", "f", "st", "dg", "ld", "lg", "gz", "gd"];
var NUL = Date.UTC(2026, 0, 1);

export function dagNr(datum) {
  var d = String(datum).split("-");
  return Math.round((Date.UTC(Number(d[0]), Number(d[1]) - 1, Number(d[2])) - NUL) / 86400000);
}

export function leegItem() { return { g: 0, f: 0, st: 0, dg: 0, ld: 0, lg: 0, gz: 0, gd: 0 }; }

export function leesItem(tekst) {
  var it = leegItem();
  if (typeof tekst !== "string" || tekst === "") return it;
  var d = tekst.split(".");
  VELDEN.forEach(function(v, i) { var x = parseInt(d[i], 36); it[v] = isNaN(x) ? 0 : x; });
  return it;
}

export function schrijfItem(it) {
  return VELDEN.map(function(v) { return (it[v] || 0).toString(36); }).join(".");
}

// Een antwoord verwerken (plan T4 par. 4.2).
// Een antwoord van een eerdere dag dan het laatste antwoord (een oude offline sessie die later op de server aankomt) telt mee in
// g, f en gz, maar verandert de herhaling niet: de laatste dag, het laatste antwoord en de stap blijven die van de nieuwste dag.
export function pasAntwoordToe(it, goed, opties, dag) {
  var n = {};
  VELDEN.forEach(function(v) { n[v] = it[v] || 0; });
  var gezien = n.g + n.f > 0;
  if (gezien && dag < n.ld) {
    if (goed) { n.g += 1; if (!opties) n.gz += 1; } else n.f += 1;
    return n;
  }
  if (goed) {
    var alVandaag = n.g > 0 && n.gd === dag;
    n.g += 1;
    if (!opties) n.gz += 1;
    if (!alVandaag) { n.dg += 1; n.st = Math.min(TUSSENPOZEN.length, n.st + 1); }
    n.gd = dag;
  } else {
    n.f += 1;
    n.st = n.g > 0 ? 1 : 0;
  }
  n.ld = dag;
  n.lg = goed ? 1 : 0;
  return n;
}

// De status (plan T4 par. 4.3); meesterschap: alleen goed zonder antwoordopties telt
export function status(it, meesterschap) {
  var g = meesterschap ? it.gz : it.g;
  if (!g) return "nieuw";
  if (g >= 3 && it.dg >= 2 && it.lg === 1) return "beheerst";
  return "ontwikkeling";
}

// Aan de beurt (plan T4 par. 4.4): alleen een item dat al eens goed was; een nieuw item is nieuw, niet aan de beurt
export function aanDeBeurt(it, dag) {
  if (!it.g || it.st < 1) return false;
  return dag >= it.ld + TUSSENPOZEN[it.st - 1];
}

// Hoeveel dagen te laat (0 = vandaag aan de beurt); voor "het langst wachtende eerst"
export function wachttijd(it, dag) {
  return dag - (it.ld + TUSSENPOZEN[Math.max(it.st, 1) - 1]);
}

// De antwoorden van een sessie verwerken in de itemstand (een object sleutel -> tekst); geeft een nieuw object.
// antwoorden: de lijst results van het oefenscherm, in volgorde; alleen een antwoord met kennis telt:
//   kennis = { sleutel, ook, opties }: sleutel krijgt het antwoord; de sleutels in ook alleen een goed antwoord (typen: s en b)
export function verwerkAntwoorden(items, antwoorden, dag) {
  var uit = {};
  for (var k in (items || {})) uit[k] = items[k];
  (antwoorden || []).forEach(function(r) {
    var kn = r && r.kennis;
    if (!kn || typeof kn.sleutel !== "string") return;
    var goed = !!r.correct;
    var lijst = [kn.sleutel].concat(goed && kn.ook ? kn.ook : []);
    lijst.forEach(function(s) { uit[s] = schrijfItem(pasAntwoordToe(leesItem(uit[s]), goed, !!kn.opties, dag)); });
  });
  return uit;
}

// Is elk kennisitem van een vaardigheid minstens in ontwikkeling? (de itemVoorwaarde, plan T4 par. 4.5)
export function allesMinstensInOntwikkeling(items, sleutels, meesterschap) {
  return (sleutels || []).every(function(s) { return status(leesItem((items || {})[s]), meesterschap) !== "nieuw"; });
}

// Telling per status, voor de balk (plan T4 par. 7)
export function telling(items, sleutels, meesterschap) {
  var t = { nieuw: 0, ontwikkeling: 0, beheerst: 0, totaal: 0 };
  (sleutels || []).forEach(function(s) { t[status(leesItem((items || {})[s]), meesterschap)] += 1; t.totaal += 1; });
  return t;
}
