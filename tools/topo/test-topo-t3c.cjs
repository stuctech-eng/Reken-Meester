// Test van T3c in Chromium: benoemen (S1, kiezen en typen) en relaties (S3) in het oefenscherm (plan T3 par. 5).
// Vervangt de iPhone-controle niet.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: NODE_PATH=$(npm root -g) node tools/topo/test-topo-t3c.cjs <url preview-build> [map voor schermafbeeldingen]
// Controles (428 x 746, en het past-in-beeld ook op 375 x 667):
//   - S1 kiezen (Provincies benoemen): de kaart staat boven de keuzes, met het gevraagde gebied oranje en zonder "Dit is mijn
//     antwoord"; de keuzes staan zonder scrollen in beeld; het juiste antwoord geeft "Goed zo";
//   - S1 typen (schakelaar Typen): een tekstvak met Controleer; de naam in kleine letters is goed; een bewerking ernaast is fout met
//     "Bijna goed, let op de spelling"; Controleer staat zonder scrollen in beeld;
//   - S3 (Provinciehoofdsteden): een vraag zonder kaart, met keuzes; het juiste antwoord geeft "Goed zo";
//   - geen fouten van de pagina.

var playwright = require("playwright");
var URL = process.argv[2], MAP = process.argv[3];
var n = 0, fouten = [];
function eis(ok, tekst) { n++; if (!ok) fouten.push(tekst); }

