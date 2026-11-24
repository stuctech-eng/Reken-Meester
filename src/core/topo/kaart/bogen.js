// Uitpakken van een kaart met gedeelde bogen (plan T3 par. 3.5). Het kaartscript (tools/topo/bogen.mjs) schrijft elke
// grens een keer: kaart.bogen is een lijst van bogen, en een vlak of lijn is een lijst van ringen, elk een lijst van
// boognummers (i: boog i vooruit, ~i: boog i achteruit). pakUit maakt daar exact de paden (d) van de T2a-vorm van,
// byte-gelijk aan de kaart zonder bogen (test: tools/topo/test-bogen.mjs).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Een boog is tekst: het eerste punt absoluut, daarna de verschillen, zoals in een pad ("12.5,3 -0.25,1.1 ...").
// Getallen zijn veelvouden van kaart.afronding; ze worden als gehele getallen (in die eenheid) gelezen, zodat er
// niets afrondt. Een ring van een vlak is gesloten: het laatste punt van de laatste boog is het eerste punt van de ring.

export var FORMAAT = "bogen-1";

function leesBoog(tekst, f) {
  var delen = tekst.split(" "), uit = [], x = 0, y = 0;
  for (var i = 0; i < delen.length; i++) {
    var k = delen[i].indexOf(","), a = Math.round(Number(delen[i].slice(0, k)) * f), b = Math.round(Number(delen[i].slice(k + 1)) * f);
    if (i === 0) { x = a; y = b; } else { x += a; y += b; }
    uit.push([x, y]);
  }
  return uit;
}

function ringPunten(refs, bogen) {
  var pts = [];
  for (var i = 0; i < refs.length; i++) {
    var r = refs[i], boog = bogen[r < 0 ? ~r : r], n = boog.length;
    for (var j = pts.length ? 1 : 0; j < n; j++) pts.push(r < 0 ? boog[n - 1 - j] : boog[j]);
  }
  return pts;
}

// het pad zoals het kaartscript het schrijft (maak-kaarten.mjs, pad): "M" absoluut, "l" de verschillen, "Z" bij een vlak
function padVan(ringen, bogen, gesloten, f) {
  function g(n) { return String(n / f); }
  var uit = "";
  for (var i = 0; i < ringen.length; i++) {
    var pts = ringPunten(ringen[i], bogen);
    if (gesloten) pts.pop();
    var s = "M" + g(pts[0][0]) + "," + g(pts[0][1]);
    if (pts.length > 1) {
      var d = [];
      for (var j = 1; j < pts.length; j++) d.push(g(pts[j][0] - pts[j - 1][0]) + "," + g(pts[j][1] - pts[j - 1][1]));
      s += "l" + d.join(" ");
    }
    uit += s + (gesloten ? "Z" : "");
  }
  return uit;
}

function itemUit(it, bogen, gesloten, f) {
  var nieuw = {};
  for (var k in it) {
    if (k === "r") nieuw.d = padVan(it.r, bogen, gesloten, f);
    else nieuw[k] = it[k];
  }
  return nieuw;
}

// kaart met bogen -> kaart in de T2a-vorm (een nieuw object; de invoer blijft ongewijzigd)
export function pakUit(kaart) {
  if (kaart.formaat !== FORMAAT) throw new Error("onbekend kaartformaat: " + kaart.formaat);
  var f = Math.round(1 / kaart.afronding), bogen = [];
  for (var i = 0; i < kaart.bogen.length; i++) bogen.push(leesBoog(kaart.bogen[i], f));
  var uit = {};
  for (var k in kaart) {
    if (k === "formaat" || k === "afronding" || k === "bogen") continue;
    if (k === "achtergrond") uit[k] = kaart[k].map(function(it) { return itemUit(it, bogen, true, f); });
    else if (k === "lagen") {
      uit[k] = kaart[k].map(function(l) {
        var nl = {};
        for (var m in l) nl[m] = m === "items" ? l.items.map(function(it) { return it.r ? itemUit(it, bogen, l.soort !== "lijn", f) : it; }) : l[m];
        return nl;
      });
    } else uit[k] = kaart[k];
  }
  return uit;
}
