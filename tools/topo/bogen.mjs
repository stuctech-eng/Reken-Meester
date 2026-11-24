// Inpakken van een kaart in de vorm met gedeelde bogen (plan T3 par. 3.5). Het omgekeerde staat in
// src/core/topo/kaart/bogen.js (pakUit); test-bogen.mjs bewijst dat pakUit(pakIn(k)) byte-gelijk is aan k.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Werkwijze, zonder iets aan de geometrie te veranderen:
// 1. elk pad (d) wordt gelezen als ringen van gehele getallen (in de eenheid van de afronding);
// 2. een punt is een knoop als het niet precies twee verschillende buren heeft (over alle ringen samen), als het het
//    begin van een ring is, of het eind van een lijn;
// 3. elke ring wordt bij de knopen geknipt in bogen; gelijke bogen (vooruit of achteruit) worden een keer bewaard.
// Knippen en samenvoegen verliest niets: een ring is precies de aaneenschakeling van zijn bogen.

import { FORMAAT } from "../../src/core/topo/kaart/bogen.js";

function leesRingen(d, f) {
  var uit = [], cur = null, x = 0, y = 0, stand = null, re = /([MlZ])|(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, m;
  while ((m = re.exec(d))) {
    if (m[1]) { stand = m[1]; if (stand === "Z") { cur = null; } continue; }
    var a = Math.round(Number(m[2]) * f), b = Math.round(Number(m[3]) * f);
    if (stand === "M") { x = a; y = b; cur = [[x, y]]; uit.push(cur); stand = "l"; }
    else { x += a; y += b; cur.push([x, y]); }
  }
  return uit;
}

function sleutel(p) { return p[0] + "," + p[1]; }

export function pakIn(kaart, afronding) {
  var f = Math.round(1 / afronding), reeksen = [];
  // alle ringen, als reeks met het sluitpunt erbij (vlak) of als open lijn
  function verzamel(it, gesloten) {
    var rs = leesRingen(it.d, f).map(function(r) { return gesloten ? r.concat([r[0]]) : r; });
    var obj = { rs: rs, gesloten: gesloten };
    reeksen.push(obj);
    return obj;
  }
  var achter = kaart.achtergrond.map(function(it) { return verzamel(it, true); });
  var lagen = kaart.lagen.map(function(l) { return l.items.map(function(it) { return it.d === undefined ? null : verzamel(it, l.soort !== "lijn"); }); });
  // buren per punt
  var buren = new Map(), knoop = new Set();
  reeksen.forEach(function(o) {
    o.rs.forEach(function(r) {
      knoop.add(sleutel(r[0]));
      if (!o.gesloten) knoop.add(sleutel(r[r.length - 1]));
      for (var i = 0; i < r.length - 1; i++) {
        var a = sleutel(r[i]), b = sleutel(r[i + 1]);
        if (!buren.has(a)) buren.set(a, new Set());
        if (!buren.has(b)) buren.set(b, new Set());
        buren.get(a).add(b); buren.get(b).add(a);
      }
    });
  });
  buren.forEach(function(s, p) { if (s.size !== 2 || s.has(p)) knoop.add(p); });
  // knippen en ontdubbelen
  var bogen = [], index = new Map();
  function boogNr(pts) {
    var v = pts.map(sleutel).join(" "), t = pts.slice().reverse().map(sleutel).join(" ");
    if (index.has(v)) return index.get(v);
    if (index.has(t)) return ~index.get(t);
    var nr = bogen.length;
    bogen.push(pts);
    index.set(v, nr);
    return nr;
  }
  function refs(o) {
    return o.rs.map(function(r) {
      var uit = [], start = 0;
      for (var i = 1; i < r.length; i++) if (knoop.has(sleutel(r[i])) || i === r.length - 1) { uit.push(boogNr(r.slice(start, i + 1))); start = i; }
      if (r.length === 1) uit.push(boogNr(r));
      return uit;
    });
  }
  function g(n) { return String(n / f); }
  function itemIn(it, o) {
    if (!o) return it;
    var nieuw = {};
    for (var k in it) { if (k === "d") nieuw.r = refs(o); else nieuw[k] = it[k]; }
    return nieuw;
  }
  var uit = {};
  for (var k in kaart) {
    if (k === "achtergrond") uit.achtergrond = kaart.achtergrond.map(function(it, i) { return itemIn(it, achter[i]); });
    else if (k === "lagen") uit.lagen = kaart.lagen.map(function(l, j) { var nl = {}; for (var m in l) nl[m] = m === "items" ? l.items.map(function(it, i) { return itemIn(it, lagen[j][i]); }) : l[m]; return nl; });
    else uit[k] = kaart[k];
  }
  uit.formaat = FORMAAT;
  uit.afronding = afronding;
  uit.bogen = bogen.map(function(pts) { return pts.map(function(p, i) { return i === 0 ? g(p[0]) + "," + g(p[1]) : g(p[0] - pts[i - 1][0]) + "," + g(p[1] - pts[i - 1][1]); }).join(" "); });
  return uit;
}
