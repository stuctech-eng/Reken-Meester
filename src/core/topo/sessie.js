// Een sessie van Topografie samenstellen (plan T4 par. 5). Alleen in de bundel van Topografie (data.js maakt hem aan).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// maakSessie(api) geeft een sessie met:
//   start(items, datum)   de opgeslagen itemstand en de datum van vandaag (JJJJ-MM-DD) bij het openen van de modus
//   kies(def, defs)       welk kennisitem de volgende vraag van vaardigheid def vraagt: { def, o, id } of null (dan de bestaande
//                         ronde, deckPick). defs: alle vaardigheden van de modus, in volgorde (voor de herhaling)
//   gevraagd(q)           de vraag die gemaakt is (voor "nooit twee keer achter elkaar" en "een keer per sessie")
//   antwoord(q, goed, invoer)  verwerkt het antwoord in de stand van nu; geeft het kennisrecord voor de lijst results
//   items()               de stand van nu (opgeslagen + deze sessie)
// api (van data.js): combinaties(def), sleutelsVan(o, id), sleutelsVanDef(def).
//
// De volgorde per vraag (par. 5.1): 1 een fout uit deze sessie, na 3 tot 5 vragen; 2 op vraag 5, 10, 15 ... een beheerst item dat
// aan de beurt is uit een eerdere vaardigheid; 3 een item van def dat aan de beurt is (het langst wachtende eerst); 4 een nieuw
// item van def (willekeurig); 5 anders null. Een item dat aan de beurt of nieuw was, komt hoogstens een keer per sessie via 3 of 4.
// Nooit twee keer achter elkaar hetzelfde kennisitem, zolang er een ander is.

import { leesItem, status, aanDeBeurt, wachttijd, verwerkAntwoorden, dagNr } from "./beheersing.js";

export function maakSessie(api) {
  var S = { items: {}, dag: 0, n: 0, fouten: [], gezien: {}, laatste: null };
  var PER_SLEUTEL = {};

  function perSleutel(def) {
    if (PER_SLEUTEL[def.id]) return PER_SLEUTEL[def.id];
    var m = {};
    api.combinaties(def).forEach(function(c) {
      api.sleutelsVan(def.onderdelen[c.o], c.id).forEach(function(s) { (m[s] = m[s] || []).push(c); });
    });
    PER_SLEUTEL[def.id] = m;
    return m;
  }
  function combinatie(def, sleutel) {
    var lijst = perSleutel(def)[sleutel];
    var c = lijst[Math.floor(Math.random() * lijst.length)];
    return { def: def, o: c.o, id: c.id };
  }
  function st(sleutel) { return leesItem(S.items[sleutel]); }
  function oudsteEerst(lijst) {
    return lijst.sort(function(a, b) { var d = wachttijd(st(b), S.dag) - wachttijd(st(a), S.dag); return d !== 0 ? d : (a < b ? -1 : a > b ? 1 : 0); });
  }

  return {
    start: function(items, datum) {
      S = { items: {}, dag: dagNr(datum), n: 0, fouten: [], gezien: {}, laatste: null };
      for (var k in (items || {})) S.items[k] = items[k];
    },
    kies: function(def, defs) {
      S.n += 1;
      // 1 een fout uit deze sessie
      for (var i = 0; i < S.fouten.length; i++) {
        var f = S.fouten[i];
        if (f.defId === def.id && f.klaar <= S.n && f.sleutel !== S.laatste) { S.fouten.splice(i, 1); return { def: def, o: f.o, id: f.id }; }
      }
      // 2 herhaling uit een eerdere vaardigheid
      var plek = (defs || []).indexOf(def);
      if (S.n % 5 === 0 && plek > 0) {
        var kand = [], van = {};
        defs.slice(0, plek).forEach(function(d) {
          api.sleutelsVanDef(d).forEach(function(s) {
            var it = st(s);
            if (!van[s] && !S.gezien[s] && s !== S.laatste && status(it) === "beheerst" && aanDeBeurt(it, S.dag)) { van[s] = d; kand.push(s); }
          });
        });
        if (kand.length) { var h = oudsteEerst(kand)[0]; return combinatie(van[h], h); }
      }
      var eigen = api.sleutelsVanDef(def).filter(function(s) { return !S.gezien[s] && s !== S.laatste; });
      // 3 aan de beurt
      var beurt = eigen.filter(function(s) { var it = st(s); return status(it) !== "nieuw" && aanDeBeurt(it, S.dag); });
      if (beurt.length) return combinatie(def, oudsteEerst(beurt)[0]);
      // 4 nieuw
      var nieuw = eigen.filter(function(s) { return status(st(s)) === "nieuw"; });
      if (nieuw.length) return combinatie(def, nieuw[Math.floor(Math.random() * nieuw.length)]);
      return null;
    },
    gevraagd: function(q) {
      if (!q.kennis) return;
      S.gezien[q.kennis.sleutel] = true;
      S.laatste = q.kennis.sleutel;
    },
    antwoord: function(q, goed, invoer) {
      var kn = q && q.kennis;
      if (!kn) return null;
      var rec = invoer === "naam" && kn.typ ? { sleutel: kn.typ, ook: [kn.sleutel], opties: false } : { sleutel: kn.sleutel, opties: invoer === "choice" };
      S.items = verwerkAntwoorden(S.items, [{ correct: goed, kennis: rec }], S.dag);
      if (!goed) S.fouten.push({ defId: kn.defId, o: kn.o, id: kn.id, sleutel: kn.sleutel, klaar: S.n + 3 + Math.floor(Math.random() * 3) });
      return rec;
    },
    items: function() { return S.items; },
    laatste: function() { return S.laatste; },
  };
}
