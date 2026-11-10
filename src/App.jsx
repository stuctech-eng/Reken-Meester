import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { DEFAULT_SAVE, dClone, calcXp, getTitel } from "./core/save.js";
import { getNextSkill, getSkillOrder, getSubject } from "./core/subjects.js";
import { mergeSessionSkills, pasBewerkingToe, herbouw, normaliseer } from "./core/voortgang.js";
import { initAuth } from "./services/firebase.js";
import { laadServer, slaOp } from "./services/sync.js";
import { maakSchrijfplek } from "./services/schrijfplek.js";
import { maakOpslagrij } from "./services/opslagrij.js";
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
var OUD_CONCEPT_KEY = "rekenmeester_concept";
var OUD_QUEUE_KEY   = "rekenmeester_wachtrij";
var CONCEPT_VERSION = 1;
var LS_KEY          = "cumlaude_save";
var FOUT_SESSIE     = "Opslaan op dit toestel lukt niet; je laatste sessie is niet bewaard. Maak ruimte vrij of controleer de instellingen van Safari.";
var FOUT_WIJZIGING  = "Opslaan op dit toestel lukt niet; je wijziging is niet bewaard. Maak ruimte vrij of controleer de instellingen van Safari.";

function readLS(key) {
  try { var s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch(e) { return null; }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}
function removeLS(key) {
  try { localStorage.removeItem(key); } catch(e) {}
}
function lokaleBasis() { return normaliseer(readLS(LS_KEY)); }
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

  // Stand van de opslag (Instellingen) en een melding als vastleggen op dit toestel mislukt
  var opslagState  = useState({ plek: null, wachtend: 0, fout: null, laatste: null });
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
  function bewaarLokaal(stand) { writeLS(LS_KEY, stand); }

  function werkStatus(patch) {
    var plek = plekRef.current;
    setOpslagStatus(function(prev) {
      var next = Object.assign({}, prev, patch || {});
      next.plek = plek ? plek.plek() : null;
      next.wachtend = plek ? plek.wachtend(bevestigdRef.current) : 0;
      return next;
    });
  }

  // Een bewerking vastleggen in de eigen wachtrij; null (en een melding) als dat niet lukt
  function legVast(inhoud, melding) {
    try {
      return plekRef.current.voegToe(inhoud);
    } catch (e) {
      setFoutMelding(melding);
      return null;
    }
  }

  // Een opslag aanvragen (zonder uid: alleen lokaal)
  function planOpslag() {
    werkStatus();
    if (uidRef.current && rijRef.current) rijRef.current.vraag(uidRef.current);
  }

  // Na een geslaagde transactie: de stand van de server plus wat er sindsdien nog in de wachtrijen kwam
  function naOpslag(u, stand) {
    if (u !== uidRef.current) return;
    bevestigdRef.current = stand.toegepastTot || {};
    var h = herbouw(stand, plekRef.current.alle());
    zetStand(h.stand);
    bewaarLokaal(h.stand);
    werkStatus({ fout: null, laatste: Date.now() });
    var w = restoreWaitRef.current;
    if (w && !w.shown && ((stand.toegepastTot || {})[plekRef.current.schrijver()] || 0) >= w.nr) {
      w.shown = true;
      setRestoreNotice(true);
    }
  }
  function naFout(u, fout) {
    if (u !== uidRef.current) return;
    werkStatus({ fout: (fout && (fout.code || fout.message)) || "onbekende fout" });
  }

  // Oude wachtrij en oud concept (van voor IN-1) één keer omzetten. Een oud wachtrij-item wordt een
  // bewerking als de modus in de basis nog precies in de stand van vóór die sessie staat (pre); staat hij al
  // in de stand erna (post) of is er een conflict, dan niet. Zelfde regel als het oude restorePending.
  // Alle om te zetten items gaan in één schrijfactie in de wachtrij (alles of niets); pas daarna verdwijnt de
  // oude sleutel. Mislukt die schrijfactie, dan blijft alles zoals het was en gebeurt het bij de volgende
  // start opnieuw, zonder dat er al iets dubbel in de wachtrij staat.
  // Geeft het hoogste nieuwe nummer (0 als er niets omgezet is).
  function zetOudOm(basis, u) {
    var hoogste = 0;
    var oud = readLS(OUD_QUEUE_KEY);
    if (Array.isArray(oud)) {
      var blocks = {};
      var om = [];
      // Al omgezet (crash tussen het vastleggen en het weghalen van de oude sleutel): niet nog eens
      var alOmgezet = {};
      plekRef.current.alle().forEach(function(w) { w.items.forEach(function(x) { if (x.oudId) alOmgezet[x.oudId] = true; }); });
      oud.slice().sort(function(a, b) { return ((a && a.seq) || 0) - ((b && b.seq) || 0); }).forEach(function(e) {
        if (!e || e.v !== CONCEPT_VERSION || e.uid !== u || !e.result || !e.subjectId) return;
        var b = Object.prototype.hasOwnProperty.call(blocks, e.subjectId) ? blocks[e.subjectId] : stableStr((basis.subjects && basis.subjects[e.subjectId]) || null);
        if (alOmgezet[e.id]) { blocks[e.subjectId] = e.post; return; }
        if (b !== e.pre) return;
        var r = e.result;
        r.conceptId = e.id;
        om.push({ soort: "sessie", oudId: e.id, result: r, datum: vandaag(), gisteren: gisteren() });
        blocks[e.subjectId] = e.post;
      });
      try {
        var nieuw = plekRef.current.voegMeerToe(om);
        if (nieuw.length > 0) hoogste = nieuw[nieuw.length - 1].nr;
        removeLS(OUD_QUEUE_KEY);
      } catch (e) {
        setFoutMelding(FOUT_SESSIE);
      }
    }
    var c = readLS(OUD_CONCEPT_KEY);
    if (c) {
      if (c.uid === u && !plekRef.current.leesConcept()) {
        try { plekRef.current.schrijfConcept(c); removeLS(OUD_CONCEPT_KEY); } catch (e2) {}
      } else {
        removeLS(OUD_CONCEPT_KEY);
      }
    }
    return hoogste;
  }

  // ── Init ─────────────────────────────────────────────────────────
  // Schrijfplek claimen, de basis laden (de server; zonder verbinding de lokale kopie), de oude opslag
  // omzetten, de wachtrijen erop toepassen en daarna een opslag aanvragen.
  useEffect(function() {
    async function start(userId) {
      var plek = maakSchrijfplek({ storage: window.localStorage, locks: (typeof navigator !== "undefined" && navigator.locks) || null });
      await plek.claim();
      plekRef.current = plek;
      uidRef.current = userId;
      setUid(userId);
      var basis = null;
      if (userId) {
        rijRef.current = maakOpslagrij({ slaOp: function(u) { return slaOp(u, plek); }, plek: plek, naOpslag: naOpslag, naFout: naFout });
        try { basis = await laadServer(userId); bevestigdRef.current = basis.toegepastTot; } catch (e) { werkStatus({ fout: (e && (e.code || e.message)) || "geen verbinding" }); }
      }
      if (!basis) basis = lokaleBasis();
      var omgezet = zetOudOm(basis, userId);
      if (omgezet > 0) restoreWaitRef.current = { nr: omgezet, shown: false };
      var h = herbouw(basis, plek.alle());
      zetStand(h.stand);
      bewaarLokaal(h.stand);
      if (userId && !h.stand.username) setNeedsName(true);
      setLoading(false);
      planOpslag();
    }
    if (gestartRef.current) return;
    gestartRef.current = true;
    initAuth()
      .then(function(userId) { return start(userId); }, function() { return start(null); })
      .catch(function() { setLoading(false); });
  }, []);

  // Opnieuw proberen als de verbinding terugkomt of de app weer in beeld komt
  useEffect(function() {
    function opnieuw() { if (!document.hidden && plekRef.current) planOpslag(); }
    // Een ander tabblad op dit toestel veranderde een wachtrij: de status opnieuw tellen
    function anderTabblad(e) {
      if (plekRef.current && e && typeof e.key === "string" && e.key.indexOf("rekenmeester_wachtrij_") === 0) werkStatus();
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
    if (uid) updateGlobalLeaderboard(uid, name, 0, "Beginner");
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
      var c = plekRef.current.leesConcept();
      if (c && c.id === result.conceptId) plekRef.current.wisConcept();

      if (uidRef.current && next.displayName) {
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
    if (!result || !(result.totalQuestions > 0) || !result.conceptId || !plekRef.current) return;
    var r = JSON.parse(JSON.stringify(result));
    r.sameSession = autoActive ? autoCountedRef.current : false;
    try { plekRef.current.schrijfConcept({ v: CONCEPT_VERSION, id: r.conceptId, uid: uidRef.current, result: r }); } catch (e) {}
  }

  // Na het laden: een open concept van deze schrijfplek (de sessie die niet afgerond werd) één keer toepassen;
  // ongeldig → wissen. Zonder uid (alleen lokaal) staat de melding er meteen.
  function restorePending() {
    var plek = plekRef.current;
    var c = plek.leesConcept();
    if (c && c.v === CONCEPT_VERSION && c.uid === uidRef.current && c.result && c.result.totalQuestions > 0 && c.result.conceptId === c.id) {
      var b = handleFinish(c.result);
      setScreen("home");
      if (b) {
        var w = restoreWaitRef.current;
        restoreWaitRef.current = { nr: Math.max(b.nr, w ? w.nr : 0), shown: false };
        if (!uidRef.current) { restoreWaitRef.current.shown = true; setRestoreNotice(true); }
      }
    } else if (c) {
      plek.wisConcept();
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
    if (!window.confirm("Weet je zeker dat je alles wilt wissen?")) return;
    var b = legVast({ soort: "wissen" }, FOUT_WIJZIGING);
    if (!b) return;
    try { plekRef.current.wisConcept(); } catch (e) {}
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

  if (needsName) {
    return metMelding(<UsernameScreen uid={uid} onDone={handleUsernameDone} />);
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
        opslag={opslagStatus}
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
