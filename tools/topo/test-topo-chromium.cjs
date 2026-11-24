// Test van Topografie in de app in Chromium (plan T3 par. 5, stap T3b). Vervangt de iPhone-controle niet.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: twee builds serveren, dan
//   NODE_PATH=$(npm root -g) node tools/topo/test-topo-chromium.cjs <url preview-build> <url productie-build> [map voor schermafbeeldingen]
// (preview: VERCEL_ENV=preview npx vite build; productie: npx vite build; elk met npx vite preview --outDir ...)
// Controles:
//   - op 320, 375, 390 en 428 px is de kaart de schermbreedte min 32 px (de maat van de iPhone-proef en de tikmeting van T2);
//   - goed: tik op het gevraagde gebied, bevestig: "Goed zo"; het gebied staat groen;
//   - fout: tik op een ander gebied, bevestig: fout, en de balk noemt het juiste gebied;
//   - keuzelijst: "Iets anders kiezen" toont alle gebieden van de laag; kiezen en bevestigen werkt;
//   - zoomen met + en terug met Zoom x1;
//   - laadfout: als het kaartbestand niet laadt, een zichtbare melding met Opnieuw en Terug;
//   - productie: Topografie staat niet op Home;
//   - geen fout van de pagina (pageerror) in de hele test.

var playwright = require("playwright");
var PREVIEW = process.argv[2], PROD = process.argv[3], MAP = process.argv[4];
var n = 0, fouten = [];
function eis(ok, tekst) { n++; if (!ok) fouten.push(tekst); }

function doelPunt(p, id) {
  return p.evaluate(function(id) {
    var h = window.__TOPO_APP, s = h.schaal(), v = h.venster(), d = h.doelen.filter(function(x) { return x.id === (id || h.antwoordId); })[0];
    var r = document.querySelector("svg[aria-label^='Kaart']").getBoundingClientRect();
    var x = d.soort === "punt" ? d.x : d.mx, y = d.soort === "punt" ? d.y : d.my;
    return { x: r.left + (x - v.x) * s, y: r.top + (y - v.y) * s, id: d.id, naam: d.naam, breedte: r.width, zichtbaar: x >= v.x && x <= v.x + v.w && y >= v.y && y <= v.y + v.h };
  }, id || null);
}
// het doel in beeld brengen (de testhaak zet de zoom en het midden; zoals slepen)
async function inBeeld(p, id) {
  await p.evaluate(function(id) { var h = window.__TOPO_APP, d = h.doelen.filter(function(x) { return x.id === (id || h.antwoordId); })[0]; h.zet(1, d.soort === "punt" ? d.x : d.mx, d.soort === "punt" ? d.y : d.my); }, id || null);
  await p.waitForTimeout(100);
}
async function naarModus(p, url) {
  await p.goto(url); await p.waitForTimeout(800);
  await p.getByText(/Topografie/).first().click(); await p.waitForTimeout(200);
  await p.getByText(/Nederland en België/).first().click(); await p.waitForTimeout(300);
  await p.getByText("Start nieuwe vaardigheid").click(); await p.waitForTimeout(1200);
}
function balk(p) { return p.evaluate(function() { var b = document.querySelector("[aria-live=polite]"); return b ? b.innerText : ""; }); }

