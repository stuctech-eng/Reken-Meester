// Test van T5a in Chromium (plan T5 par. 6). Vervangt de iPhone-controle niet.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: NODE_PATH=$(npm root -g) node tools/topo/test-topo-t5a.cjs <url build> [map voor schermafbeeldingen]
// Controles (428 x 746, en nb24 ook op 375 x 667):
//   - het modusscherm van Nederland en Belgie heeft de kopjes Basis, Gevorderd en Meesterschap, en "0 van 38 gekend" bij nb13;
//   - het modusscherm van een rekenmodus heeft geen kopjes per niveau (ongewijzigd);
//   - nb13 los oefenen: een vraag "In welke provincie" of "Tik de provincie aan waarin"; bij aanwijzen het provincievlak;
//   - nb02 los oefenen: na een fout aangewezen buurprovincie staat de uitleg onder de feedback ("Ze grenzen aan elkaar." of een richting);
//   - nb24 los oefenen, terwijl de modus op Kiezen staat: een tekstvak en Controleer, geen keuzeknoppen; Controleer in beeld op 375;
//   - geen fout van de pagina.

var playwright = require("playwright");
var URL = process.argv[2], MAP = process.argv[3];
var n = 0, fouten = [];
function eis(ok, tekst) { n++; if (!ok) fouten.push(tekst); }

