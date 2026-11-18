// De relatiesoorten van de kennisbank Topografie (plan T1 par. 1.4; bouwplan T2b-2 fase 6.1). Met de hand bijgehouden.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
// Per relatie: de vaste inverse, of hij symmetrisch is, de toegestane bron- en doelsoorten en de toegestane kwalificaties.
// Een kwalificatie is { type: "getal" } of { waarden: [...] }. De inverse heeft dezelfde kwalificaties (T1 par. 1.4).
// De inverse-soorten worden hieronder uit de heenrichting gemaakt, zodat ze nooit apart worden ingevoerd.

var BESTUURLIJK = ["land", "gebied", "bijzonder-gebied", "gewest", "provincie", "district", "gemeente", "taalgebied"];
var WATER = ["oceaan", "zee", "baai", "zeestraat", "meer", "zeearm", "rivier", "riviertak", "kanaal"];

var HEEN = [
  { id: "hoofdstad-van", inverse: "heeft-hoofdstad", bronSoorten: ["stad"], doelSoorten: ["land"], kwalificaties: {} },
  { id: "regeringszetel-van", inverse: "heeft-regeringszetel", bronSoorten: ["stad", "district"], doelSoorten: ["land"], kwalificaties: {} },
  { id: "wetgevende-hoofdstad-van", inverse: "heeft-wetgevende-hoofdstad", bronSoorten: ["stad"], doelSoorten: ["land"], kwalificaties: {} },
  { id: "gerechtelijke-hoofdstad-van", inverse: "heeft-gerechtelijke-hoofdstad", bronSoorten: ["stad"], doelSoorten: ["land"], kwalificaties: {} },
  { id: "bestuurlijke-hoofdstad-van", inverse: "heeft-bestuurlijke-hoofdstad", bronSoorten: ["stad"], doelSoorten: ["land"], kwalificaties: {} },
  { id: "provinciehoofdstad-van", inverse: "heeft-provinciehoofdstad", bronSoorten: ["stad"], doelSoorten: ["provincie"], kwalificaties: {} },
  { id: "gewesthoofdstad-van", inverse: "heeft-gewesthoofdstad", bronSoorten: ["stad"], doelSoorten: ["gewest"], kwalificaties: {} },
  { id: "bevoegd-in", inverse: "valt-onder-gemeenschap", bronSoorten: ["gemeenschap"], doelSoorten: ["taalgebied"], kwalificaties: { reikwijdte: { waarden: ["taalgebied", "instellingen"] } } },
  { id: "ligt-in", inverse: "bevat", bronSoorten: ["stad", "agglomeratie", "gemeente", "provincie", "taalgebied", "natuurgebied", "bergtop", "vulkaan", "meer", "eiland"], doelSoorten: BESTUURLIJK.concat(["werelddeel", "regio"]), kwalificaties: {} },
  { id: "gemeente-van", inverse: "omvat-woonplaats", bronSoorten: ["stad"], doelSoorten: ["gemeente"], kwalificaties: {} },
  { id: "grenst-aan", inverse: "grenst-aan", symmetrisch: true, bronSoorten: BESTUURLIJK, doelSoorten: BESTUURLIJK, kwalificaties: { km: { type: "getal" }, via: { waarden: ["land", "beide", "binnenwater"] } } },
  { id: "stroomt-door", inverse: "wordt-doorstroomd-door", bronSoorten: ["rivier", "riviertak"], doelSoorten: BESTUURLIJK, kwalificaties: {} },
  { id: "ontspringt-in", inverse: "bron-van", bronSoorten: ["rivier", "riviertak"], doelSoorten: BESTUURLIJK.concat(["gebergte"]), kwalificaties: {} },
  { id: "mondt-uit-in", inverse: "ontvangt", bronSoorten: ["rivier", "riviertak", "kanaal"], doelSoorten: WATER, kwalificaties: {} },
  { id: "ligt-aan", inverse: "heeft-aan-oever", bronSoorten: ["stad", "agglomeratie"], doelSoorten: WATER, kwalificaties: {} },
  { id: "hoort-bij", inverse: "omvat", bronSoorten: ["eiland", "eilandengroep", "riviermonding"], doelSoorten: ["eilandengroep", "rivier"], kwalificaties: {} },
  { id: "onder-soevereiniteit-van", inverse: "soeverein-over", bronSoorten: ["gebied"], doelSoorten: ["land"], kwalificaties: {} },
  { id: "bestuurlijk-verantwoordelijk", inverse: "verantwoordelijk-voor", bronSoorten: ["gebied"], doelSoorten: ["land", "gebied"], kwalificaties: {} },
  { id: "deel-van-koninkrijk", inverse: "koninkrijk-omvat", bronSoorten: ["land", "gebied"], doelSoorten: ["gebied"], kwalificaties: {} },
  { id: "bijzondere-gemeente-van", inverse: "heeft-bijzondere-gemeente", bronSoorten: ["gebied"], doelSoorten: ["land"], kwalificaties: {} },
  { id: "lijkt-op", inverse: "lijkt-op", symmetrisch: true, bronSoorten: ["land"], doelSoorten: ["land"], kwalificaties: {} },
  { id: "ligt-in-gebergte", inverse: "bevat-top", bronSoorten: ["bergtop", "vulkaan"], doelSoorten: ["gebergte"], kwalificaties: {} }
];

function maakRelaties(heen) {
  var uit = {};
  heen.forEach(function(r) {
    uit[r.id] = { id: r.id, inverse: r.inverse, symmetrisch: !!r.symmetrisch, bronSoorten: r.bronSoorten, doelSoorten: r.doelSoorten, kwalificaties: r.kwalificaties, richting: "heen" };
    if (!r.symmetrisch) uit[r.inverse] = { id: r.inverse, inverse: r.id, symmetrisch: false, bronSoorten: r.doelSoorten, doelSoorten: r.bronSoorten, kwalificaties: r.kwalificaties, richting: "terug" };
  });
  return uit;
}

export var RELATIES_HEEN = HEEN;
export var RELATIES = maakRelaties(HEEN);
export { maakRelaties };
