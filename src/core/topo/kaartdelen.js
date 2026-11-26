// De delen van een kaart (plan T5c par. 3.3): de app laadt eerst de basis en daarna alleen de delen die de vaardigheden nodig
// hebben. Een laag die hier niet staat, hoort bij de basis. De basis kent van elke laag wel de items (de id's), zodat het
// modusscherm de balken van alle vaardigheden kan tonen; de vormen van de lagen van een deel komen pas met dat deel.
// Dit kleine bestand staat in de standaardbundel; het kaartscript (tools/topo/maak-kaartdelen.mjs) gebruikt dezelfde indeling.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.

export var KAARTDELEN = {
  nlbe: {
    water: ["waddenzee", "meren", "zeearmen", "rivieren-nl", "rivieren-vlak", "kanalen"],
    gebieden: ["streken", "streken-be", "parken", "parken-be"],
    grens: ["taalgebieden", "grensgemeenten", "baarle", "grenspunten"]
  }
};

// Het deel van een laag: "basis" of de naam van het deel
export function deelVanLaag(kaartId, laagId) {
  var delen = KAARTDELEN[kaartId] || {};
  var namen = Object.keys(delen);
  for (var i = 0; i < namen.length; i++) if (delen[namen[i]].indexOf(laagId) >= 0) return namen[i];
  return "basis";
}

// De delen ("kaart/deel") die een reeks lagen ({ kaart, laag }) nodig heeft, zonder de basis; gesorteerd en zonder dubbele
export function delenVoorLagen(lagen) {
  var gezien = {};
  lagen.forEach(function(x) { var d = deelVanLaag(x.kaart, x.laag); if (d !== "basis") gezien[x.kaart + "/" + d] = 1; });
  return Object.keys(gezien).sort();
}
