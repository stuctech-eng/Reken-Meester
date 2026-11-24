// Test van Topografie in de app in Chromium (plan T3 par. 5, stap T3b). Vervangt de iPhone-controle niet.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: twee builds serveren, dan
//   NODE_PATH=$(npm root -g) node tools/topo/test-topo-chromium.cjs <url preview-build> <url productie-build> [map voor schermafbeeldingen]
// (preview: VERCEL_ENV=preview npx vite build; productie: npx vite build; elk met npx vite preview --outDir ...)
// Controles:
//   - op 320, 375, 390 en 428 px is de kaart de schermbreedte min 32 px (de maat van de iPhone-proef en de tikmeting van T2);
//   - goed: tik op het gevraagde gebied, bevestig: "Goed zo"; het gebied staat groen;
//   - geen naam vóór het bevestigen (besluit 24-11-2026): de balk noemt geen naam, de naam van het antwoord staat alleen in de
//     vraag, er is geen lijst met namen en geen knop "Iets anders kiezen";
//   - fout: tik op een ander gebied, bevestig: fout, en de balk noemt het juiste gebied;
//   - twijfel (steden): de kaart zoomt in rond de tik, zonder namen;
//   - zoomen met + en terug met Zoom x1;
//   - laadfout: als het kaartbestand of de code van de kaart niet laadt, een zichtbare melding met Opnieuw en Terug;
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
  async function nieuw(w, h) { var p = await b.newPage({ viewport: { width: w, height: h || 746 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); await p.addInitScript(function() { window.__TOPO_TEST = true; }); p.on("pageerror", function(e) { paginaFouten.push(e.message); }); return p; }
  // hoe vaak de naam in het kaartgedeelte staat (de kaart, de balk en de knoppen; de vraag en de kop van de vaardigheid niet)
  function telNaam(p, naam) { return p.evaluate(function(naam) { var root = document.querySelector("svg[aria-label^='Kaart']").parentElement.parentElement; return root.innerText.split(naam).length - 1 + (root.innerHTML.indexOf(naam) >= 0 ? 1 : 0); }, naam); }

  for (var w of [320, 375, 390, 428]) {
    var p = await nieuw(w);
    await naarModus(p, PREVIEW);
    var pt = await doelPunt(p);
    eis(Math.round(pt.breedte) === w - 32, w + " px: de kaart is " + (w - 32) + " px breed (" + pt.breedte + ")");
    if (w === 428 && MAP) await p.screenshot({ path: MAP + "/t3b-vraag.png" });
    // goed
    await inBeeld(p); pt = await doelPunt(p);
    await p.touchscreen.tap(pt.x, pt.y); await p.waitForTimeout(150);
    eis((await balk(p)) === "Gekozen: het groene gebied", w + " px: na de tik zegt de balk alleen het groene gebied (" + (await balk(p)) + ")");
    eis((await telNaam(p, pt.naam)) === 0, w + " px: de naam " + pt.naam + " staat niet in het kaartgedeelte (tekst en HTML)");
    eis((await p.getByText("Iets anders kiezen").count()) === 0 && (await p.locator("[role=dialog]").count()) === 0, w + " px: geen lijst met namen");
    await p.getByText("Dit is mijn antwoord").click(); await p.waitForTimeout(300);
    eis((await p.evaluate(function() { return document.body.innerText; })).indexOf("Goed zo") >= 0, w + " px: goed antwoord geeft Goed zo");
    if (w === 428 && MAP) await p.screenshot({ path: MAP + "/t3b-goed.png" });
    await p.close();
  }

  // fout en zoom (428 px)
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
  // na een fout: de pagina scrolt naar beneden, met de tip en onderaan precies een knop Volgende vraag in beeld (Dick, foto 2)
  await q.waitForTimeout(900);
  var vk = await q.evaluate(function() { var ks = Array.prototype.filter.call(document.querySelectorAll("button"), function(x) { return x.innerText.indexOf("Volgende vraag") === 0; }); var r = ks.length ? ks[0].getBoundingClientRect() : null; var tip = document.body.innerText.indexOf("TIP") >= 0; return { knoppen: ks.length, scroll: scrollY, onder: r ? r.bottom : null, top: r ? r.top : null, hoogte: innerHeight, tip: tip }; });
  eis(vk.knoppen === 1 && vk.scroll > 0 && vk.top >= 0 && vk.onder <= vk.hoogte && vk.tip, "na een fout: naar beneden gescrold, de tip en een knop Volgende vraag in beeld (" + JSON.stringify(vk) + ")");
  await q.getByRole("button", { name: /^Volgende vraag/ }).click(); await q.waitForTimeout(500);
  eis((await q.evaluate(function() { return document.body.innerText.indexOf("Dit is mijn antwoord") >= 0 && window.scrollY === 0; })), "Volgende vraag: een nieuwe vraag, bovenaan");

  await q.getByRole("button", { name: "Inzoomen" }).click(); await q.waitForTimeout(150);
  eis(await q.evaluate(function() { return document.body.innerText.indexOf("x2") >= 0; }), "inzoomen naar x2");
  await q.getByRole("button", { name: "Zoom x1" }).click(); await q.waitForTimeout(150);
  eis(await q.evaluate(function() { return document.body.innerText.indexOf("x1") >= 0; }), "terug naar x1");
  await q.close();

  // twijfel: los oefenen "Steden aanwijzen" (nb06); een tik waar de tikregel niet kiest zoomt in, zonder namen
  var t = await nieuw(428);
  await t.goto(PREVIEW); await t.waitForTimeout(800);
  await t.getByText(/Topografie/).first().click(); await t.waitForTimeout(200);
  await t.getByText(/Nederland en België/).first().click(); await t.waitForTimeout(300);
  await t.getByText("Steden aanwijzen", { exact: true }).click(); await t.waitForTimeout(1500);
  var plek = await t.evaluate(function() {
    var h = window.__TOPO_APP, r = document.querySelector("svg[aria-label^='Kaart']").getBoundingClientRect();
    for (var y = 2; y < r.height; y += 2) for (var x = 2; x < r.width; x += 2) if (h.uitkomst(x, y) === "twijfel") return { x: r.left + x, y: r.top + y };
    return null;
  });
  eis(!!plek, "twijfel: er is een plek op de kaart van de steden waar de tikregel niet kiest");
  if (plek) {
    await t.touchscreen.tap(plek.x, plek.y); await t.waitForTimeout(300);
    var tb = await balk(t);
    eis(tb.indexOf("Niet duidelijk") === 0, "twijfel: de balk zegt dat het niet duidelijk was (" + tb + ")");
    eis(await t.evaluate(function() { return document.body.innerText.indexOf("x2") >= 0; }), "twijfel: de kaart is ingezoomd naar x2");
    eis((await t.locator("[role=dialog]").count()) === 0, "twijfel: geen lijst met namen");
    if (MAP) await t.screenshot({ path: MAP + "/t3b-twijfel.png" });
  }
  await t.close();

  // beginbeeld: bij "Provincies aanwijzen" staat heel de vraagset (Nederland) in beeld, bij elke vraag hetzelfde (428 x 746)
  var bb = await nieuw(428, 746);
  await bb.goto(PREVIEW); await bb.waitForTimeout(800);
  await bb.getByText(/Topografie/).first().click(); await bb.waitForTimeout(200);
  await bb.getByText(/Nederland en België/).first().click(); await bb.waitForTimeout(300);
  await bb.getByText("Provincies aanwijzen", { exact: true }).click(); await bb.waitForTimeout(1500);
  function beeldInfo() { return bb.evaluate(function() { var v = window.__TOPO_APP.venster(); return { x: v.x, y: v.y, w: v.w, h: v.h }; }); }
  var focus = await bb.evaluate(function() { var h = window.__TOPO_APP; return h.focus; });
  var b1 = await beeldInfo();
  eis(focus && b1.y <= focus[1] + 0.5 && b1.y + b1.h >= focus[3] - 0.5 && b1.x <= focus[0] + 0.5 && b1.x + b1.w >= focus[2] - 0.5, "beginbeeld: heel Nederland in beeld (" + JSON.stringify(b1) + " om " + JSON.stringify(focus) + ")");
  if (MAP) await bb.screenshot({ path: MAP + "/t3b-provincies.png" });
  var pb = await doelPunt(bb); await inBeeld(bb); pb = await doelPunt(bb);
  await bb.touchscreen.tap(pb.x, pb.y); await bb.waitForTimeout(150);
  await bb.getByText("Dit is mijn antwoord").click(); await bb.waitForTimeout(300);
  await bb.getByText(/Volgende vraag/).click(); await bb.waitForTimeout(500);
  var b2 = await beeldInfo();
  eis(JSON.stringify(b1) === JSON.stringify(b2), "beginbeeld: de volgende vraag begint met hetzelfde beeld");
  await bb.close();

  // zonder de testhaak: de pagina bevat het antwoord niet
  var z = await b.newPage({ viewport: { width: 428, height: 746 }, isMobile: true, hasTouch: true });
  await naarModus(z, PREVIEW);
  eis(await z.evaluate(function() { return window.__TOPO_APP === undefined; }), "zonder test geen testhaak met het antwoord");
  await z.close();

  // laadfout: de code van de kaart wordt geweigerd
  var c2 = await b.newContext({ viewport: { width: 428, height: 746 }, isMobile: true, hasTouch: true });
  await c2.route(/\/assets\/KaartAntwoord-.*\.js$/, function(r) { r.abort(); });
  var f2 = await c2.newPage();
  await f2.goto(PREVIEW); await f2.waitForTimeout(800);
  await f2.getByText(/Topografie/).first().click(); await f2.waitForTimeout(200);
  await f2.getByText(/Nederland en België/).first().click(); await f2.waitForTimeout(300);
  await f2.getByText("Start nieuwe vaardigheid").click(); await f2.waitForTimeout(1500);
  var ft2 = await f2.evaluate(function() { var a = document.querySelector("[role=alert]"); return a ? a.innerText : ""; });
  eis(ft2.indexOf("De kaart kon niet laden") >= 0 && ft2.indexOf("Terug") >= 0, "laadfout van de kaartcode: zichtbare melding met Opnieuw en Terug (" + ft2.replace(/\n/g, " ") + ")");
  await c2.close();

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
