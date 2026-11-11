import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { DEFAULT_SAVE, dClone, calcXp, getTitel } from "./core/save.js";
import { getNextSkill, getSkillOrder, getSubject } from "./core/subjects.js";
import { mergeSessionSkills, pasBewerkingToe, herbouw, normaliseer, zonderSyncVelden } from "./core/voortgang.js";
import { initAuth, volgInlog, huidigeInlog } from "./services/firebase.js";
import { laadServer, slaOp } from "./services/sync.js";
import { maakSchrijfplek, probeerLock, pakIn1Locks } from "./services/schrijfplek.js";
import { maakOpslagrij } from "./services/opslagrij.js";
import { LOKAAL, leesAccount, zetAccount, toestandVoor, isAccountSleutel, leesIn1Uid, zetIn1UidEenmalig } from "./services/accountstaat.js";
import { maakAccount, logIn, logUit, startAnoniem, stuurWachtwoordHerstel, foutTekst } from "./services/account.js";
import { herlaad } from "./services/herlaad.js";
import { claimUsername, updateGlobalLeaderboard, updateSubjectLeaderboard } from "./services/leaderboard.js";
import { T, D } from "./styles/tokens.js";

import HomeScreen        from "./screens/HomeScreen.jsx";
import SubjectScreen     from "./screens/SubjectScreen.jsx";
import PracticeScreen    from "./screens/PracticeScreen.jsx";
import ResultScreen      from "./screens/ResultScreen.jsx";
import LeaderboardScreen from "./screens/LeaderboardScreen.jsx";
import SettingsScreen    from "./screens/SettingsScreen.jsx";
import UsernameScreen    from "./screens/UsernameScreen.jsx";
import BottomSheet       from "./components/BottomSheet.jsx";

var SHEET_TABS = [
  { id: "leaderboard", label: "Scores", icon: "🏆" },
  { id: "more",        label: "Meer",   icon: "⋯"       },
];

// ── Opslag (plan IN, fase IN-1) ───────────────────────────────────────
// Elke wijziging van de voortgang is een bewerking (core/voortgang.js). Een actie legt haar bewerking eerst
// vast in de wachtrij van de eigen schrijfplek (services/schrijfplek.js), past haar toe op saveRef.current,
// zet de stand (zetStand, de enige plek met setSave), schrijft de lokale kopie (cumlaude_save) en vraagt
// daarna een opslag aan (services/opslagrij.js). De opslag is een Firestore-transactie die de serverstand
// leest en daarop de openstaande bewerkingen toepast (services/sync.js). Mislukt het vastleggen in de
// wachtrij, dan wordt de actie afgebroken en staat er een melding in beeld.
// Open concept: de lopende sessie, na elk antwoord bijgewerkt (per schrijfplek; nooit verstuurd).
// De oude wachtrij en het oude concept (van voor IN-1) worden bij het opstarten één keer omgezet.
// IN-2 (account): de gegevens staan per eigenaar (uid of "lokaal"); welke eigenaar actief is, staat in
// rekenmeester_account (services/accountstaat.js). Elke actie gaat door de poort magSchrijven(); een wissel van
// speler gebeurt onder de Web Lock rekenmeester_wissel, met het slot dicht.
var OUD_CONCEPT_KEY = "rekenmeester_concept";
var OUD_QUEUE_KEY   = "rekenmeester_wachtrij";
var CONCEPT_VERSION = 1;
var LS_KEY          = "cumlaude_save";
var WISSEL_LOCK     = "rekenmeester_wissel";
var FOUT_SESSIE     = "Opslaan op dit toestel lukt niet; je laatste sessie is niet bewaard. Maak ruimte vrij of controleer de instellingen van Safari.";
var FOUT_WIJZIGING  = "Opslaan op dit toestel lukt niet; je wijziging is niet bewaard. Maak ruimte vrij of controleer de instellingen van Safari.";
var FOUT_GEBLOKKEERD = "Opslaan kan nu niet: er wordt van speler gewisseld. Je laatste actie is niet bewaard.";

function readLS(key) {
  try { var s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch(e) { return null; }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}
function removeLS(key) {
  try { localStorage.removeItem(key); } catch(e) {}
}
function vandaag() { return new Date().toISOString().slice(0, 10); }
function gisteren() { return new Date(Date.now() - 86400000).toISOString().slice(0, 10); }

// JSON met gesorteerde sleutels (alleen voor het omzetten van de oude wachtrij: vergelijking met pre en post)
function stableStr(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStr).join(",") + "]";
  return "{" + Object.keys(v).sort().map(function(k) { return JSON.stringify(k) + ":" + stableStr(v[k]); }).join(",") + "}";
}

// ── Auto-modus ──────────────────────────────────────────────────────
// Vaste volgorde; na een behaald level gaat Auto naar de volgende modus die nog een level
// kan opleveren. Volledig beheerste (of niet-beschikbare) modi worden overgeslagen.
// Drie stappen:
//   1. + − × ÷ (altijd);
//   2. Breuken, Geld en Kommagetallen, als de basis er is: in vermenigvuldigen én delen zijn
//      de eerste AUTO_BASIS_SKILLS skills (alle tafels) beheerst;
//   3. Meten, Tijd, Procenten en Reizen, als stap 2 er is én de voorkennis (AUTO_PRAKTISCH_DREMPEL):
//      in breuken, kommagetallen en geld zijn de eerste skills (de blokken "begrijpen") beheerst.
// Beheerst = skillStats[id].mastered, net als bij de tafels; alleen oefenen telt niet.
var AUTO_ORDER        = ["optellen", "aftrekken", "vermenigvuldigen", "delen"];
var AUTO_EXTRA        = ["breuken", "geld", "kommagetallen"];
var AUTO_PRAKTISCH    = ["meten", "tijd", "procenten", "reizen"];
var AUTO_BASIS_SKILLS = 18;
// Voorkennis voor stap 3: breuken b01-b08 (begrijpen, gelijkwaardig), kommagetallen k01-k09
// (begrijpen, breuk en kommagetal), geld g01-g04 (geld kennen); samen 21 skills
var AUTO_PRAKTISCH_DREMPEL = { breuken: 8, kommagetallen: 9, geld: 4 };

function eersteBeheerst(saveObj, id, n) {
  var stats = (saveObj.subjects && saveObj.subjects[id] && saveObj.subjects[id].skillStats) || {};
  return getSkillOrder(id).slice(0, n).every(function(sid) {
    return !!(stats[sid] && stats[sid].mastered);
  });
}

function autoBasisOk(saveObj) {
  return ["vermenigvuldigen", "delen"].every(function(id) {
    return eersteBeheerst(saveObj, id, AUTO_BASIS_SKILLS);
  });
}

function autoPraktischOk(saveObj) {
  if (!autoBasisOk(saveObj)) return false;
  return Object.keys(AUTO_PRAKTISCH_DREMPEL).every(function(id) {
    return eersteBeheerst(saveObj, id, AUTO_PRAKTISCH_DREMPEL[id]);
  });
}

// Welke stap van Auto (1, 2 of 3); ook voor de tekst op Home
function autoStap(saveObj) {
  if (!autoBasisOk(saveObj)) return 1;
  return autoPraktischOk(saveObj) ? 3 : 2;
}

function autoOrder(saveObj) {
  var stap = autoStap(saveObj);
  if (stap === 1) return AUTO_ORDER;
  if (stap === 2) return AUTO_ORDER.concat(AUTO_EXTRA);
  return AUTO_ORDER.concat(AUTO_EXTRA, AUTO_PRAKTISCH);
}

