// Test van T5c-2 in Chromium (plan T5c par. 5). Vervangt de iPhone-controle niet.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: NODE_PATH=$(npm root -g) node tools/topo/test-topo-t5c.cjs <url build> [map voor schermafbeeldingen]
// Controles (428 x 746):
//   - het modusscherm: nb15 0 van 44, nb18 0 van 50, nb19 0 van 32, nb20 0 van 48 gekend; het modusscherm laadt geen deel van de
//     kaart (alleen de basis);
//   - per nieuwe vaardigheid (los oefenen): de delen van de kaart volgens topoNlbeDelen (vaardigheden-nlbe.js): die van de
//     vaardigheden tot en met de volgende (ook eerdere, voor de herhaling) en vooruit die van de vaardigheid daarna; bij deze vier
//     zijn dat water en gebieden; bij nb27 (T5c-3) ook grens;
//     16 vragen, elk goed beantwoord (typen, kiezen of aanwijzen); elke vraag met een kaart geeft "Goed zo";
//   - nb18: minstens een kanaal aangewezen (een lijn, na de lijnproef van 26-11-2026); nb20: minstens een vraag naar de provincie
//     van een park;
//   - nb02 los oefenen laadt geen deel van de kaart;
//   - geen fout van de pagina.

var playwright = require("playwright");
var URL = process.argv[2], MAP = process.argv[3];
var n = 0, fouten = [];
function eis(ok, tekst) { n++; if (!ok) fouten.push(tekst); }