(async function() {
  var b = await playwright.chromium.launch(), paginaFouten = [];
  async function nieuw(w, h) { var p = await b.newPage({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); await p.addInitScript(function() { window.__TOPO_TEST = true; }); p.on("pageerror", function(e) { paginaFouten.push(e.message); }); return p; }
  async function modus(p) {
    await p.goto(URL); await p.waitForTimeout(800);
    await p.getByText(/Topografie/).first().click(); await p.waitForTimeout(200);
    await p.getByText(/Nederland en België/).first().click();
    await p.waitForSelector("[data-itemregel=nb13]", { timeout: 15000 });
  }
  async function los(p, label) { await modus(p); await p.getByText(label, { exact: true }).click(); await p.waitForTimeout(1500); }

  // 1 het modusscherm
  var p = await nieuw(428, 746);
  await modus(p);
  var kop = await p.evaluate(function() { return Array.prototype.map.call(document.querySelectorAll("[data-niveau]"), function(e) { return e.getAttribute("data-niveau") + ":" + e.innerText; }); });
  eis(kop.join(",") === "B:BASIS,G:GEVORDERD,M:MEESTERSCHAP" || kop.join(",").toUpperCase() === "B:BASIS,G:GEVORDERD,M:MEESTERSCHAP", "kopjes Basis, Gevorderd, Meesterschap (" + kop.join(",") + ")");
  var r13 = await p.evaluate(function() { var e = document.querySelector("[data-itemregel=nb13]"); return e ? e.innerText : null; });
  eis(r13 === "0 van 38 gekend", "nb13: 0 van 38 gekend (" + r13 + ")");
  if (MAP) await p.screenshot({ path: MAP + "/t5a-modus.png", fullPage: true });
  // rekenmodus: geen kopjes
  await p.goto(URL); await p.waitForTimeout(800);
  await p.getByText(/Rekenen/).first().click(); await p.waitForTimeout(300);
  await p.locator("text=/van [0-9]+ skills/").first().waitFor({ timeout: 3000 }).catch(function() {});
  var eerste = p.getByText(/Optellen/).first();
  if (await eerste.count()) { await eerste.click(); await p.waitForTimeout(800); }
  eis((await p.locator("[data-niveau]").count()) === 0, "rekenmodus: geen kopjes per niveau");
  await p.close();

  // 2 nb13
  var q = await nieuw(428, 746);
  await los(q, "Steden: in welke provincie?");
  var tekst = await q.evaluate(function() { return document.body.innerText; });
  eis(/In welke (Belgische )?provincie ligt|Tik de (Belgische )?provincie aan waarin/.test(tekst), "nb13: een vraag naar de provincie van een stad");
  if (MAP) await q.screenshot({ path: MAP + "/t5a-nb13.png" });
  await q.close();

  // 3 nb02: uitleg na een fout (een buurprovincie aantikken)
  var u = await nieuw(428, 746), gezien = 0;
  await los(u, "Provincies aanwijzen");
  for (var poging = 0; poging < 4 && !gezien; poging++) {
    var ander = await u.evaluate(function() {
      var h = window.__TOPO_APP, a = h.doelen.filter(function(d) { return d.id === h.antwoordId; })[0];
      var rest = h.doelen.filter(function(d) { return d.id !== h.antwoordId && d.soort === "vlak"; });
      rest.sort(function(x, y) { return Math.hypot(x.mx - a.mx, x.my - a.my) - Math.hypot(y.mx - a.mx, y.my - a.my); });
      return rest[0].id;
    });
    await u.evaluate(function(id) { var h = window.__TOPO_APP, d = h.doelen.filter(function(x) { return x.id === id; })[0]; h.zet(1, d.mx, d.my); }, ander);
    await u.waitForTimeout(100);
    var pt = await u.evaluate(function(id) { var h = window.__TOPO_APP, s = h.schaal(), v = h.venster(), d = h.doelen.filter(function(x) { return x.id === id; })[0]; var r = document.querySelector("svg[aria-label^='Kaart']").getBoundingClientRect(); return { x: r.left + (d.mx - v.x) * s, y: r.top + (d.my - v.y) * s }; }, ander);
    await u.touchscreen.tap(pt.x, pt.y); await u.waitForTimeout(150);
    await u.getByText("Dit is mijn antwoord").click(); await u.waitForTimeout(400);
    var fu = await u.evaluate(function() { var e = document.querySelector("[data-foutuitleg]"); return e ? e.innerText : ""; });
    if (fu) { gezien = 1; eis(/Ze grenzen aan elkaar\.|ligt ten (noord|oost|zuid|west)/.test(fu), "nb02: de uitleg na een fout (" + fu + ")"); if (MAP) await u.screenshot({ path: MAP + "/t5a-uitleg.png" }); }
    else { await u.getByRole("button", { name: /^Volgende vraag/ }).first().click(); await u.waitForTimeout(500); }
  }
  eis(gezien === 1, "nb02: na een fout naast het juiste gebied verschijnt de uitleg");
  await u.close();

  // 4 nb24: alleen typen, ook op Kiezen; op 428 en 375
  for (var maat of [[428, 746], [375, 667]]) {
    var t = await nieuw(maat[0], maat[1]);
    await los(t, "Lege kaart: provincies en hoofdsteden");
    var info = await t.evaluate(function() {
      var vak = document.querySelector("input[aria-label='Typ de naam']"), ct = document.querySelector("[aria-label='Controleer']");
      var r = ct ? ct.getBoundingClientRect() : null;
      var namen = window.__TOPO_APP ? window.__TOPO_APP.doelen.map(function(d) { return d.naam; }) : [];
      var keuzes = Array.prototype.filter.call(document.querySelectorAll("button"), function(x) { return namen.indexOf(x.innerText.trim()) >= 0; }).length;
      return { vak: !!vak, onder: r ? Math.round(r.bottom) : null, hoogte: innerHeight, scroll: scrollY, keuzes: keuzes };
    });
    eis(info.vak && info.keuzes === 0, maat[0] + ": nb24 heeft een tekstvak en geen keuzeknoppen, ook op Kiezen (" + JSON.stringify(info) + ")");
    eis(info.onder !== null && info.scroll === 0 && info.onder <= info.hoogte, maat[0] + ": Controleer zonder scrollen in beeld (" + JSON.stringify(info) + ")");
    if (MAP && maat[0] === 428) await t.screenshot({ path: MAP + "/t5a-nb24.png" });
    await t.close();
  }

  eis(paginaFouten.length === 0, "geen fouten van de pagina: " + paginaFouten.join(" | "));
  await b.close();
  console.log("test-topo-t5a: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
  fouten.forEach(function(f) { console.log("  - " + f); });
  if (fouten.length) process.exit(1);
})();