// Voorlopige stand: huidige opslag + de skills van deze sessie (niet opgeslagen)
function previewSave(saveObj, result) {
  var next = dClone(saveObj);
  next.subjects = next.subjects || {};
  var subj = next.subjects[result.subjectId] || {};
  subj.skillStats = mergeSessionSkills(result.subjectId, subj.skillStats || {}, result);
  next.subjects[result.subjectId] = subj;
  return next;
}

function canLevel(saveObj, id) {
  var subject = getSubject(id);
  if (!subject || subject.id !== id || !subject.available) return false;
  var stats = (saveObj.subjects && saveObj.subjects[id] && saveObj.subjects[id].skillStats) || {};
  return getNextSkill(id, stats).skillId !== null;
}

// includeFrom: fromId zelf eerst proberen (start). Anders eerst de volgende modi en als
// laatste fromId zelf (als alle andere modi volledig beheerst zijn).
function autoSubjectFrom(saveObj, fromId, includeFrom) {
  var order = autoOrder(saveObj);
  var start = order.indexOf(fromId);
  if (start === -1) start = 0;
  var first = includeFrom ? 0 : 1;
  var last  = includeFrom ? order.length - 1 : order.length;
  for (var k = first; k <= last; k++) {
    var id = order[(start + k) % order.length];
    if (canLevel(saveObj, id)) return id;
  }
  return null;
}