(async function() {
  var b = await playwright.chromium.launch();
  var paginaFouten = [];
  async function nieuw(w, h) { var p = await b.newPage({ viewport: { width: w, height: h || 746 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); p.on("pageerror", function(e) { paginaFouten.push(e.message); }); return p; }

  for (var w of [320, 375, 390, 428]) {
    var p = await nieuw(w);
    await naarModus(p, PREVIEW);
    var pt = await doelPunt(p);
    eis(Math.round(pt.breedte) === w - 32, w + " px: de kaart is " + (w - 32) + " px breed (" + pt.breedte + ")");
    if (w === 428 && MAP) await p.screenshot({ path: MAP + "/t3b-vraag.png" });
    // goed
    await inBeeld(p); pt = await doelPunt(p);
    await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(150);
    eis((await balk(p)) === "Gekozen: " + pt.naam, w + " px: na de tik is " + pt.naam + " gekozen (" + (await balk(p)) + ")");
    await p.getByText("Dit is mijn antwoord").click(); await p.waitForTimeout(300);
    eis((await p.evaluate(function() { return document.body.innerText; })).indexOf("Goed zo") >= 0, w + " px: goed antwoord geeft Goed zo");
    if (w === 428 && MAP) await p.screenshot({ path: MAP + "/t3b-goed.png" });
    await p.close();
  }

  // fout, keuzelijst en zoom (428 px)
  var q = await nieuw(428);
  await naarModus(q, PREVIEW);
  var ander = await q.evaluate(function() { var h = window.__TOPO_APP; return h.doelen.filter(function(d) { return d.id !== h.antwoordId; })[0].id; });
  var juist = await doelPunt(q);
  await inBeeld(q, ander); var pa = await doelPunt(q, ander);
  await q.touchscreen.tap(pa.x, pa.y); await q.waitForTimeout(150);
  await q.getByText("Dit is mijn antwoord").click(); await q.waitForTimeout(300);
  var tekst = await balk(q);
  eis(tekst === "Jij koos " + pa.naam + ". Groen is " + juist.naam + ".", "fout antwoord: de balk noemt het juiste gebied (" + tekst + ")");
  if (MAP) await q.screenshot({ path: MAP + "/t3b-fout.png" });
  await q.getByText(/Volgende vraag/).click(); await q.waitForTimeout(500);
  var aantal = await q.evaluate(function() { return window.__TOPO_APP.doelen.length; });
  await q.getByText("Iets anders kiezen").click(); await q.waitForTimeout(200);
  var lijst = await q.evaluate(function() { var d = document.querySelector("[role=dialog][aria-label=Keuzelijst]"); return d ? d.querySelectorAll("button").length - 1 : -1; });
  eis(lijst === aantal, "keuzelijst toont alle " + aantal + " gebieden (" + lijst + ")");
  if (MAP) await q.screenshot({ path: MAP + "/t3b-lijst.png" });
  var naam = (await doelPunt(q)).naam;
  await q.locator("[role=dialog][aria-label=Keuzelijst] button", { hasText: naam }).first().click(); await q.waitForTimeout(150);
  eis((await balk(q)) === "Gekozen: " + naam, "keuzelijst: " + naam + " gekozen");
  await q.getByText("Dit is mijn antwoord").click(); await q.waitForTimeout(300);
  eis((await q.evaluate(function() { return document.body.innerText; })).indexOf("Goed zo") >= 0, "keuzelijst: bevestigen geeft Goed zo");
  await q.getByRole("button", { name: "Inzoomen" }).click(); await q.waitForTimeout(150);
  eis(await q.evaluate(function() { return document.body.innerText.indexOf("x2") >= 0; }), "inzoomen naar x2");
  await q.getByText("Zoom x1").click(); await q.waitForTimeout(150);
  eis(await q.evaluate(function() { return document.body.innerText.indexOf("x1") >= 0; }), "terug naar x1");
  await q.close();

  // laadfout: het kaartbestand wordt geweigerd
  var c = await b.newContext({ viewport: { width: 428, height: 746 }, isMobile: true, hasTouch: true });
  await c.route(/\/assets\/nlbe-.*\.js$/, function(r) { r.abort(); });
  var f = await c.newPage();
  await f.goto(PREVIEW); await f.waitForTimeout(800);
  await f.getByText(/Topografie/).first().click(); await f.waitForTimeout(200);
  await f.getByText(/Nederland en België/).first().click(); await f.waitForTimeout(300);
  await f.getByText("Start nieuwe vaardigheid").click(); await f.waitForTimeout(1500);
  var ft = await f.evaluate(function() { var a = document.querySelector("[role=alert]"); return a ? a.innerText : ""; });
  eis(ft.indexOf("De kaart kon niet laden") >= 0 && ft.indexOf("Opnieuw") >= 0 && ft.indexOf("Terug") >= 0, "laadfout: zichtbare melding met Opnieuw en Terug (" + ft.replace(/\n/g, " ") + ")");
  if (MAP) await f.screenshot({ path: MAP + "/t3b-laadfout.png" });
  await c.close();

  // productie: geen Topografie
  var pr = await nieuw(428);
  await pr.goto(PROD); await pr.waitForTimeout(1000);
  var home = await pr.evaluate(function() { return document.body.innerText; });
  eis(home.indexOf("Rekenen") >= 0 && home.indexOf("Topografie") < 0 && home.indexOf("Nederland en België") < 0, "productie: Topografie staat niet op Home");
  await pr.close();

  eis(paginaFouten.length === 0, "geen fouten van de pagina: " + paginaFouten.join(" | "));
  await b.close();
  console.log("test-topo-chromium: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
  fouten.forEach(function(f) { console.log("  - " + f); });
  if (fouten.length) process.exit(1);
})();
