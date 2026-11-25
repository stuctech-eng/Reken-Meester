// Test van T4 in Chromium: beheersing per item in de app (plan T4 par. 9). Vervangt de iPhone-controle niet.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: NODE_PATH=$(npm root -g) node tools/topo/test-topo-t4.cjs <url preview-build> [map voor schermafbeeldingen]
// Controles (428 x 746):
//   - het modusscherm toont bij elke vaardigheid "x van y gekend" (nb01: 0 van 6, nb04: 0 van 12);
//   - los oefenen (Provincies aanwijzen): een fout gebied komt na 3 tot 5 vragen terug;
//   - een echte sessie (Start nieuwe vaardigheid, nb01): 3 goed en stoppen; daarna "0 van 6 gekend, nog 3 nieuw" (gekend vraagt
//     2 dagen), en de lokale opslag (cumlaude_save_<eigenaar>) heeft 3 kennisitems in topo.items; na herladen hetzelfde;
//   - op 375 x 667: de keuzes onder de kaart (Welk land is oranje?) staan zonder scrollen in beeld;
//   - geen fout van de pagina.

var playwright = require("playwright");
var URL = process.argv[2], MAP = process.argv[3];
var n = 0, fouten = [];
function eis(ok, tekst) { n++; if (!ok) fouten.push(tekst); }