export default function App() {
  var uidState     = useState(null);
  var uid          = uidState[0];
  var setUid       = uidState[1];

  var saveState    = useState(dClone(DEFAULT_SAVE));
  var save         = saveState[0];
  var setSave      = saveState[1];

  // De laatst vastgelegde stand, altijd bij: acties rekenen hiermee, niet met een stand die nog niet
  // gerenderd is. zetStand is de enige plek die de stand verandert (plan IN, §3c).
  var saveRef      = useRef(save);
  function zetStand(next) {
    saveRef.current = next;
    setSave(next);
  }
  var uidRef       = useRef(null);

  // Schrijfplek van dit tabblad en de opslagrij (gezet bij het opstarten). gestartRef: het opstarten maar één
  // keer, ook als StrictMode (bij ontwikkelen) het effect twee keer uitvoert: anders claimt één tabblad twee plekken.
  var plekRef      = useRef(null);
  var rijRef       = useRef(null);
  var gestartRef   = useRef(false);
  // toegepastTot van de laatst bekende serverstand: wat er echt bewaard is (voor de status in Instellingen)
  var bevestigdRef = useRef({});
  // IN-2: de sessie (een teller in het geheugen, §22.4), het slot, de eigen wissel en de waarnemer (§22.3)
  var sessieRef        = useRef(0);
  var slotRef          = useRef("dicht");
  var zelfWisselendRef = useRef(false);
  var externRef        = useRef(false);
  var startKlaarRef    = useRef(false);
  var wisselLosRef     = useRef(null);
  var inlogState    = useState(null);
  var inlogInfo     = inlogState[0];
  var setInlogInfo  = inlogState[1];
  var blokkadeState = useState(null);
  var blokkade      = blokkadeState[0];
  var setBlokkade   = blokkadeState[1];
  var wisselState   = useState(null);
  var wisselScherm  = wisselState[0];
  var setWisselScherm = wisselState[1];
  var laadFoutState = useState(null);
  var laadFout      = laadFoutState[0];
  var setLaadFout   = laadFoutState[1];
  var externMeldState = useState(false);
  var externMelding = externMeldState[0];
  var setExternMelding = externMeldState[1];

  // Stand van de opslag (Instellingen) en een melding als vastleggen op dit toestel mislukt
  var opslagState  = useState({ plek: null, wachtend: 0, fout: null, laatste: null, oudTabblad: false });
  var opslagStatus = opslagState[0];
  var setOpslagStatus = opslagState[1];
  var meldingState = useState(null);
  var foutMelding  = meldingState[0];
  var setFoutMelding = meldingState[1];

  var loadState    = useState(true);
  var loading      = loadState[0];
  var setLoading   = loadState[1];

  var nameState    = useState(false);
  var needsName    = nameState[0];
  var setNeedsName = nameState[1];

  var screenState  = useState("home");
  var screen       = screenState[0];
  var setScreen    = screenState[1];

  var subjState    = useState("optellen");
  var subjectId    = subjState[0];
  var setSubjectId = subjState[1];

  // Los oefenen: id van de ene vaardigheid (null = gewone leerlijn). Telt nergens mee.
  var fixedSkillState   = useState(null);
  var fixedSkillId      = fixedSkillState[0];
  var setFixedSkillId   = fixedSkillState[1];

  var lvlState     = useState(1);
  var practiceLevel = lvlState[0];
  var setPracticeLevel = lvlState[1];

  var resState     = useState(null);
  var lastResult   = resState[0];
  var setLastResult = resState[1];

  // Auto: alleen in het geheugen. autoCountedRef: deze Auto-ronde telt al als sessie.
  var autoState       = useState(false);
  var autoActive      = autoState[0];
  var setAutoActive   = autoState[1];

  var pendingState    = useState(null);
  var pendingAuto     = pendingState[0];
  var setPendingAuto  = pendingState[1];

  var autoKeyState    = useState(0);
  var autoKey         = autoKeyState[0];
  var setAutoKey      = autoKeyState[1];

  var autoCountedRef  = useRef(false);

  // Scrollpositie bij schermwissel: de hele pagina scrolt, dus zonder dit opent een scherm
  // op de scrollpositie van het vorige scherm. Elk scherm begint bovenaan; Home krijgt bij
  // terugkeer zijn eigen laatste positie terug. Alleen in het geheugen, geen opslag.
  var screenRef       = useRef(screen);
  var homeScrollRef   = useRef(0);
  screenRef.current   = screen;

  useEffect(function() {
    function onScroll() {
      // Na een schermwissel kan de browser de positie bijstellen; dat telt niet als Home-positie
      if (screenRef.current === "home") homeScrollRef.current = window.scrollY;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return function() { window.removeEventListener("scroll", onScroll); };
  }, []);

  useLayoutEffect(function() {
    window.scrollTo(0, screen === "home" ? homeScrollRef.current : 0);
  }, [screen]);

  // Concept-sessie: herstel één keer na het laden; melding als de herstelde sessies bevestigd zijn
  var restoredRef     = useRef(false);
  // Herstelde sessies die nog bevestigd moeten worden: { nr (hoogste bewerkingsnummer), shown }
  var restoreWaitRef  = useRef(null);
  var noticeState     = useState(false);
  var restoreNotice   = noticeState[0];
  var setRestoreNotice = noticeState[1];

  // Vakken op Home: open of dicht per vak, alleen in het geheugen (na herstart weer ingeklapt)
  var openBoxesState  = useState({});
  var openBoxes       = openBoxesState[0];
  var setOpenBoxes    = openBoxesState[1];

  function toggleBox(id) {
    setOpenBoxes(function(prev) { var next = Object.assign({}, prev); next[id] = !prev[id]; return next; });
  }

  var sheetTabState = useState("leaderboard");
  var sheetTab      = sheetTabState[0];
  var setSheetTab   = sheetTabState[1];

  // ── Opslag ───────────────────────────────────────────────────────
  // De eigenaar van de gegevens op dit toestel: de uid, of "lokaal" zonder Firebase (plan §22.4)
  function eigenaar() { return uidRef.current || LOKAAL; }
  function locks() { return (typeof navigator !== "undefined" && navigator.locks) || null; }
  function inlogUid() { var i = huidigeInlog(); return i ? i.uid : null; }
  function isStabiel(acc) { return acc.soort === "anoniem" || acc.soort === "account" || acc.soort === "lokaal"; }

  // De poort (§22.4): mag deze actie nu iets schrijven? Synchroon, bij de start van elke actie.
  function magSchrijven() {
    if (slotRef.current !== "open" || externRef.current) return false;
    var acc = leesAccount(window.localStorage);
    if (!isStabiel(acc) || acc.uid !== eigenaar()) return false;
    if (uidRef.current && inlogUid() !== uidRef.current) return false;
    return true;
  }
  // Is u nog de eigenaar op dit toestel? Ook tijdens het eigen uitloggen (de laatste opslagronde).
  function eigenaarOk(u) {
    var acc = leesAccount(window.localStorage);
    if (isStabiel(acc) && acc.uid === u) return true;
    return acc.soort === "wissel" && acc.fase === "uitloggen" && acc.uid === u && zelfWisselendRef.current;
  }
  // Geldt een opslagronde nog (vaste identiteit { u, sessie }, §22.4)?
  function geldt(id) { return id.u === uidRef.current && id.sessie === sessieRef.current && eigenaarOk(id.u); }

  function lokaleKey(e) { return LS_KEY + "_" + e; }
  function lokaleBasis(e) { return normaliseer(readLS(lokaleKey(e))); }
  function bewaarLokaal(stand) {
    var e = eigenaar();
    if (eigenaarOk(e)) writeLS(lokaleKey(e), stand);
  }

  function werkStatus(patch) {
    var plek = plekRef.current;
    var e = eigenaar();
    setOpslagStatus(function(prev) {
      var next = Object.assign({}, prev, patch || {});
      next.plek = plek ? plek.plek() : null;
      next.wachtend = plek ? plek.wachtend(bevestigdRef.current, e) : 0;
      next.oudTabblad = !!plek && e !== leesIn1Uid(window.localStorage) && plek.in1Items() > 0;
      return next;
    });
  }

  // Een bewerking vastleggen in de eigen wachtrij; null (en een melding) als dat niet mag of niet lukt
  function legVast(inhoud, melding) {
    if (!magSchrijven()) { setFoutMelding(FOUT_GEBLOKKEERD); return null; }
    try {
      return plekRef.current.voegToe(inhoud, eigenaar());
    } catch (e) {
      setFoutMelding(melding);
      return null;
    }
  }

  // Een opslag aanvragen (zonder uid: alleen lokaal)
  function huidigeRonde() { return { u: uidRef.current, sessie: sessieRef.current }; }
  function planOpslag() {
    werkStatus();
    if (uidRef.current && rijRef.current) return rijRef.current.vraag(huidigeRonde());
    return Promise.resolve(false);
  }

  // Na een geslaagde transactie: de stand van de server plus wat er sindsdien nog in de wachtrijen kwam
  function naOpslag(id, stand) {
    if (!geldt(id)) return;
    bevestigdRef.current = stand.toegepastTot || {};
    var h = herbouw(stand, plekRef.current.alle(id.u));
    zetStand(h.stand);
    bewaarLokaal(h.stand);
    werkStatus({ fout: null, laatste: Date.now() });
    var w = restoreWaitRef.current;
    if (w && !w.shown && ((stand.toegepastTot || {})[w.schrijver] || 0) >= w.nr) {
      w.shown = true;
      setRestoreNotice(true);
    }
  }
  function naFout(id, fout) {
    if (id.u !== uidRef.current || id.sessie !== sessieRef.current) return;
    werkStatus({ fout: (fout && (fout.code || fout.message)) || "onbekende fout" });
  }

  // Een geldig concept als sessie-bewerking, of null
  function conceptSessie(c, e) {
    if (!c || c.v !== CONCEPT_VERSION || (c.uid || LOKAAL) !== e || !c.result || !(c.result.totalQuestions > 0) || c.result.conceptId !== c.id) return null;
    return { soort: "sessie", result: c.result, datum: vandaag(), gisteren: gisteren() };
  }

  // Oude wachtrij en oud concept (van voor IN-1) één keer omzetten. Een oud wachtrij-item wordt een
  // bewerking als de modus in de basis nog precies in de stand van vóór die sessie staat (pre); staat hij al
  // in de stand erna (post) of is er een conflict, dan niet. Zelfde regel als het oude restorePending.
  // Alle om te zetten items gaan in één schrijfactie in de wachtrij (alles of niets); pas daarna verdwijnt de
  // oude sleutel. Mislukt die schrijfactie, dan blijft alles zoals het was en gebeurt het bij de volgende
  // start opnieuw, zonder dat er al iets dubbel in de wachtrij staat.
  // Geeft { schrijver, nr } van het hoogste nieuwe nummer (null als er niets omgezet is).
  function zetOudOm(basis, u) {
    var hoogste = null;
    var e = eigenaar();
    var oud = readLS(OUD_QUEUE_KEY);
    if (Array.isArray(oud)) {
      var blocks = {};
      var om = [];
      // Al omgezet (crash tussen het vastleggen en het weghalen van de oude sleutel): niet nog eens
      var alOmgezet = {};
      plekRef.current.alle(e).forEach(function(w) { w.items.forEach(function(x) { if (x.oudId) alOmgezet[x.oudId] = true; }); });
      oud.slice().sort(function(a, b) { return ((a && a.seq) || 0) - ((b && b.seq) || 0); }).forEach(function(it) {
        if (!it || it.v !== CONCEPT_VERSION || it.uid !== u || !it.result || !it.subjectId) return;
        var b = Object.prototype.hasOwnProperty.call(blocks, it.subjectId) ? blocks[it.subjectId] : stableStr((basis.subjects && basis.subjects[it.subjectId]) || null);
        if (alOmgezet[it.id]) { blocks[it.subjectId] = it.post; return; }
        if (b !== it.pre) return;
        var r = it.result;
        r.conceptId = it.id;
        om.push({ soort: "sessie", oudId: it.id, result: r, datum: vandaag(), gisteren: gisteren() });
        blocks[it.subjectId] = it.post;
      });
      try {
        var nieuw = plekRef.current.voegMeerToe(om, e);
        if (nieuw.length > 0) hoogste = nieuw[nieuw.length - 1];
        removeLS(OUD_QUEUE_KEY);
      } catch (err) {
        setFoutMelding(FOUT_SESSIE);
      }
    }
    var c = readLS(OUD_CONCEPT_KEY);
    if (c) {
      if (c.uid === u && !plekRef.current.leesConcept(e)) {
        try { c.uid = e; plekRef.current.schrijfConcept(c, e); removeLS(OUD_CONCEPT_KEY); } catch (e2) {}
      } else {
        removeLS(OUD_CONCEPT_KEY);
      }
    }
    return hoogste;
  }

  // De IN-1-kopie cumlaude_save één keer overnemen (§22.3): alleen als de eigen kopie nog niet bestaat, en
  // alleen voor de IN-1-eigenaar; daarna wordt de oude sleutel verwijderd. Dit is de enige plek die hem leest.
  function neemOudeKopieOver(e) {
    var oud;
    try { oud = window.localStorage.getItem(LS_KEY); } catch (err) { return; }
    if (oud === null) return;
    try {
      if (e === leesIn1Uid(window.localStorage) && window.localStorage.getItem(lokaleKey(e)) === null) window.localStorage.setItem(lokaleKey(e), oud);
      window.localStorage.removeItem(LS_KEY);
    } catch (err2) {}
  }

  // Alle gegevens van een eigenaar op dit toestel wissen (IN-2-wachtrijen, concepten en de lokale kopie).
  // De IN-1-sleutels nooit (§22.3).
  function wisGegevens(e) {
    plekRef.current.wisEigenaar(e);
    removeLS(lokaleKey(e));
  }

  // De voortgang van een anonieme (of lokale) speler naar de volgende anonieme (of lokale) speler van dit toestel
  // (§22.5): eerst in één setItem de overname en de open concepten onder doel, pas daarna de sleutels van oud
  // wissen. Gooit als het vastleggen mislukt (dan is er niets gewist).
  function overname(oud, doel) {
    var plek = plekRef.current;
    var bronnen = plek.alle(oud);
    var kopie = readLS(lokaleKey(oud));
    var concepten = plek.alleConcepten(oud);
    if (bronnen.length > 0 || kopie || concepten.length > 0) {
      var stand = herbouw(normaliseer(kopie), bronnen).stand;
      var items = [{ soort: "overname", stand: zonderSyncVelden(stand) }];
      concepten.forEach(function(c) {
        var b = conceptSessie(c, oud);
        if (b && !plek.conceptAlVastgelegd(c.id, oud)) items.push(b);
      });
      plek.voegMeerToe(items, doel);
    }
    wisGegevens(oud);
  }

  // Een nieuwe eigenaar in deze app (na een wissel of herstel): uid, sessie en de stand
  function zetEigenaar(nieuwUid) {
    uidRef.current = nieuwUid;
    sessieRef.current = sessieRef.current + 1;
    bevestigdRef.current = {};
    setUid(nieuwUid);
  }

  // De basis laden (de server; zonder verbinding de lokale kopie), de oude opslag omzetten, IN-1-concepten
  // overnemen, de wachtrijen toepassen en een opslag aanvragen
  async function laadEnToon() {
    var e = eigenaar();
    var u = uidRef.current;
    var plek = plekRef.current;
    neemOudeKopieOver(e);
    var basis = null;
    if (u) {
      try { basis = await laadServer(u); bevestigdRef.current = basis.toegepastTot; } catch (err) { werkStatus({ fout: (err && (err.code || err.message)) || "geen verbinding" }); }
    }
    if (u !== uidRef.current) return;
    if (!basis) basis = lokaleBasis(e);
    var omgezet = zetOudOm(basis, u);
    if (omgezet) restoreWaitRef.current = { schrijver: omgezet.schrijver, nr: omgezet.nr, shown: false };
    try { await plek.neemIn1ConceptenOver(e, function(c) { return conceptSessie(c, e); }, false); } catch (err3) { setFoutMelding(FOUT_SESSIE); }
    // Een concept dat al als sessie vastligt (crash tussen vastleggen en wissen): wissen (§22.4)
    var eigen = plek.leesConcept(e);
    if (eigen && plek.conceptAlVastgelegd(eigen.id, e)) { try { plek.wisConcept(e); } catch (err4) {} }
    var h = herbouw(basis, plek.alle(e));
    zetStand(h.stand);
    bewaarLokaal(h.stand);
    setNeedsName(!h.stand.username && !!u);
    werkStatus();
    planOpslag();
  }

  // ── Wisselen en herstellen (plan §22.4 en §22.5) ─────────────────
  // De voortgang van een anonieme speler naar de volgende, of alleen de marker (vanaf een account)
  function herstelExtern(vorige, mijn) {
    var anoniemOfLokaal = function(t) { return t.soort === "anoniem" || t.soort === "lokaal"; };
    if (anoniemOfLokaal(vorige) && anoniemOfLokaal(mijn) && vorige.uid !== mijn.uid) {
      overname(vorige.uid, mijn.uid);
    } else if (vorige.uid !== mijn.uid) {
      setExternMelding(true);
    }
    zetEigenaar(mijn.uid === LOKAAL ? null : mijn.uid);
    zetAccount(window.localStorage, mijn);
  }

  // De toestand van de inlog van dit moment
  function mijnToestand() {
    var i = huidigeInlog();
    return i ? toestandVoor(i.uid, i.anoniem) : toestandVoor(null);
  }

  // Inloggen afmaken: alleen Firestore laden; pas als dat lukt de oude gegevens wissen en wisselen
  async function afrondenInloggen(oud, nieuw) {
    var stand;
    try {
      stand = await laadServer(nieuw);
    } catch (err) {
      setLaadFout({ oud: oud, nieuw: nieuw, fout: (err && (err.code || err.message)) || "geen verbinding" });
      return false;
    }
    wisGegevens(oud);
    zetEigenaar(nieuw);
    zetAccount(window.localStorage, toestandVoor(nieuw, false));
    var h = herbouw(stand, plekRef.current.alle(nieuw));
    bevestigdRef.current = stand.toegepastTot;
    zetStand(h.stand);
    bewaarLokaal(h.stand);
    setNeedsName(!h.stand.username);
    setLaadFout(null);
    return true;
  }

  // Annuleren na mislukt laden (§22.5): uitloggen van het account, een nieuwe anonieme speler, en de
  // voortgang van dit toestel daarheen
  async function annuleerVervolg(oud) {
    zetAccount(window.localStorage, { soort: "wissel", fase: "annuleren", uid: oud });
    try { await logUit(); } catch (err) {}
    var nieuw = null;
    try { nieuw = await startAnoniem(); } catch (err2) { nieuw = null; }
    var echt = huidigeInlog();
    if (echt && echt.uid !== nieuw) nieuw = echt.uid;
    overname(oud, nieuw || LOKAAL);
    zetEigenaar(nieuw);
    zetAccount(window.localStorage, toestandVoor(nieuw, true));
    setLaadFout(null);
  }

  // De eindcontrole van een eigen wissel (§22.3 punt 7): synchroon vergelijken en openen; bij een verschil het
  // herstel onder dezelfde lock, hoogstens 3 rondes
  function sluitAf() {
    if (inlogUid() !== uidRef.current) return false;
    zelfWisselendRef.current = false;
    slotRef.current = "open";
    setWisselScherm(null);
    return true;
  }
  async function eindcontrole() {
    for (var ronde = 0; ronde < 3; ronde++) {
      if (sluitAf()) return true;
      // De vorige toestand uit de marker (die de wissel net zette); zonder geldige marker als account: dan
      // wordt er nooit iets overgezet
      var vorige = leesAccount(window.localStorage);
      if (!isStabiel(vorige) || vorige.uid !== eigenaar()) vorige = toestandVoor(uidRef.current, false);
      herstelExtern(vorige, mijnToestand());
      await laadEnToon();
    }
    if (sluitAf()) return true;
    setBlokkade({ soort: "onrustig" });
    return false;
  }

  // Een onderbroken wissel afmaken of terugdraaien (§22.5, "Herstart midden in een wissel"). Geeft false als het
  // scherm "laden mislukt" in beeld staat (de lock blijft dan vast).
  async function herstelWissel(acc) {
    var mijn = mijnToestand();
    if (acc.fase === "inloggen") {
      if (mijn.uid === acc.uid) { zetEigenaar(acc.uid); zetAccount(window.localStorage, toestandVoor(acc.uid, true)); return true; }
      if (mijn.soort === "account") return await afrondenInloggen(acc.uid, mijn.uid);
      herstelExtern(toestandVoor(acc.uid, true), mijn);
      return true;
    }
    if (acc.fase === "annuleren") {
      if (mijn.soort === "account") { await annuleerVervolg(acc.uid); return true; }
      overname(acc.uid, mijn.uid);
      zetEigenaar(mijn.uid === LOKAAL ? null : mijn.uid);
      zetAccount(window.localStorage, mijn);
      return true;
    }
    // uitloggen
    if (mijn.uid === acc.uid) { zetEigenaar(acc.uid); zetAccount(window.localStorage, toestandVoor(acc.uid, false)); return true; }
    wisGegevens(acc.uid);
    zetEigenaar(mijn.uid === LOKAAL ? null : mijn.uid);
    zetAccount(window.localStorage, mijn);
    return true;
  }

  // Wachten tot een ander tabblad klaar is met wisselen of opstarten (§22.5): de luisteraar is er al vóór de
  // lock werd gevraagd; daarna nog een keer lezen, en elke 2 seconden als vangnet. Daarna opnieuw laden.
  var wachterRef = useRef(null);
  function startWachter() {
    if (wachterRef.current) return;
    function kijk() {
      if (!wachterRef.current || !wachterRef.current.actief) return;
      if (isStabiel(leesAccount(window.localStorage))) { stopWachter(); herlaad(); }
    }
    function bijOpslag(e) { if (e && e.key !== null && isAccountSleutel(e.key)) kijk(); }
    window.addEventListener("storage", bijOpslag);
    document.addEventListener("visibilitychange", kijk);
    var t = setInterval(kijk, 2000);
    wachterRef.current = { actief: false, kijk: kijk, stop: function() { window.removeEventListener("storage", bijOpslag); document.removeEventListener("visibilitychange", kijk); clearInterval(t); } };
  }
  function stopWachter() { if (wachterRef.current) { wachterRef.current.stop(); wachterRef.current = null; } }
  function wacht() {
    setBlokkade({ soort: "wacht" });
    wachterRef.current.actief = true;
    wachterRef.current.kijk();
  }

  // Bij het opstarten: de marker en de inlog in orde brengen (§22.4 "Het opstarten en de marker"). Geeft true als
  // de app verder kan; anders staat er een blokkade, het wachtscherm of het scherm "laden mislukt".
  async function regelEigenaar(userId, inlog) {
    var mijn = userId ? toestandVoor(userId, !inlog || inlog.anoniem) : toestandVoor(null);
    var acc = leesAccount(window.localStorage);
    if (acc.soort === "leesfout" || acc.soort === "ongeldig") { setBlokkade({ soort: acc.soort }); return false; }
    if (isStabiel(acc) && acc.uid === mijn.uid) {
      zetIn1UidEenmalig(window.localStorage, eigenaar());
      return true;
    }
    startWachter();
    var lk = locks() ? await probeerLock(locks(), WISSEL_LOCK) : { r: "fout" };
    if (lk.r === "bezet") { wacht(); return false; }
    if (lk.r === "fout" && acc.soort === "wissel") { stopWachter(); setBlokkade({ soort: "wissel-zonder-locks" }); return false; }
    stopWachter();
    var los = lk.los || function() {};
    // Dit tabblad voert nu zelf een wissel of herstel uit: de waarnemer beslist niets tot het klaar is
    zelfWisselendRef.current = true;
    try {
      acc = leesAccount(window.localStorage);
      if (acc.soort === "leesfout" || acc.soort === "ongeldig") { setBlokkade({ soort: acc.soort }); los(); return false; }
      if (acc.soort === "ontbreekt") {
        zetAccount(window.localStorage, mijn);
      } else if (acc.soort === "wissel") {
        var ok = await herstelWissel(acc);
        if (!ok) { wisselLosRef.current = los; setWisselScherm("inloggen"); return false; }
      } else if (acc.uid !== mijn.uid) {
        herstelExtern(acc, mijn);
      }
      zetIn1UidEenmalig(window.localStorage, eigenaar());
    } catch (err) {
      setBlokkade({ soort: "leesfout" });
      los();
      return false;
    }
    zelfWisselendRef.current = false;
    los();
    return true;
  }

  // ── Init ─────────────────────────────────────────────────────────
  useEffect(function() {
    async function start(userId) {
      var plek = maakSchrijfplek({ storage: window.localStorage, locks: locks(), in1Eigenaar: function() { return leesIn1Uid(window.localStorage); } });
      await plek.claim();
      plekRef.current = plek;
      rijRef.current = maakOpslagrij({ slaOp: function(id) { return slaOp(id.u, plek); }, plek: plek, geldt: geldt, naOpslag: naOpslag, naFout: naFout });
      zetEigenaar(userId);
      var inlog = huidigeInlog();
      setInlogInfo(inlog);
      var verder = await regelEigenaar(userId, inlog);
      if (verder) {
        slotRef.current = "open";
        await laadEnToon();
      }
      setLoading(false);
      startKlaarRef.current = true;
      // De blijvende waarnemer (§22.3 punt 1): ziet elke verandering van de inlog, doet zelf nooit een aanmelding
      volgInlog(function(i) {
        setInlogInfo(i);
        if (!startKlaarRef.current) return;
        // Tijdens een eigen wissel beslist de waarnemer niets: de eindcontrole vergelijkt daarna de inlog van dat
        // moment (§22.3 punt 7); een wijziging na de eindcontrole is hier weer een externe wissel
        if (zelfWisselendRef.current) return;
        if ((i ? i.uid : null) !== uidRef.current && !externRef.current) {
          externRef.current = true;
          setBlokkade({ soort: "extern" });
          herlaad();
        }
      });
    }
    if (gestartRef.current) return;
    gestartRef.current = true;
    initAuth()
      .then(function(userId) { return start(userId); }, function() { return start(null); })
      .catch(function() { setLoading(false); });
  }, []);

  // Opnieuw proberen als de verbinding terugkomt of de app weer in beeld komt; een ander tabblad veranderde de
  // wachtrij (status) of de speler op dit toestel (dan niets meer schrijven en opnieuw laden)
  useEffect(function() {
    function opnieuw() { if (!document.hidden && plekRef.current && slotRef.current === "open") planOpslag(); }
    function anderTabblad(e) {
      if (!plekRef.current || !e || typeof e.key !== "string") return;
      if (e.key.indexOf("rekenmeester_wq_") === 0 || e.key.indexOf("rekenmeester_wachtrij_") === 0) werkStatus();
      if (isAccountSleutel(e.key) && startKlaarRef.current && !zelfWisselendRef.current) {
        var acc = leesAccount(window.localStorage);
        if (isStabiel(acc) && acc.uid === eigenaar()) return;
        externRef.current = true;
        startWachter();
        wacht();
      }
    }
    window.addEventListener("online", opnieuw);
    document.addEventListener("visibilitychange", opnieuw);
    window.addEventListener("storage", anderTabblad);
    return function() {
      window.removeEventListener("online", opnieuw);
      document.removeEventListener("visibilitychange", opnieuw);
      window.removeEventListener("storage", anderTabblad);
    };
  }, []);

  // ── Account (plan IN, fase IN-2) ──────────────────────────────────
  // De wissel-lock en alle IN-1-locks; null en een tekst als dat niet kan
  async function pakWisselLocks() {
    if (!locks()) return { fout: "Werk je browser bij om in te loggen of uit te loggen." };
    var lk = await probeerLock(locks(), WISSEL_LOCK);
    if (lk.r !== "ja") return { fout: "Op een ander tabblad wordt van account gewisseld. Probeer het zo opnieuw." };
    var in1 = await pakIn1Locks(locks());
    if (!in1.ok) { lk.los(); return { fout: "Er staat nog een tabblad van Reken-Meester open met de vorige versie. Ververs of sluit dat tabblad en probeer het opnieuw." }; }
    return { los: function() { in1.los(); lk.los(); } };
  }
  function sluitVoorWissel(scherm) {
    slotRef.current = "dicht";
    zelfWisselendRef.current = true;
    setWisselScherm(scherm);
  }
  function heropenNaAfbreken(los) {
    zelfWisselendRef.current = false;
    slotRef.current = "open";
    setWisselScherm(null);
    los();
  }

  // Account maken (koppelen): dezelfde uid, geen wissel. Geeft null of een fouttekst.
  async function handleMaakAccount(email, wachtwoord) {
    if (!magSchrijven()) return FOUT_GEBLOKKEERD;
    try {
      await maakAccount(email, wachtwoord);
    } catch (err) {
      return foutTekst(err);
    }
    var i = huidigeInlog();
    setInlogInfo(i);
    if (i && i.uid === uidRef.current) { try { zetAccount(window.localStorage, toestandVoor(i.uid, false)); } catch (err2) {} }
    return null;
  }

  // Inloggen (alleen een anonieme speler, §22.4). Geeft null (gelukt, geannuleerd of het scherm "laden
  // mislukt") of een fouttekst.
  async function handleInloggen(email, wachtwoord) {
    var oud = uidRef.current;
    var i = huidigeInlog();
    if (!oud || !i || !i.anoniem || !magSchrijven()) return "Inloggen kan nu niet. Laad de app opnieuw.";
    var vragen = Object.keys(saveRef.current.subjects || {}).reduce(function(som, k) { return som + ((saveRef.current.subjects[k] || {}).totalQuestions || 0); }, 0);
    if (vragen > 0 && !window.confirm("Op dit toestel heb je ongeveer " + vragen + " vragen gemaakt. Na inloggen zie je de voortgang van je account; die van dit toestel ben je kwijt. Doorgaan?")) return null;
    var w = await pakWisselLocks();
    if (w.fout) return w.fout;
    sluitVoorWissel("inloggen");
    var nieuw;
    try {
      zetAccount(window.localStorage, { soort: "wissel", fase: "inloggen", uid: oud });
      nieuw = await logIn(email, wachtwoord);
    } catch (err) {
      try { zetAccount(window.localStorage, toestandVoor(oud, true)); } catch (err2) {}
      heropenNaAfbreken(w.los);
      return foutTekst(err);
    }
    if (!(await afrondenInloggen(oud, nieuw))) { wisselLosRef.current = w.los; return null; }
    await eindcontrole();
    planOpslag();
    w.los();
    return null;
  }

  // "Opnieuw proberen" en "Annuleren" op het scherm "laden mislukt"
  async function handleLaadOpnieuw() {
    var lf = laadFout;
    if (!lf) return;
    if (!(await afrondenInloggen(lf.oud, lf.nieuw))) return;
    await eindcontrole();
    planOpslag();
    var los = wisselLosRef.current; wisselLosRef.current = null; if (los) los();
  }
  async function handleLaadAnnuleren() {
    var lf = laadFout;
    if (!lf) return;
    try {
      await annuleerVervolg(lf.oud);
    } catch (err) {
      setBlokkade({ soort: "leesfout" });
      return;
    }
    await laadEnToon();
    await eindcontrole();
    setScreen("home");
    var los = wisselLosRef.current; wisselLosRef.current = null; if (los) los();
  }

  // Uitloggen (alleen met een account, §22.4)
  async function handleUitloggen() {
    var u = uidRef.current;
    var i = huidigeInlog();
    if (!u || !i || i.anoniem || !magSchrijven()) return "Uitloggen kan nu niet. Laad de app opnieuw.";
    if (!window.confirm("Je voortgang blijft in je account; op dit toestel begin je opnieuw. Uitloggen?")) return null;
    var w = await pakWisselLocks();
    if (w.fout) return w.fout;
    try { await plekRef.current.neemIn1ConceptenOver(u, function(c) { return conceptSessie(c, u); }, true); } catch (err) {}
    sluitVoorWissel("uitloggen");
    try { zetAccount(window.localStorage, { soort: "wissel", fase: "uitloggen", uid: u }); } catch (err0) { heropenNaAfbreken(w.los); return FOUT_SESSIE; }
    await rijRef.current.vraag(huidigeRonde());
    if (plekRef.current.wachtend(bevestigdRef.current, u) > 0) {
      try { zetAccount(window.localStorage, toestandVoor(u, false)); } catch (err1) {}
      heropenNaAfbreken(w.los);
      return "Nog niet alles is opgeslagen; controleer je verbinding en probeer het opnieuw.";
    }
    try { await logUit(); } catch (err2) {
      try { zetAccount(window.localStorage, toestandVoor(u, false)); } catch (err3) {}
      heropenNaAfbreken(w.los);
      return foutTekst(err2);
    }
    wisGegevens(u);
    var nieuw = null;
    try { nieuw = await startAnoniem(); } catch (err4) { nieuw = null; }
    var echt = huidigeInlog();
    if (echt && echt.uid !== nieuw) nieuw = echt.uid;
    zetEigenaar(nieuw);
    zetAccount(window.localStorage, toestandVoor(nieuw, true));
    await laadEnToon();
    await eindcontrole();
    setScreen("home");
    w.los();
    return null;
  }

  function handleWachtwoordVergeten(email) {
    return stuurWachtwoordHerstel(email).then(function() { return null; }, function(err) { return foutTekst(err); });
  }

  // Een ongeldige marker: alleen na een bewuste keuze doorgaan als de huidige speler, zonder iets over te nemen
  function handleDoorgaanAlsDeze() {
    if (!window.confirm("Doorgaan als de speler die nu is aangemeld? Gegevens van een andere speler op dit toestel worden niet overgenomen.")) return;
    try { zetAccount(window.localStorage, mijnToestand()); } catch (err) { return; }
    herlaad();
  }

  // ── Save helper ───────────────────────────────────────────────────
  // Een wijziging buiten een sessie (Kiezen of Typen, de naam): een bewerking van de soort patch
  function upSave(patch) {
    var b = legVast({ soort: "patch", patch: patch }, FOUT_WIJZIGING);
    if (!b) return;
    var next = pasBewerkingToe(saveRef.current, b);
    zetStand(next);
    bewaarLokaal(next);
    planOpslag();
  }

  // ── Antwoord geven: Kiezen | Typen per modus ──────────────────────
  // Standaard (en voor bestaande spelers) "kiezen"; de keuze wordt bewaard in save.answerModes
  function answerModeFor(sId) {
    return (save.answerModes && save.answerModes[sId] === "typen") ? "typen" : "kiezen";
  }
  function handleAnswerMode(sId, mode) {
    var patch = { answerModes: {} };
    patch.answerModes[sId] = mode === "typen" ? "typen" : "kiezen";
    upSave(patch);
  }

  // ── Username ──────────────────────────────────────────────────────
  function handleUsernameDone(name) {
    var slug = name.toLowerCase().replace(/\s+/g, "_");
    upSave({ username: slug, displayName: name });
    setNeedsName(false);
    if (uid && magSchrijven()) updateGlobalLeaderboard(uid, name, 0, "Beginner");
  }

  // ── Practice finish ───────────────────────────────────────────────
  // Een sessie: eerst vastleggen als bewerking, dan toepassen, de stand zetten en de lokale kopie schrijven;
  // het concept pas weg als de bewerking vastligt; daarna de scorelijsten en een opslag aanvragen.
  // Geeft de bewerking (null als vastleggen mislukte: dan is de voortgang niet veranderd).
  function handleFinish(result) {
    var b = legVast({ soort: "sessie", result: JSON.parse(JSON.stringify(result)), datum: vandaag(), gisteren: gisteren() }, FOUT_SESSIE);
    if (b) {
      var next = pasBewerkingToe(saveRef.current, b);
      zetStand(next);
      bewaarLokaal(next);
      var c = plekRef.current.leesConcept(eigenaar());
      if (c && c.id === result.conceptId) { try { plekRef.current.wisConcept(eigenaar()); } catch (e) {} }

      if (uidRef.current && next.displayName && magSchrijven()) {
        var titelNu = getTitel(next.subjects.optellen ? (next.subjects.optellen.totalSkillsMastered || 0) : 0);
        updateGlobalLeaderboard(uidRef.current, next.displayName, next.totalXp, titelNu.label);
        var subjData = next.subjects[result.subjectId];
        var subAcc   = subjData.totalQuestions > 0
          ? Math.round(subjData.totalCorrect / subjData.totalQuestions * 100) : 0;
        var subSkills = subjData.totalSkillsMastered || 0;
        updateSubjectLeaderboard(uidRef.current, next.displayName, result.subjectId, subjData.currentLevel || 1, subAcc, subSkills, getTitel(subSkills, getSkillOrder(result.subjectId).length).label);
      }
      planOpslag();
    }

    setLastResult(result);
    setScreen("result");
    return b;
  }

  // ── Concept-sessie ────────────────────────────────────────────────
  // Na elk antwoord: het open concept van deze schrijfplek bijwerken (synchroon in localStorage)
  function handleProgress(result) {
    if (!result || !(result.totalQuestions > 0) || !result.conceptId || !plekRef.current || !magSchrijven()) return;
    var r = JSON.parse(JSON.stringify(result));
    r.sameSession = autoActive ? autoCountedRef.current : false;
    try { plekRef.current.schrijfConcept({ v: CONCEPT_VERSION, id: r.conceptId, uid: eigenaar(), result: r }, eigenaar()); } catch (e) {}
  }

  // Na het laden: een open concept van deze schrijfplek (de sessie die niet afgerond werd) één keer toepassen;
  // ongeldig → wissen. Zonder uid (alleen lokaal) staat de melding er meteen.
  function restorePending() {
    var plek = plekRef.current;
    if (!magSchrijven()) return;
    var c = plek.leesConcept(eigenaar());
    if (conceptSessie(c, eigenaar())) {
      var b = handleFinish(c.result);
      setScreen("home");
      if (b) {
        var w = restoreWaitRef.current;
        restoreWaitRef.current = { schrijver: b.schrijver, nr: (w && w.schrijver === b.schrijver) ? Math.max(b.nr, w.nr) : b.nr, shown: false };
        if (!uidRef.current) { restoreWaitRef.current.shown = true; setRestoreNotice(true); }
      }
    } else if (c) {
      try { plek.wisConcept(eigenaar()); } catch (e) {}
    }
  }

  useEffect(function() {
    if (loading || needsName || restoredRef.current || !plekRef.current) return;
    restoredRef.current = true;
    restorePending();
  }, [loading, needsName]);

  useEffect(function() {
    if (!restoreNotice) return;
    var t = setTimeout(function() { setRestoreNotice(false); }, 5000);
    return function() { clearTimeout(t); };
  }, [restoreNotice]);

  // ── Auto-modus ────────────────────────────────────────────────────
  function openPractice(saveObj, sId) {
    var d = (saveObj.subjects && saveObj.subjects[sId]) || {};
    setFixedSkillId(null);
    setSubjectId(sId);
    setPracticeLevel(d.currentLevel || 1);
    setAutoKey(function(k) { return k + 1; });
    setScreen("practice");
  }

  function startAuto() {
    var sId = autoSubjectFrom(save, "optellen", true);
    if (!sId) return;
    autoCountedRef.current = false;
    setAutoActive(true);
    openPractice(save, sId);
  }

  // Elke opslag binnen een Auto-ronde loopt via de bestaande handleFinish
  function saveAutoPart(result) {
    result.sameSession = autoCountedRef.current;
    autoCountedRef.current = true;
    handleFinish(result);
  }

  // Behaald level in Auto: huidige modus opslaan, daarna (in het effect, met de bijgewerkte
  // voortgang) de volgende modus openen
  function handleAutoNext(result) {
    saveAutoPart(result);
    setPendingAuto(result.subjectId);
  }

  function handlePracticeFinish(result) {
    if (autoActive) {
      saveAutoPart(result);
      setAutoActive(false);
    } else {
      handleFinish(result);
    }
  }

  // ‹ in het oefenscherm: zelfde opslag als ✕ (als er sommen gemaakt zijn), daarna het
  // modusscherm in plaats van het resultaatscherm
  function handlePracticeBack(result) {
    if (result && result.totalQuestions > 0) {
      handlePracticeFinish(result);
    } else {
      setAutoActive(false);
    }
    setScreen("subject");
  }

  useEffect(function() {
    if (pendingAuto === null) return;
    var fromId = pendingAuto;
    setPendingAuto(null);
    var nextId = autoSubjectFrom(save, fromId, false);
    if (nextId) {
      openPractice(save, nextId);
    } else {
      // Alles beheerst: Auto stopt, het resultaatscherm van de laatste modus blijft staan
      setAutoActive(false);
    }
  }, [pendingAuto]);

  // ── Reset ────────────────────────────────────────────────────────
  // "Alles wissen" is ook een bewerking: de voortgang terug naar het begin, rev en toegepastTot blijven
  function handleReset() {
    if (!window.confirm("Weet je zeker dat je alles wilt wissen? Op andere toestellen die nog niet opgeslagen hebben, kan daarna nog voortgang binnenkomen.")) return;
    var b = legVast({ soort: "wissen" }, FOUT_WIJZIGING);
    if (!b) return;
    try { plekRef.current.wisConcept(eigenaar()); } catch (e) {}
    var next = pasBewerkingToe(saveRef.current, b);
    zetStand(next);
    bewaarLokaal(next);
    planOpslag();
    setNeedsName(true);
    setScreen("home");
  }

  // Melding als vastleggen op dit toestel mislukte: boven elk scherm, tot je erop tikt
  function metMelding(scherm) {
    if (!foutMelding) return scherm;
    return (
      <>
        {scherm}
        <div
          role="alert"
          onClick={function() { setFoutMelding(null); }}
          style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 12px)",
            left: 16,
            right: 16,
            zIndex: 210,
            minHeight: 44,
            background: "#fef2f2",
            border: "1.5px solid #fca5a5",
            color: "#991b1b",
            borderRadius: 14,
            padding: "12px 16px",
            fontSize: 14,
            fontWeight: 800,
            textAlign: "center",
            boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
            cursor: "pointer",
          }}
        >
          {foutMelding}
        </div>
      </>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: D.bg,
        gap: 16,
      }}>
        <div style={{
          width: 64, height: 64,
          borderRadius: 18,
          background: D.primaryLight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
        }}>
          +
        </div>
        <div style={{ fontSize: 15, color: D.textSoft }}>Reken Meester laden...</div>
      </div>
    );
  }

  // IN-2: een blokkade (de opslag niet in orde, wachten op een ander tabblad, een externe aanmelding), het scherm
  // "laden mislukt" en de wachtschermen tijdens een eigen wissel
  if (blokkade) {
    var bTekst = {
      leesfout: "De opslag op dit toestel kan niet gelezen worden (bijvoorbeeld door de instellingen van Safari). Je voortgang op de server is veilig.",
      ongeldig: "De opslag op dit toestel is niet in orde. Je voortgang op de server is veilig.",
      wacht: "Op een ander tabblad wordt van speler gewisseld. Even geduld...",
      extern: "Op een ander tabblad is de speler veranderd. De app wordt opnieuw geladen...",
      onrustig: "De inlog verandert steeds; sluit andere tabbladen van Reken-Meester en laad opnieuw.",
      "wissel-zonder-locks": "Er was een wissel van speler bezig. Werk je browser bij en laad opnieuw.",
    }[blokkade.soort] || "Er ging iets mis met de opslag op dit toestel.";
    return (
      <Volledig tekst={bTekst}>
        {blokkade.soort !== "wacht" && blokkade.soort !== "extern" && (
          <GroteKnop onClick={herlaad}>{"Opnieuw laden"}</GroteKnop>
        )}
        {blokkade.soort === "ongeldig" && (
          <GroteKnop zacht={true} onClick={handleDoorgaanAlsDeze}>{"Doorgaan als deze speler"}</GroteKnop>
        )}
      </Volledig>
    );
  }

  if (laadFout) {
    return (
      <Volledig tekst={"Je voortgang kon niet geladen worden (" + laadFout.fout + "). Controleer je verbinding."}>
        <GroteKnop onClick={handleLaadOpnieuw}>{"Opnieuw proberen"}</GroteKnop>
        <GroteKnop zacht={true} onClick={handleLaadAnnuleren}>{"Annuleren"}</GroteKnop>
      </Volledig>
    );
  }

  if (wisselScherm) {
    return <Volledig tekst={wisselScherm === "uitloggen" ? "Uitloggen..." : "Account wisselen..."} />;
  }

  var inlogUit = locks() ? null : "Werk je browser bij om in te loggen of uit te loggen.";

  if (needsName) {
    return metMelding(
      <UsernameScreen
        uid={uid}
        onDone={handleUsernameDone}
        onInlog={inlogInfo && inlogInfo.anoniem ? handleInloggen : null}
        onVergeten={handleWachtwoordVergeten}
        inlogUit={inlogUit}
      />
    );
  }

  // Tussenstap tijdens een Auto-wissel (één render, tot het effect de volgende modus opent)
  if (pendingAuto !== null) {
    return <div style={{ minHeight: "100dvh", background: T.bg }} />;
  }

  if (screen === "subject") {
    return metMelding(
      <SubjectScreen
        subjectId={subjectId}
        save={save}
        onBack={function() { setScreen("home"); }}
        onStartLevel={function(sId, lvl) {
          setFixedSkillId(null);
          setSubjectId(sId);
          setPracticeLevel(lvl);
          setScreen("practice");
        }}
        onPracticeSkill={function(sId, skillId) {
          setAutoActive(false);
          setSubjectId(sId);
          setFixedSkillId(skillId);
          setScreen("practice");
        }}
        onAnswerMode={handleAnswerMode}
      />
    );
  }

  // Los oefenen: zelfde oefenscherm, maar zonder opslag, concept of Auto; stoppen = terug
  // naar het modusscherm
  if (screen === "practice" && fixedSkillId) {
    var fixedSubjData = (save.subjects && save.subjects[subjectId]) || {};
    var leaveFixed    = function() { setFixedSkillId(null); setScreen("subject"); };
    return metMelding(
      <PracticeScreen
        key={subjectId + "-los-" + fixedSkillId}
        subjectId={subjectId}
        level={practiceLevel}
        skillStats={fixedSubjData.skillStats || {}}
        fixedSkillId={fixedSkillId}
        answerMode={answerModeFor(subjectId)}
        onBack={leaveFixed}
        onFinish={leaveFixed}
      />
    );
  }

  if (screen === "practice") {
    var practiceSubjData = (save.subjects && save.subjects[subjectId]) || {};
    var practiceSkillStats = practiceSubjData.skillStats || {};
    // Knoptekst na een behaald level: berekend met de voorlopige stand (opslag + deze sessie),
    // dus dezelfde modus die handleAutoNext daarna opent — ook op het moment dat de basis
    // net gehaald wordt
    var autoNextLabel = null;
    if (autoActive) {
      autoNextLabel = function(result) {
        var autoNextId = autoSubjectFrom(previewSave(save, result), subjectId, false);
        return autoNextId && autoNextId !== subjectId
          ? "Door naar " + getSubject(autoNextId).label + " →"
          : "Ga verder →";
      };
    }
    return metMelding(
      <PracticeScreen
        key={subjectId + "-" + autoKey}
        subjectId={subjectId}
        level={practiceLevel}
        skillStats={practiceSkillStats}
        onBack={handlePracticeBack}
        onFinish={handlePracticeFinish}
        autoNextLabel={autoNextLabel}
        onAutoNext={autoActive ? handleAutoNext : null}
        onProgress={handleProgress}
        answerMode={answerModeFor(subjectId)}
      />
    );
  }

  if (screen === "result") {
    var subjData = (save.subjects && save.subjects[lastResult && lastResult.subjectId]) || {};
    var nextLvl  = ((lastResult && lastResult.level) || 1) + 1;
    var hasNext  = nextLvl <= 10 && (subjData.unlockedLevels || [1]).indexOf(nextLvl) !== -1;

    return metMelding(
      <ResultScreen
        result={lastResult}
        save={save}
        onHome={function() { setScreen("home"); }}
        onRepeat={function() { setScreen("practice"); }}
        onNext={hasNext ? function() { setPracticeLevel(nextLvl); setScreen("practice"); } : null}
      />
    );
  }

  if (screen === "settings") {
    return metMelding(
      <SettingsScreen
        save={save}
        opslag={Object.assign({}, opslagStatus, { extern: externMelding })}
        account={{ soort: !uid ? "lokaal" : (inlogInfo && !inlogInfo.anoniem ? "account" : "anoniem"), email: inlogInfo ? inlogInfo.email : null, inlogUit: inlogUit }}
        onMaak={handleMaakAccount}
        onInlog={handleInloggen}
        onVergeten={handleWachtwoordVergeten}
        onUitloggen={handleUitloggen}
        onBack={function() { setScreen("home"); }}
        onReset={handleReset}
      />
    );
  }

  // ── Home + bottom sheet ───────────────────────────────────────────
  return metMelding(
    <div style={{ position: "relative", minHeight: "100dvh", background: T.bg }}>
      {restoreNotice && (
        <div
          role="status"
          onClick={function() { setRestoreNotice(false); }}
          style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 12px)",
            left: 16,
            right: 16,
            zIndex: 200,
            background: "#ecfdf5",
            border: "1.5px solid #6ee7b7",
            color: "#065f46",
            borderRadius: 14,
            padding: "12px 16px",
            fontSize: 14,
            fontWeight: 800,
            textAlign: "center",
            boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
            cursor: "pointer",
          }}
        >
          {"Je vorige oefensessie is bewaard."}
        </div>
      )}
      <HomeScreen
        save={save}
        uid={uid}
        onSubject={function(id) { setSubjectId(id); setScreen("subject"); }}
        onAuto={autoSubjectFrom(save, "optellen", true) ? startAuto : null}
        autoStap={autoStap(save)}
        openBoxes={openBoxes}
        onToggleBox={toggleBox}
        onSettings={function() { setScreen("settings"); }}
      />

      <BottomSheet
        tipText="Oefen elke dag een beetje — consistentie is beter dan lange sessies!"
        tabs={SHEET_TABS}
        activeTab={sheetTab}
        onTabChange={setSheetTab}
      >
        {sheetTab === "leaderboard" && (
          <LeaderboardScreen
            uid={uid}
            save={save}
            embedded={true}
          />
        )}
        {sheetTab === "more" && (
          <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: T.xs, fontWeight: 700, color: T.textSoft, letterSpacing: 0.5 }}>
              MEER
            </div>
            <div style={{
              background: T.white,
              border: "1px solid " + T.border,
              borderRadius: T.r16,
              padding: "16px 18px",
              color: T.textSoft,
              fontSize: T.sm,
              textAlign: "center",
            }}>
              Meer onderdelen komen binnenkort!
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

// Een volledig scherm met een tekst en knoppen (IN-2: blokkade, laden mislukt, wisselen)
function Volledig({ tekst, children }) {
  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: D.bg,
      gap: 16,
      padding: "calc(env(safe-area-inset-top, 0px) + 24px) 24px calc(env(safe-area-inset-bottom, 0px) + 24px)",
      boxSizing: "border-box",
    }}>
      <div role="status" style={{ fontSize: 16, fontWeight: 700, color: D.text, textAlign: "center", lineHeight: 1.5, maxWidth: 420 }}>{tekst}</div>
      {children}
    </div>
  );
}

function GroteKnop({ onClick, zacht, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        maxWidth: 420,
        minHeight: 48,
        padding: "12px 18px",
        borderRadius: 14,
        fontSize: 16,
        fontWeight: 800,
        cursor: "pointer",
        background: zacht ? "transparent" : D.primary,
        color: zacht ? D.primary : "#ffffff",
        border: zacht ? "2px solid " + D.primary : "none",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  );
}