(async function() {
  var b = await playwright.chromium.launch(), paginaFouten = [];
  async function nieuw(w, h) { var p = await b.newPage({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }); await p.addInitScript(function() { window.__TOPO_TEST = true; }); p.on("pageerror", function(e) { paginaFouten.push(e.message); }); return p; }
  async function naar(p, vaardigheid, typen) {
    await p.goto(URL); await p.waitForTimeout(800);
    await p.getByText(/Topografie/).first().click(); await p.waitForTimeout(200);
    await p.getByText(/Nederland en België/).first().click(); await p.waitForTimeout(300);
    if (typen !== undefined) { await p.getByText(typen ? "Typen" : "Kiezen", { exact: true }).first().click(); await p.waitForTimeout(200); }
    await p.getByText(vaardigheid, { exact: true }).click(); await p.waitForTimeout(1500);
  }
  function antwoord(p) { return p.evaluate(function() { return window.__TOPO_APP ? window.__TOPO_APP.doelen.filter(function(d) { return d.id === window.__TOPO_APP.antwoordId; })[0].naam : null; }); }
  function onderInBeeld(p, selector) { return p.evaluate(function(sel) { var els = document.querySelectorAll(sel), r = els.length ? els[els.length - 1].getBoundingClientRect() : null; return r ? { onder: Math.round(r.bottom), hoogte: innerHeight, scroll: scrollY } : null; }, selector); }

  for (var maat of [[428, 746], [375, 667]]) {
    var w = maat[0], h = maat[1];
    // S1 kiezen
    var p = await nieuw(w, h);
    await naar(p, "Provincies benoemen", false);
    var info = await p.evaluate(function() { return { svg: !!document.querySelector("svg[aria-label^='Kaart']"), bevestig: document.body.innerText.indexOf("Dit is mijn antwoord") >= 0, oranje: !!document.querySelector("path[fill='#f97316'], circle[fill='#f97316']") }; });
    eis(info.svg && !info.bevestig && info.oranje, w + ": benoemen toont de kaart met een oranje gebied, zonder Dit is mijn antwoord (" + JSON.stringify(info) + ")");
    var naam = await antwoord(p);
    var keuzes = await p.evaluate(function() { return Array.prototype.map.call(document.querySelectorAll("button"), function(x) { return x.innerText.trim(); }); });
    eis(keuzes.indexOf(naam) >= 0, w + ": de juiste naam " + naam + " staat bij de keuzes");
    var ob = await p.evaluate(function(naam) { var k = Array.prototype.filter.call(document.querySelectorAll("button"), function(x) { return x.innerText.trim() === naam; })[0]; var r = k.getBoundingClientRect(); var alle = Array.prototype.filter.call(document.querySelectorAll("button"), function(x) { return x.getBoundingClientRect().top > r.top - 200; }); var onder = Math.max.apply(null, alle.map(function(x) { return x.getBoundingClientRect().bottom; })); return { onder: Math.round(onder), hoogte: innerHeight, scroll: scrollY }; }, naam);
    eis(ob.scroll === 0 && ob.onder <= ob.hoogte, w + ": de keuzes staan zonder scrollen in beeld (" + JSON.stringify(ob) + ")");
    if (MAP && w === 428) await p.screenshot({ path: MAP + "/t3c-benoem.png" });
    await p.getByRole("button", { name: naam, exact: true }).click(); await p.waitForTimeout(400);
    eis((await p.evaluate(function() { return document.body.innerText; })).indexOf("Goed zo") >= 0, w + ": benoemen, het juiste antwoord geeft Goed zo");
    await p.close();

    // S1 typen
    var t = await nieuw(w, h);
    await naar(t, "Provincies benoemen", true);
    var vak = await t.$("input[aria-label='Typ de naam']");
    eis(!!vak, w + ": met Typen een tekstvak");
    var ct = await onderInBeeld(t, "[aria-label='Controleer']");
    eis(ct && ct.scroll === 0 && ct.onder <= ct.hoogte, w + ": Controleer staat zonder scrollen in beeld (" + JSON.stringify(ct) + ")");
    if (MAP && w === 428) await t.screenshot({ path: MAP + "/t3c-typen.png" });
    var nm = await antwoord(t);
    if (vak) { await vak.fill(nm.toLowerCase()); await t.getByRole("button", { name: "Controleer" }).click(); await t.waitForTimeout(400); }
    eis((await t.evaluate(function() { return document.body.innerText; })).indexOf("Goed zo") >= 0, w + ": typen in kleine letters (" + nm.toLowerCase() + ") is goed");
    // de volgende vraag: een letter weg = bijna goed (fout)
    await t.waitForTimeout(1800);
    var volg = t.getByRole("button", { name: /Volgende vraag/ });
    if (await volg.count()) { await volg.first().click(); await t.waitForTimeout(500); }
    var nm2 = await antwoord(t), vak2 = await t.$("input[aria-label='Typ de naam']");
    var fout = nm2.slice(0, 2) + nm2.slice(3);
    if (vak2) { await vak2.fill(fout); await t.getByRole("button", { name: "Controleer" }).click(); await t.waitForTimeout(500); }
    var tekst = await t.evaluate(function() { return document.body.innerText; });
    eis(tekst.indexOf("Antwoord: " + nm2) >= 0 && tekst.indexOf("Bijna goed, let op de spelling") >= 0, w + ": " + fout + " bij " + nm2 + " is fout met de melding bijna goed");
    if (MAP && w === 428) await t.screenshot({ path: MAP + "/t3c-bijna.png" });
    await t.close();

    // S3 relatie
    var r = await nieuw(w, h);
    await naar(r, "Provinciehoofdsteden", false);
    var rv = await r.evaluate(function() { return { svg: !!document.querySelector("svg[aria-label^='Kaart']"), tekst: document.body.innerText }; });
    eis(!rv.svg && /hoofdstad/.test(rv.tekst), w + ": een relatievraag zonder kaart");
    if (MAP && w === 428) await r.screenshot({ path: MAP + "/t3c-relatie.png" });
    await r.close();
  }

  eis(paginaFouten.length === 0, "geen fouten van de pagina: " + paginaFouten.join(" | "));
  await b.close();
  console.log("test-topo-t3c: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
  fouten.forEach(function(f) { console.log("  - " + f); });
  if (fouten.length) process.exit(1);
})();