(async function() {
  var b = await playwright.chromium.launch(), paginaFouten = [], twijfels = [];
  async function nieuw(w, h) {
    var p = await b.newPage({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    await p.addInitScript(function() { window.__TOPO_TEST = true; });
    p.on("pageerror", function(e) { paginaFouten.push(e.message); });
    p.delen = [];
    p.on("request", function(r) { var m = /\/assets\/nlbe-(water|gebieden|grens)-/.exec(r.url()); if (m && p.delen.indexOf(m[1]) < 0) p.delen.push(m[1]); });
    return p;
  }
  async function modus(p) {
    await p.goto(URL); await p.waitForTimeout(800);
    await p.getByText(/Topografie/).first().click(); await p.waitForTimeout(200);
    await p.getByText(/Nederland en België/).first().click();
    await p.waitForSelector("[data-itemregel=nb15]", { timeout: 15000 });
  }
  async function los(p, label) { await modus(p); await p.getByText(label, { exact: true }).first().click(); await p.waitForTimeout(1500); }
  async function goed(pg) {
    // een vraag zonder kaart (een herhaling van een relatievraag): de testhaak kent het antwoord niet; een keuze aantikken en door
    if (!(await pg.locator("svg[aria-label^='Kaart']").count())) { await pg.locator("button").nth(3).click(); return; }
    var h = await pg.evaluate(function() { var h = window.__TOPO_APP; if (!h) return null; return { naam: h.doelen.filter(function(x) { return x.id === h.antwoordId; })[0].naam, id: h.antwoordId }; });
    if (await pg.locator("input[aria-label='Typ de naam']").count()) { await pg.fill("input[aria-label='Typ de naam']", h.naam); await pg.getByRole("button", { name: "Controleer" }).click(); return; }
    if (await pg.getByText("Dit is mijn antwoord").count()) {
      // het tikpunt: de stip, het middelpunt van het vlak of het middelste punt van de lijn
      await pg.evaluate(function(id) { var h = window.__TOPO_APP, d = h.doelen.filter(function(x) { return x.id === id; })[0]; var m = d.soort === "lijn" ? d.ringen[0][Math.floor(d.ringen[0].length / 2)] : null; h.zet(1, d.soort === "punt" ? d.x : m ? m[0] : d.mx, d.soort === "punt" ? d.y : m ? m[1] : d.my); }, h.id);
      await pg.waitForTimeout(100);
      var pt = await pg.evaluate(function(id) { var h = window.__TOPO_APP, s = h.schaal(), v = h.venster(), d = h.doelen.filter(function(x) { return x.id === id; })[0]; var r = document.querySelector("svg[aria-label^='Kaart']").getBoundingClientRect(); var m = d.soort === "lijn" ? d.ringen[0][Math.floor(d.ringen[0].length / 2)] : null; var x = d.soort === "punt" ? d.x : m ? m[0] : d.mx, y = d.soort === "punt" ? d.y : m ? m[1] : d.my; return { x: r.left + (x - v.x) * s, y: r.top + (y - v.y) * s }; }, h.id);
      await pg.touchscreen.tap(pt.x, pt.y); await pg.waitForTimeout(250);
      // een tik bij twee doelen (twijfel): de keuzelijst of ingezoomd; dan het juiste kiezen uit de lijst, of nog een keer tikken
      for (var poging = 0; poging < 3 && await pg.getByText("Dit is mijn antwoord").isDisabled(); poging++) {
        var info = await pg.evaluate(function() { return document.body.innerText.slice(0, 300); });
        twijfels.push(h.naam + ": " + info.replace(/\s+/g, " ").slice(0, 160));
        var inLijst = pg.getByRole("button", { name: h.naam, exact: true });
        if (await inLijst.count()) await inLijst.first().click();
        else { var pt2 = await pg.evaluate(function(id) { var h = window.__TOPO_APP, s = h.schaal(), v = h.venster(), d = h.doelen.filter(function(x) { return x.id === id; })[0]; var r = document.querySelector("svg[aria-label^='Kaart']").getBoundingClientRect(); var m = d.soort === "lijn" ? d.ringen[0][Math.floor(d.ringen[0].length / 2)] : null; var x = d.soort === "punt" ? d.x : m ? m[0] : d.mx, y = d.soort === "punt" ? d.y : m ? m[1] : d.my; return { x: r.left + (x - v.x) * s, y: r.top + (y - v.y) * s }; }, h.id); await pg.touchscreen.tap(pt2.x, pt2.y); }
        await pg.waitForTimeout(250);
      }
      await pg.getByText("Dit is mijn antwoord").click(); return;
    }
    await pg.getByRole("button", { name: h.naam, exact: true }).first().click();
  }

  // 1 het modusscherm
  var p = await nieuw(428, 746);
  await modus(p);
  await p.waitForTimeout(1000);
  var regels = await p.evaluate(function() { var u = {}; ["nb15", "nb18", "nb19", "nb20"].forEach(function(id) { var e = document.querySelector("[data-itemregel=" + id + "]"); u[id] = e ? e.innerText : null; }); return u; });
  eis(regels.nb15 === "0 van 44 gekend" && regels.nb18 === "0 van 50 gekend" && regels.nb19 === "0 van 32 gekend" && regels.nb20 === "0 van 48 gekend", "modusscherm: de balken van nb15, nb18, nb19, nb20 (" + JSON.stringify(regels) + ")");
  eis(p.delen.length === 0, "het modusscherm laadt geen deel van de kaart (" + p.delen.join(", ") + ")");
  if (MAP) await p.screenshot({ path: MAP + "/t5c-modus.png", fullPage: true });
  await p.close();

  // 2 de nieuwe vaardigheden
  var GEVAL = [["Rivieren en zeearmen", "water"], ["Meren en kanalen", "water"], ["Streken en landschappen", "gebieden"], ["Nationale parken", "gebieden"], ["Grensgemeenten", "grens"]];
  for (var g of GEVAL) {
    var v = await nieuw(428, 746), kaartVragen = 0, goedZo = 0, kanaal = 0, park = 0;
    await los(v, g[0]);
    await v.waitForTimeout(1500);
    var DELEN = g[1] === "grens" ? "gebieden,grens,water" : "gebieden,water";
    eis(v.delen.slice().sort().join() === DELEN, g[0] + ": laadt de delen " + DELEN + " (" + v.delen.join(", ") + ")");
    for (var i = 0; i < 16; i++) {
      var vraag = await v.evaluate(function() { var e = document.querySelector("h1, h2, [data-vraag]"); return document.body.innerText; });
      var metKaart = (await v.locator("svg[aria-label^='Kaart']").count()) > 0;
      if (/Tik het kanaal/.test(vraag)) kanaal++;
      if (/In welke (Belgische )?provincie ligt het/.test(vraag)) park++;
      await goed(v);
      await v.waitForTimeout(600);
      var na = await v.evaluate(function() { return document.body.innerText; });
      if (metKaart) { kaartVragen++; if (/Goed zo/.test(na)) goedZo++; }
      if (MAP && i === 3) await v.screenshot({ path: MAP + "/t5c-" + g[1] + "-" + i + "-" + g[0].split(" ")[0].toLowerCase() + ".png" });
      await v.waitForTimeout(1300);
      var volg = v.getByRole("button", { name: /^Volgende vraag/ });
      if (await volg.count()) { await volg.first().click(); await v.waitForTimeout(400); }
    }
    eis(kaartVragen >= 2 && goedZo === kaartVragen, g[0] + ": elke vraag met een kaart goed beantwoord (" + goedZo + " van " + kaartVragen + ")");
    if (g[0] === "Meren en kanalen") eis(kanaal >= 1, "nb18: minstens een kanaal aangewezen (" + kanaal + ")");
    if (g[0] === "Nationale parken") eis(park >= 1, "nb20: minstens een vraag naar de provincie van een park (" + park + ")");
    await v.close();
  }

  // 3 nb02 laadt geen deel
  var w = await nieuw(428, 746);
  await los(w, "Provincies aanwijzen");
  await w.waitForTimeout(1500);
  eis(w.delen.length === 0, "nb02 los oefenen laadt geen deel van de kaart (" + w.delen.join(", ") + ")");
  await w.close();

  console.log("tikken met twijfel (keuzelijst of inzoomen): " + twijfels.length + (twijfels.length ? ": " + twijfels.join(" | ") : ""));
  eis(paginaFouten.length === 0, "geen fouten van de pagina: " + paginaFouten.join(" | "));
  await b.close();
  console.log("test-topo-t5c: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
  fouten.forEach(function(f) { console.log("  - " + f); });
  if (fouten.length) process.exit(1);
})();