(async function() {
  var b = await playwright.chromium.launch(), paginaFouten = [];
  var ctx = await b.newContext({ viewport: { width: 428, height: 746 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await ctx.addInitScript(function() { window.__TOPO_TEST = true; });
  var p = await ctx.newPage();
  p.on("pageerror", function(e) { paginaFouten.push(e.message); });

  async function naarModusScherm() {
    await p.goto(URL); await p.waitForTimeout(800);
    await p.getByText(/Topografie/).first().click(); await p.waitForTimeout(200);
    await p.getByText(/Nederland en België/).first().click();
    await p.waitForSelector("[data-itemregel=nb01]", { timeout: 15000 });
  }
  function regel(id) { return p.evaluate(function(id) { var e = document.querySelector("[data-itemregel=" + id + "]"); return e ? e.innerText : null; }, id); }
  function huidig() { return p.evaluate(function() { var h = window.__TOPO_APP; if (!h) return null; var d = h.doelen.filter(function(x) { return x.id === h.antwoordId; })[0]; return { id: h.antwoordId, naam: d.naam, aanwijzen: document.body.innerText.indexOf("Dit is mijn antwoord") >= 0 || /^Tik /.test(document.body.innerText.split("\n").filter(function(r) { return /^Tik /.test(r); })[0] || "") }; }); }
  async function tikOp(id) {
    await p.evaluate(function(id) { var h = window.__TOPO_APP, d = h.doelen.filter(function(x) { return x.id === id; })[0]; h.zet(1, d.soort === "punt" ? d.x : d.mx, d.soort === "punt" ? d.y : d.my); }, id);
    await p.waitForTimeout(100);
    var pt = await p.evaluate(function(id) { var h = window.__TOPO_APP, s = h.schaal(), v = h.venster(), d = h.doelen.filter(function(x) { return x.id === id; })[0]; var r = document.querySelector("svg[aria-label^='Kaart']").getBoundingClientRect(); var x = d.soort === "punt" ? d.x : d.mx, y = d.soort === "punt" ? d.y : d.my; return { x: r.left + (x - v.x) * s, y: r.top + (y - v.y) * s }; }, id);
    await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(150);
    await p.getByText("Dit is mijn antwoord").click(); await p.waitForTimeout(300);
  }
  // een antwoord geven: goed of fout; aanwijzen op de kaart of een keuze
  async function antwoord(goed) {
    var h = await huidig();
    var kaartVraag = (await p.getByText("Dit is mijn antwoord").count()) > 0 || (await p.evaluate(function() { return !!document.querySelector("svg[aria-label^='Kaart']") && !document.querySelector("path[fill='#f97316'], circle[fill='#f97316']"); }));
    if (kaartVraag) {
      var ander = await p.evaluate(function() { var h = window.__TOPO_APP; return h.doelen.filter(function(d) { return d.id !== h.antwoordId; })[0].id; });
      await tikOp(goed ? h.id : ander);
    } else {
      var naam = goed ? h.naam : await p.evaluate(function(juist) { var k = Array.prototype.map.call(document.querySelectorAll("button"), function(x) { return x.innerText.trim(); }); var h = window.__TOPO_APP; var namen = h.doelen.map(function(d) { return d.naam; }); return k.filter(function(t) { return t !== juist && namen.indexOf(t) >= 0; })[0]; }, h.naam);
      await p.getByRole("button", { name: naam, exact: true }).click(); await p.waitForTimeout(300);
    }
    return h;
  }
  async function volgende(vorigId) {
    var knop = p.getByRole("button", { name: /^Volgende vraag/ });
    if (await knop.count()) { await knop.first().click(); }
    for (var t = 0; t < 40; t++) { await p.waitForTimeout(100); var h = await huidig(); if (h && (h.id !== vorigId || !(await p.evaluate(function() { return document.body.innerText.indexOf("Goed zo") >= 0; })))) break; }
    await p.waitForTimeout(300);
  }

  // 1 het modusscherm
  await naarModusScherm();
  var r1 = await regel("nb01"), r4 = await regel("nb04");
  eis(r1 === "0 van 6 gekend" && r4 === "0 van 12 gekend", "modusscherm: 0 van 6 gekend (nb01) en 0 van 12 gekend (nb04) (" + r1 + ", " + r4 + ")");
  if (MAP) await p.screenshot({ path: MAP + "/t4-modus.png" });

  // 2 los oefenen: een fout komt terug
  await p.getByText("Provincies aanwijzen", { exact: true }).click(); await p.waitForTimeout(1500);
  var fout = await antwoord(false);
  await volgende(fout.id);
  var terug = null;
  for (var i = 1; i <= 7; i++) {
    var h = await huidig();
    if (h.id === fout.id) { terug = i; break; }
    await antwoord(true); await volgende(h.id);
  }
  eis(terug !== null && terug >= 3 && terug <= 5, "los oefenen: het fout aangewezen gebied komt terug na 3 tot 5 vragen (bij vraag " + terug + " erna)");

  // 3 een echte sessie: 3 goed, stoppen, de regel en de opslag
  await naarModusScherm();
  await p.getByText("Start nieuwe vaardigheid").click(); await p.waitForTimeout(1500);
  for (var j = 0; j < 3; j++) { var hj = await antwoord(true); await volgende(hj.id); }
  await p.getByRole("button", { name: "✕" }).first().click(); await p.waitForTimeout(800);
  await naarModusScherm();
  var r1b = await regel("nb01");
  var opslag = await p.evaluate(function() { try { var k = Object.keys(localStorage).filter(function(x) { return x.indexOf("cumlaude_save_") === 0; }); if (k.length !== 1) return -3; var s = JSON.parse(localStorage.getItem(k[0])); return s && s.topo ? Object.keys(s.topo.items).length : -1; } catch (e) { return -2; } });
  eis(r1b === "0 van 6 gekend · nog 3 nieuw" && opslag === 3, "na 3 goede antwoorden: 0 van 6 gekend, nog 3 nieuw, en 3 kennisitems in de opslag (" + r1b + ", " + opslag + ")");
  if (MAP) await p.screenshot({ path: MAP + "/t4-na-sessie.png" });
  await p.reload(); await p.waitForTimeout(800);
  await naarModusScherm();
  eis((await regel("nb01")) === r1b, "na herladen dezelfde regel (" + (await regel("nb01")) + ")");

  // 4 kleine telefoon: de keuzes onder de kaart in beeld
  var k = await b.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await k.addInitScript(function() { window.__TOPO_TEST = true; });
  k.on("pageerror", function(e) { paginaFouten.push(e.message); });
  await k.goto(URL); await k.waitForTimeout(800);
  await k.getByText(/Topografie/).first().click(); await k.waitForTimeout(200);
  await k.getByText(/Nederland en België/).first().click(); await k.waitForTimeout(500);
  await k.getByText("Nederland en zijn buren", { exact: true }).click(); await k.waitForTimeout(1500);
  for (var z = 0; z < 6; z++) {
    var oranje = await k.evaluate(function() { return !!document.querySelector("path[fill='#f97316'], circle[fill='#f97316']"); });
    if (oranje) break;
    await k.reload(); await k.waitForTimeout(800);
    await k.getByText(/Topografie/).first().click(); await k.waitForTimeout(200);
    await k.getByText(/Nederland en België/).first().click(); await k.waitForTimeout(500);
    await k.getByText("Nederland en zijn buren", { exact: true }).click(); await k.waitForTimeout(1500);
  }
  var ob = await k.evaluate(function() { var namen = ["Nederland", "België", "Duitsland"]; var ks = Array.prototype.filter.call(document.querySelectorAll("button"), function(x) { return namen.indexOf(x.innerText.trim()) >= 0; }); var onder = Math.max.apply(null, ks.map(function(x) { return x.getBoundingClientRect().bottom; })); return { knoppen: ks.length, onder: Math.round(onder), hoogte: innerHeight, scroll: scrollY }; });
  eis(ob.knoppen === 3 && ob.scroll === 0 && ob.onder <= ob.hoogte, "375 x 667: de keuzes onder de kaart staan zonder scrollen in beeld (" + JSON.stringify(ob) + ")");
  if (MAP) await k.screenshot({ path: MAP + "/t4-klein.png" });

  eis(paginaFouten.length === 0, "geen fouten van de pagina: " + paginaFouten.join(" | "));
  await b.close();
  console.log("test-topo-t4: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
  fouten.forEach(function(f) { console.log("  - " + f); });
  if (fouten.length) process.exit(1);
})();
