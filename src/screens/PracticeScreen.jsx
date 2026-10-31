import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Screen, ProgressBar } from "../components/UI.jsx";
import { A, T } from "../styles/tokens.js";
import { getSkill, getNextSkill, getSubject, getSkillOrder } from "../core/subjects.js";
import { getTitel, calcXp } from "../core/save.js";
import { KEYPAD_SIZES, KEYPAD_MIN } from "../components/Keypad.jsx";
import { VAK_MIN_TEKEN } from "../components/answer/NumberAnswer.jsx";
import AnswerArea from "../components/answer/AnswerArea.jsx";
import { TYPE_MAX_DIGITS } from "../core/answerCheck.js";
import { resolveInput } from "../core/inputResolve.js";
import { gradeTyped } from "../core/grading.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Sessievoorwaarden voor een level (zelfde regel als meetsMastery in subjects.js):
// minstens SESSION_MIN sommen van deze skill in de sessie en minstens SESSION_ACC goed.
var SESSION_MIN = 4;
var SESSION_ACC = 0.70;

// Uniek kenmerk per oefensessie (voor de concept-sessie in App); geen Math.random
var CONCEPT_COUNTER = 0;

// Kleinste aantal goede sommen dat nog nodig is om aan de sessievoorwaarden te voldoen
// Kleinste lettergrootte voor de vraagtekst wanneer die niet in de kaart past (zie vraaggrootte)
var Q_FONT_MIN = 28;
// Regel van een kolomsom: alleen een getal, eventueel met een rekenteken ervoor ("828", "− 194")
var COLUMN_LINE_RE = /^[\u2212\u00d7+:-]?\s?[\d.,]+$/;
// Onder deze schermhoogtes (px) gaat de oefenpagina in de compacte en de extra compacte
// stand (zie Compacte stand)
var COMPACT_MAX_H = 740;
var TINY_MAX_H    = 600;

function isCompactHeight() {
  return typeof window !== "undefined" && window.innerHeight < COMPACT_MAX_H;
}

function isTinyHeight() {
  return typeof window !== "undefined" && window.innerHeight < TINY_MAX_H;
}

function goodNeeded(sessionCorrect, sessionTotal) {
  for (var k = 0; k <= 100; k++) {
    var t = sessionTotal + k;
    if (t >= SESSION_MIN && (sessionCorrect + k) / t >= SESSION_ACC) return k;
  }
  return 0;
}

// autoNextLabel / onAutoNext (optioneel, alleen in Auto-modus): na een behaald level sluit
// "Ga verder" de sessie eenmalig af en geeft het resultaat aan onAutoNext in plaats van onFinish.
// onProgress (optioneel): na elk antwoord het actuele sessieresultaat, voor de concept-sessie.
// fixedSkillId (optioneel): los oefenen. Alleen deze vaardigheid, geen promotie en geen
// terugval; App slaat het resultaat niet op.
// answerMode (optioneel): "typen" = antwoord intypen met het cijferblok, waar dat kan (zie
// answerCheck.js); anders (ook zonder waarde) de vier keuzes zoals altijd.
export default function PracticeScreen({ subjectId, level, skillStats, onBack, onFinish, autoNextLabel, onAutoNext, onProgress, fixedSkillId, answerMode }) {
  var skillOrder = getSkillOrder(subjectId);

  // ── Compacte stand ────────────────────────────────────────────
  // Op een laag scherm (iPhone SE/8, of Safari met adresbalk) worden witruimte, knoppen en
  // de startgrootte van de vraag kleiner, zodat de antwoordknoppen in beeld blijven.
  // Op een hoger scherm verandert er niets. Opnieuw bepaald bij draaien en bij het
  // in- en uitklappen van de adresbalk (resize).
  // Extra compact (onder TINY_MAX_H: iPhone SE in Safari met adresbalk, of met weergavezoom):
  // nog iets kleiner, zodat ook lange vragen met de knoppen in beeld passen.
  var compactState = useState(isCompactHeight);
  var compact      = compactState[0];
  var setCompact   = compactState[1];
  var tinyState    = useState(isTinyHeight);
  var tiny         = tinyState[0];
  var setTiny      = tinyState[1];

  useEffect(function() {
    function check() { setCompact(isCompactHeight()); setTiny(isTinyHeight()); }
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return function() {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  // ── Initialisatie helpers ─────────────────────────────────────
  function initSkillId() {
    if (fixedSkillId) return fixedSkillId;
    var res = getNextSkill(subjectId, skillStats || {});
    return res ? res.skillId : skillOrder[0];
  }

  function makeQuestion(skillId) {
    var skill = getSkill(subjectId, skillId);
    if (!skill) skill = getSkill(subjectId, skillOrder[0]);
    var q = skill.generate();
    q.skillId = skillId;
    q.skill   = skill;
    return q;
  }

  // ── State ──────────────────────────────────────────────────────
  var startSkillId = initSkillId();

  var curQState         = useState(function() { return makeQuestion(startSkillId); });
  var currentQuestion   = curQState[0];
  var setCurrentQuestion = curQState[1];

  var selState    = useState(null);
  var selected    = selState[0];
  var setSelected = selState[1];

  // Antwoord typen: de ingetypte cijfers van de huidige vraag (alleen in het geheugen)
  var typedState  = useState("");
  var typed       = typedState[0];
  var setTyped    = typedState[1];

  // Passend cijferblok (zie hieronder): null = vaste maten; { keyH, gap, vakH } = kleiner;
  // "kiezen" = past ook dan niet, deze vraag toont de keuzes. Per vraag opnieuw bepaald.
  var fitState    = useState(null);
  var typeFit     = fitState[0];
  var setTypeFit  = fitState[1];

  var fbState     = useState(null);
  var feedback    = fbState[0];
  var setFeedback = fbState[1];

  var fbLvlState  = useState(0);
  var fbLevel     = fbLvlState[0];
  var setFbLevel  = fbLvlState[1];

  // uitlegVisible: kaart zichtbaar na fout (blijft staan tot "Volgende vraag" getikt)
  var uitlegVisState = useState(false);
  var uitlegVisible  = uitlegVisState[0];
  var setUitlegVisible = uitlegVisState[1];

  var resState    = useState([]);
  var results     = resState[0];
  var setResults  = resState[1];
  var totalXpRef  = useRef(0);

  var showLUState   = useState(false);
  var showLevelUp   = showLUState[0];
  var setShowLevelUp = showLUState[1];

  // helpOpen: uitlegvenster via de 💡-knop. Vóór het antwoorden: uitleg + voorbeeld (de werkwijze,
  // zonder het antwoord van deze som). Na het antwoorden ook de tip met de getallen van deze som.
  var helpState   = useState(false);
  var helpOpen    = helpState[0];
  var setHelpOpen = helpState[1];

  var luDataState   = useState(null);
  var levelUpData   = luDataState[0];
  var setLevelUpData = luDataState[1];

  // ── Refs (geen re-render) ─────────────────────────────────────
  var activeSkillIdRef           = useRef(startSkillId);
  var sessionSkillStatsRef       = useRef({});
  var skillErrorsRef             = useRef({});
  var recentRef                  = useRef({});
  var fallbackActiveRef          = useRef(false);
  var fallbackReturnSkillRef     = useRef(null);
  var liveCorrectOnFallbackRef   = useRef(0);
  var promotedThisSession        = useRef(new Set());
  var promotionSnapRef           = useRef({});
  var lastQuestionRef            = useRef(currentQuestion.question);
  var nextSkillIdRef             = useRef(startSkillId);
  var timeRef                    = useRef(Date.now());
  var advanceTimerRef            = useRef(null);
  var autoNextDoneRef            = useRef(false);
  var conceptIdRef               = useRef(null);
  if (conceptIdRef.current === null) {
    CONCEPT_COUNTER++;
    conceptIdRef.current = "c" + Date.now() + "-" + CONCEPT_COUNTER;
  }

  // Concept-sessie: na elk antwoord het actuele resultaat doorgeven (vangnet bij afsluiten)
  useEffect(function() {
    if (results.length > 0 && onProgress) onProgress(buildResult());
  }, [results]);

  // Initialiseer sessionSkillStats voor alle skills
  useEffect(function() {
    skillOrder.forEach(function(id) {
      sessionSkillStatsRef.current[id] = { correct: 0, total: 0 };
    });
  }, []);

  // Bij verlaten van het scherm: lopende auto-advance stoppen (geen niet-getoonde vraag maken)
  useEffect(function() {
    return function() {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────
  // Alleen skills in de actieve skillvolgorde tellen (zelfde regel als App.handleFinish)
  function getLiveTotal() {
    var stored = Object.keys(skillStats || {}).filter(function(id) {
      return skillStats[id] && skillStats[id].mastered && skillOrder.indexOf(id) !== -1;
    }).length;
    var genuinelyNew = 0;
    promotedThisSession.current.forEach(function(id) {
      if (skillOrder.indexOf(id) === -1) return;
      if (!(skillStats && skillStats[id] && skillStats[id].mastered)) {
        genuinelyNew++;
      }
    });
    return stored + genuinelyNew;
  }

  function generateNext(skillId) {
    var skill = getSkill(subjectId, skillId);
    if (!skill) skill = getSkill(subjectId, skillOrder[0]);
    var q = skill.generate();
    if (q.question === lastQuestionRef.current) {
      q = skill.generate();
    }
    q.skillId = skillId;
    q.skill   = skill;
    lastQuestionRef.current = q.question;
    return q;
  }

  function advanceToNext(nextSkillId) {
    setHelpOpen(false);
    var nextQ = generateNext(nextSkillId);
    setCurrentQuestion(nextQ);
    setSelected(null);
    setTyped("");
    setTypeFit(null);
    setFeedback(null);
    setFbLevel(0);
    setUitlegVisible(false);
    timeRef.current = Date.now();
  }

  // ── Stop-functie ──────────────────────────────────────────────
  function handleStop() {
    onFinish(buildResult());
  }

  // ‹ geeft hetzelfde sessieresultaat mee als ✕; App bepaalt of er wordt opgeslagen
  function handleBack() {
    onBack(buildResult());
  }

  function buildResult() {
    var ss    = sessionSkillStatsRef.current;
    var total = 0;
    var cor   = 0;
    skillOrder.forEach(function(id) {
      total += (ss[id] ? ss[id].total : 0);
      cor   += (ss[id] ? ss[id].correct : 0);
    });
    var avgTime = 0;
    var rr = results;
    if (rr.length > 0) {
      avgTime = Math.round(rr.reduce(function(s, r) { return s + r.timeMs; }, 0) / rr.length);
    }
    return {
      subjectId:         subjectId,
      level:             level,
      totalCorrect:      cor,
      totalQuestions:    total,
      totalXp:           totalXpRef.current,
      avgTime:           avgTime,
      results:           rr,
      sessionSkillStats: ss,
      dominantSkillId:   activeSkillIdRef.current,
      promotionSnapshots: promotionSnapRef.current,
      conceptId:          conceptIdRef.current,
    };
  }

  // ── Level-up overlay doorgaan ──────────────────────────────────
  function handleLevelUpContinue() {
    if (autoNextLabel && onAutoNext) {
      // Auto: precies één wissel per behaald level, ook bij dubbel tikken
      if (autoNextDoneRef.current) return;
      autoNextDoneRef.current = true;
      onAutoNext(buildResult());
      return;
    }
    setShowLevelUp(false);
    advanceToNext(activeSkillIdRef.current);
  }

  // ── Antwoord typen ─────────────────────────────────────────────
  // Het getypte getal gaat door dezelfde verwerking als een aangetikte keuze (handleChoice):
  // goed als het gelijk is aan het antwoord, anders fout, met dezelfde hulp en voortgang.
  // typed: de ingetypte cijfers, met "-" vooraan als de leerling het teken heeft omgedraaid
  // (alleen bij inputConfig.allowNegative) en een "," bij een kommagetal (inputType "decimal").
  // Het maximum telt alleen de cijfers; na de komma hoogstens maxDecimals cijfers.
  function handleTypedDigit(d) {
    if (selected !== null) return;
    setTyped(function(prev) {
      var teken   = prev.charAt(0) === "-" ? "-" : "";
      var cijfers = teken ? prev.slice(1) : prev;
      if (cijfers.replace(",", "").length >= TYPE_MAX_DIGITS) return prev;
      var k = cijfers.indexOf(",");
      if (k >= 0 && cijfers.length - k - 1 >= maxDecimalen()) return prev;
      return teken + (cijfers === "0" ? d : cijfers + d);
    });
  }
  function maxDecimalen() { return inputInfo.inputConfig.maxDecimals === undefined ? 3 : inputInfo.inputConfig.maxDecimals; }
  // Komma: hoogstens één; vooraan wordt het "0,"
  function handleTypedComma() {
    if (selected !== null || inputInfo.inputType !== "decimal") return;
    setTyped(function(prev) {
      if (prev.indexOf(",") >= 0) return prev;
      var teken   = prev.charAt(0) === "-" ? "-" : "";
      var cijfers = teken ? prev.slice(1) : prev;
      return teken + (cijfers === "" ? "0," : cijfers + ",");
    });
  }
  function handleTypedSign() {
    if (selected !== null || !inputInfo.inputConfig.allowNegative) return;
    setTyped(function(prev) { return prev.charAt(0) === "-" ? prev.slice(1) : "-" + prev; });
  }
  function handleTypedBackspace() {
    if (selected !== null) return;
    setTyped(function(prev) { return prev.slice(0, -1); });
  }
  function handleTypedSubmit() {
    var res = gradeTyped(inputInfo.gradingRule, typed, currentQuestion, inputInfo.inputConfig);
    if (!res.geldig) return;
    handleChoice(res.goed ? currentQuestion.answer : res.waarde);
  }

  // ── "Volgende vraag" knop (na fout) ───────────────────────────
  function handleNextQuestion() {
    advanceToNext(nextSkillIdRef.current);
  }

  // ── Antwoord verwerken ─────────────────────────────────────────
  function handleChoice(choice) {
    if (selected !== null) return;

    var answerSkillId = currentQuestion.skillId;
    var timeMs        = Date.now() - timeRef.current;
    var isCorrect     = choice === currentQuestion.answer;

    setSelected(choice);
    setFeedback(isCorrect ? "correct" : "wrong");

    if (!sessionSkillStatsRef.current[answerSkillId]) {
      sessionSkillStatsRef.current[answerSkillId] = { correct: 0, total: 0 };
    }
    sessionSkillStatsRef.current[answerSkillId].total += 1;
    if (isCorrect) sessionSkillStatsRef.current[answerSkillId].correct += 1;

    var earnedXp = calcXp(level, isCorrect, timeMs);
    totalXpRef.current += earnedXp;

    var newResults = results.concat([{
      correct:  isCorrect,
      timeMs:   timeMs,
      answer:   currentQuestion.answer,
      chosen:   choice,
      question: currentQuestion.question,
      skillId:  answerSkillId,
      terms:    currentQuestion.terms || null,
      xp:       earnedXp,
    }]);
    setResults(newResults);

    if (!isCorrect) {
      skillErrorsRef.current[answerSkillId] = (skillErrorsRef.current[answerSkillId] || 0) + 1;
      var errCount = skillErrorsRef.current[answerSkillId];
      setFbLevel(errCount >= 3 ? 3 : errCount >= 2 ? 2 : 1);
      setUitlegVisible(true);
    } else {
      setFbLevel(0);
      setUitlegVisible(false);
    }

    var recentList = (recentRef.current[answerSkillId] || []).concat([isCorrect]);
    if (recentList.length > 10) recentList = recentList.slice(recentList.length - 10);
    recentRef.current[answerSkillId] = recentList;

    // Next activeSkillId bepalen
    var nextSkillId = activeSkillIdRef.current;

    // Terugval-check (niet bij los oefenen)
    if (!fixedSkillId && !fallbackActiveRef.current) {
      var window5 = recentList.slice(-5);
      var foutInWindow = window5.filter(function(c) { return !c; }).length;
      if (foutInWindow >= 3) {
        var curIdx = skillOrder.indexOf(answerSkillId);
        if (curIdx > 0) {
          fallbackActiveRef.current       = true;
          fallbackReturnSkillRef.current  = answerSkillId;
          liveCorrectOnFallbackRef.current = 0;
          nextSkillId = skillOrder[curIdx - 1];
          activeSkillIdRef.current = nextSkillId;
        }
      }
    }

    // Terugkeer uit terugval
    if (fallbackActiveRef.current && isCorrect && answerSkillId === activeSkillIdRef.current) {
      liveCorrectOnFallbackRef.current++;
      if (liveCorrectOnFallbackRef.current >= 3) {
        fallbackActiveRef.current = false;
        nextSkillId = fallbackReturnSkillRef.current;
        activeSkillIdRef.current = nextSkillId;
        liveCorrectOnFallbackRef.current = 0;
        fallbackReturnSkillRef.current   = null;
      }
    }

    // Promotie-check (niet bij los oefenen)
    if (!fixedSkillId && !fallbackActiveRef.current && isCorrect && !promotedThisSession.current.has(answerSkillId)) {
      var storedSkill     = (skillStats && skillStats[answerSkillId]) || {};
      if (!storedSkill.mastered) {
        var storedCorrect   = storedSkill.correct || 0;
        var sessionCorrect  = sessionSkillStatsRef.current[answerSkillId].correct;
        var sessionTotal    = sessionSkillStatsRef.current[answerSkillId].total;
        var cumulativeC     = storedCorrect + sessionCorrect;
        var sessionAcc      = sessionTotal > 0 ? sessionCorrect / sessionTotal : 0;
        var checkSkill      = getSkill(subjectId, answerSkillId);
        var minC            = checkSkill ? (checkSkill.minCorrect || 8) : 8;

        if (cumulativeC >= minC && sessionTotal >= SESSION_MIN && sessionAcc >= SESSION_ACC) {
          promotedThisSession.current.add(answerSkillId);
          promotionSnapRef.current[answerSkillId] = { correct: sessionCorrect, total: sessionTotal };

          var promIdx = skillOrder.indexOf(answerSkillId);
          var nextIdx = promIdx + 1;
          nextSkillId = nextIdx < skillOrder.length ? skillOrder[nextIdx] : answerSkillId;
          activeSkillIdRef.current = nextSkillId;
          nextSkillIdRef.current   = nextSkillId;

          var liveTotal   = getLiveTotal();
          var newTitelObj = getTitel(liveTotal, skillOrder.length);
          setLevelUpData({
            skillLabel: checkSkill ? checkSkill.label : answerSkillId,
            newTitel:   newTitelObj.label,
            liveTotal:  liveTotal,
          });
          setShowLevelUp(true);
          return;
        }
      }
    }

    nextSkillIdRef.current = nextSkillId;

    // Auto-advance alleen bij correct antwoord
    if (isCorrect) {
      advanceTimerRef.current = setTimeout(function() {
        advanceTimerRef.current = null;
        advanceToNext(nextSkillId);
      }, 900);
    }
    // Bij fout: wachten op "Volgende vraag" tik
  }

  // ── Afgeleide waarden ─────────────────────────────────────────
  var currentSkill = currentQuestion.skill || getSkill(subjectId, currentQuestion.skillId || skillOrder[0]);

  var storedCorrectForSkill  = (skillStats && skillStats[currentQuestion.skillId] && skillStats[currentQuestion.skillId].correct) || 0;
  var sessionCorrectForSkill = sessionSkillStatsRef.current[currentQuestion.skillId]
    ? sessionSkillStatsRef.current[currentQuestion.skillId].correct
    : 0;
  var skillTarget   = currentSkill ? (currentSkill.minCorrect || 8) : 8;
  var skillProgress = Math.min(storedCorrectForSkill + sessionCorrectForSkill, skillTarget);

  // Voortgangsregel onder de kop: opgeslagen + deze sessie, alleen weergave
  var sessionTotalForSkill = sessionSkillStatsRef.current[currentQuestion.skillId]
    ? sessionSkillStatsRef.current[currentQuestion.skillId].total
    : 0;
  var skillMastered = !!(skillStats && skillStats[currentQuestion.skillId] && skillStats[currentQuestion.skillId].mastered)
    || promotedThisSession.current.has(currentQuestion.skillId);
  var stillNeeded = goodNeeded(sessionCorrectForSkill, sessionTotalForSkill);
  var progressText;
  if (fixedSkillId) {
    progressText = "Los oefenen · telt niet mee";
  } else if (skillMastered) {
    progressText = "Beheerst ✓";
  } else if (storedCorrectForSkill + sessionCorrectForSkill >= skillTarget && stillNeeded > 0) {
    progressText = skillTarget + " van " + skillTarget + " goed · nog " + stillNeeded + (stillNeeded === 1 ? " goede som deze keer" : " goede sommen deze keer");
  } else {
    progressText = "Opgeslagen voortgang: " + skillProgress + " van " + skillTarget + " goed";
  }
  var progressPct = fixedSkillId ? 0 : skillMastered ? 100 : Math.round(skillProgress / skillTarget * 100);

  var showUitlegBlock = feedback === "wrong" && fbLevel > 0 && currentSkill && uitlegVisible;

  // Typen: alleen als gekozen voor deze modus én deze vraag getypt mag worden (anders keuzes).
  // Past het cijferblok niet op het scherm, dan toont deze vraag toch de keuzes (typeFit).
  var inputInfo   = resolveInput(subjectId, currentQuestion.skillId, currentQuestion);
  var typeAllowed = answerMode === "typen" && (inputInfo.inputType === "number" || inputInfo.inputType === "decimal");
  var typeMode    = typeAllowed && typeFit !== "kiezen";
  var kpBase      = KEYPAD_SIZES[tiny ? "tiny" : compact ? "compact" : "normal"];
  var kpSize      = (typeFit && typeFit !== "kiezen") ? typeFit : kpBase;

  var isMultiLineQuestion = String(currentQuestion.question).indexOf("\n") !== -1;
  // Kolomsom: een vraag met regeleinden waarvan elke regel een getal is. Andere vragen met
  // regeleinden (stippen, stroken, hokjes met tekst) staan gecentreerd en zonder streep.
  var isColumnSum = isMultiLineQuestion && String(currentQuestion.question).split("\n").every(function(line) {
    return COLUMN_LINE_RE.test(line.trim());
  });

  // Vraaggrootte: past de vraag niet in de kaart (een lang woord of een brede regel), dan
  // wordt alleen dan de letter kleiner, tot hoogstens Q_FONT_MIN. Past hij wel, dan blijft
  // alles precies zoals het was (60 px, of 44 px voor vragen met regeleinden; in de compacte
  // stand 48 px en 36 px, in de extra compacte stand 40 px en 32 px).
  // Gemeten vóór het eerste beeld (useLayoutEffect), opnieuw als de letters geladen zijn
  // (document.fonts.ready) en bij een andere schermbreedte. qFont staat niet in de
  // afhankelijkheden, dus het meten veroorzaakt geen lus.
  var qRef       = useRef(null);
  var qFontState = useState(null);
  var qFont      = qFontState[0];
  var setQFont   = qFontState[1];
  var qBase      = isMultiLineQuestion ? (tiny ? 32 : compact ? 36 : 44) : (tiny ? 40 : compact ? 48 : 60);

  useLayoutEffect(function() {
    var el = qRef.current;
    if (!el) return undefined;
    var active = true;
    function needWidth() { return Math.max(el.scrollWidth, el.getBoundingClientRect().width); }
    function fit() {
      if (!active || !el.parentElement) return;
      var parent = el.parentElement;
      var cs     = window.getComputedStyle(parent);
      var avail  = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      el.style.fontSize = qBase + "px";
      var f = qBase;
      if (needWidth() > avail + 0.5) {
        f = Math.max(Q_FONT_MIN, Math.floor(qBase * avail / needWidth()));
        el.style.fontSize = f + "px";
        while (f > Q_FONT_MIN && needWidth() > avail + 0.5) { f -= 1; el.style.fontSize = f + "px"; }
      }
      setQFont(f === qBase ? null : f);
    }
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    window.addEventListener("resize", fit);
    return function() { active = false; window.removeEventListener("resize", fit); };
  }, [currentQuestion.question, qBase]);

  // Passend cijferblok: bij Typen moet ✓ (Controleer) zonder scrollen in beeld staan. Gemeten
  // vóór het eerste beeld: de onderkant van ✓ vanaf de bovenkant van de pagina, tegen de echte
  // schermhoogte. Past het niet, dan eerst kleinere tussenruimte, dan een lager antwoordvak, dan
  // lagere toetsen (nooit onder KEYPAD_MIN, toetsen minstens 44 px). Past het dan nog niet, dan
  // toont deze vraag de keuzes; die gaan door dezelfde verwerking (handleChoice). Alleen bij
  // Typen; Kiezen meet hier niets. De opgeslagen keuze Typen blijft ongewijzigd.
  var kpWrapRef = useRef(null);
  useLayoutEffect(function() {
    if (!typeAllowed || feedback || typeFit === "kiezen") return undefined;
    var wrap = kpWrapRef.current;
    if (!wrap) return undefined;
    var ok = wrap.querySelector("[aria-label='Controleer']");
    if (!ok) return undefined;
    var over = ok.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
    if (over <= 0.5) return undefined;
    if (typeFit) { setTypeFit("kiezen"); return undefined; }
    var need = Math.ceil(over);
    // Met tekentoets in het antwoordvak blijft het vak hoog genoeg voor een toets van 44 px (plus de rand)
    var vakMin = (inputInfo.inputConfig.allowNegative || inputInfo.inputType === "decimal") ? VAK_MIN_TEKEN : KEYPAD_MIN.vakH;
    var room = 4 * (kpBase.keyH - KEYPAD_MIN.keyH) + 3 * (kpBase.gap - KEYPAD_MIN.gap) + (kpBase.vakH - vakMin);
    if (need > room) { setTypeFit("kiezen"); return undefined; }
    var gap = kpBase.gap, vakH = kpBase.vakH, keyH = kpBase.keyH;
    while (need > 0 && gap > KEYPAD_MIN.gap) { gap -= 1; need -= 3; }
    if (need > 0) { var v = Math.min(need, vakH - vakMin); vakH -= v; need -= v; }
    if (need > 0) { keyH = Math.max(KEYPAD_MIN.keyH, keyH - Math.ceil(need / 4)); }
    setTypeFit({ keyH: keyH, gap: gap, vakH: vakH });
    return undefined;
  }, [currentQuestion, qFont, typeFit, typeAllowed, feedback, tiny, compact]);

  // Andere schermgrootte (draaien, venster): opnieuw bepalen
  useEffect(function() {
    function reset() { setTypeFit(null); }
    window.addEventListener("resize", reset);
    return function() { window.removeEventListener("resize", reset); };
  }, []);

  // ── Render ────────────────────────────────────────────────────
  return (
    <Screen bg={A.bg} style={{ fontFamily: "'Nunito', 'Inter', system-ui, sans-serif" }}>

      {/* Top bar */}
      <div style={{
        background: A.bg,
        padding: "env(safe-area-inset-top, 0px) 0 0 0",
        borderBottom: "1px solid " + A.border,
        flexShrink: 0,
      }}>
        {/* Nav rij */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: compact ? "8px 16px" : "12px 20px",
        }}>
          {/* Terug / Sluiten knop */}
          <button
            onClick={handleBack}
            style={{
              background: A.bgCard,
              border: "1.5px solid " + A.border,
              borderRadius: A.r999,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: A.textMid,
              cursor: "pointer",
              boxShadow: A.shadow,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {"‹"}
          </button>

          {/* Skill naam */}
          <div style={{ textAlign: "center", flex: 1, margin: "0 12px" }}>
            <div style={{ fontSize: T.sm, fontWeight: 800, color: A.primary, letterSpacing: 0.5 }}>
              {getSubject(subjectId) ? getSubject(subjectId).label.toUpperCase() : "OPTELLEN"}
            </div>
            {currentSkill && (
              <div style={{ fontSize: T.xs, color: A.textSoft, fontWeight: 600, marginTop: 1 }}>
                {currentSkill.label}
              </div>
            )}
          </div>

          {/* Uitleg knop */}
          <button
            onClick={function() { setHelpOpen(true); }}
            aria-label={"Hoe doe ik dit?"}
            style={{
              background: A.bgCard,
              border: "1.5px solid " + A.border,
              borderRadius: A.r999,
              width: 36,
              height: 36,
              marginRight: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 17,
              cursor: "pointer",
              boxShadow: A.shadow,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {"💡"}
          </button>

          {/* Stop knop */}
          <button
            onClick={handleStop}
            style={{
              background: A.bgCard,
              border: "1.5px solid " + A.border,
              borderRadius: A.r999,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 700,
              color: A.textSoft,
              cursor: "pointer",
              boxShadow: A.shadow,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {"✕"}
          </button>
        </div>

        {/* Voortgang van deze vaardigheid (opgeslagen + nu) en sessieteller (alleen deze keer) */}
        <div style={{ padding: compact ? "0 16px 8px" : "0 20px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: T.xs, color: A.textMid, fontWeight: 700, lineHeight: 1.3 }}>
                {progressText}
              </div>
              <div style={{ height: 4, background: A.border, borderRadius: A.r999, overflow: "hidden", marginTop: 4 }}>
                <div style={{ height: "100%", width: progressPct + "%", background: A.primary, borderRadius: A.r999, transition: "width 0.3s" }} />
              </div>
            </div>
            <span style={{ fontSize: T.xs, color: A.primary, fontWeight: 800, flexShrink: 0, whiteSpace: "nowrap" }}>
              {results.filter(function(r) { return r.correct; }).length + " goed deze keer"}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollbaar content */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: tiny ? "8px 12px 16px" : compact ? "12px 16px 20px" : "20px 20px 32px",
        gap: tiny ? 8 : compact ? 10 : 16,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}>

        {/* Vraagkaart */}
        <div style={{
          background: A.bgCard,
          borderRadius: A.r20,
          padding: tiny ? "14px 12px 12px" : compact ? "20px 16px 18px" : "36px 24px 28px",
          textAlign: "center",
          boxShadow: A.shadowMd,
          border: "2px solid " + (
            feedback === "correct" ? A.successBorder
            : feedback === "wrong"   ? A.errorBorder
            : A.border
          ),
          transition: "border-color 0.2s",
        }}>

          {/* Strategie label (voor antwoord) */}
          {currentSkill && currentSkill.strategy && !feedback && (
            <div style={{
              fontSize: 10,
              fontWeight: 800,
              color: A.primary,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              marginBottom: tiny ? 4 : compact ? 8 : 14,
              opacity: 0.7,
            }}>
              {currentSkill.strategy}
            </div>
          )}

          {/* De som — een kolomsom (regels met alleen getallen): regels rechts uitgelijnd, cijfers
              even breed, streep onder de laatste regel. Andere vragen met regeleinden (plaatje +
              vraag): gecentreerd, zonder streep. Zonder regeleinde: ongewijzigd. */}
          <div ref={qRef} style={isMultiLineQuestion && !isColumnSum ? {
            fontSize: qFont || 44,
            fontWeight: 900,
            color: A.text,
            lineHeight: 1.15,
            whiteSpace: "pre-line",
            textAlign: "center",
          } : isMultiLineQuestion ? {
            display: "inline-block",
            fontSize: qFont || 44,
            fontWeight: 900,
            color: A.text,
            lineHeight: 1.15,
            whiteSpace: "pre-line",
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
            borderBottom: "3px solid " + A.text,
            paddingBottom: 4,
          } : {
            fontSize: qFont || 60,
            fontWeight: 900,
            color: A.text,
            letterSpacing: -1.5,
            lineHeight: 1.05,
          }}>
            {currentQuestion.question}
          </div>

          {/* Feedback na antwoord */}
          {feedback && (
            <div style={{
              marginTop: 16,
              fontSize: T.xl,
              fontWeight: 800,
              color: feedback === "correct" ? A.success : A.error,
              animation: "acPopIn 0.18s ease",
            }}>
              {feedback === "correct"
                ? ("✓ Goed zo!")
                : ("✖  Antwoord: " + currentQuestion.answer)
              }
            </div>
          )}
        </div>

        {/* Antwoordgebied: cijferblok als deze vraag getypt wordt, anders de vier keuzes */}
        <AnswerArea
          ref={kpWrapRef}
          inputType={typeMode ? inputInfo.inputType : "choice"}
          vraag={currentQuestion}
          size={tiny ? "tiny" : compact ? "compact" : "normal"}
          fit={kpSize}
          feedback={feedback}
          selected={selected}
          disabled={selected !== null}
          typed={typed}
          onDigit={handleTypedDigit}
          onBackspace={handleTypedBackspace}
          onSubmit={handleTypedSubmit}
          onSign={handleTypedSign}
          onComma={handleTypedComma}
          inputConfig={inputInfo.inputConfig}
          canSubmit={/^-?\d+(,\d+)?$/.test(typed)}
          onChoice={handleChoice}
        />

        {/* Uitlegkaart — verschijnt na fout, blijft tot "Volgende vraag" */}
        {showUitlegBlock && (
          <div style={{
            animation: "acSlideUp 0.22s ease",
          }}>
            {/* TIP blok */}
            <div style={{
              borderRadius: A.r16,
              border: "1.5px solid " + A.tipBorder,
              background: A.tipBg,
              padding: "14px 16px",
              borderLeft: "4px solid " + A.success,
            }}>
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: fbLevel >= 2 ? 10 : 0,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{"💡"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: T.xs, fontWeight: 800, color: A.tipTxt, letterSpacing: 0.8, marginBottom: 3 }}>
                    {"TIP — " + currentSkill.strategy.toUpperCase()}
                  </div>
                  <div style={{ fontSize: T.sm, color: A.tipTxt, lineHeight: 1.55, fontWeight: 600 }}>
                    {typeof currentSkill.tip === "function" ? currentSkill.tip(currentQuestion.terms, currentQuestion.answer) : currentSkill.tip}
                  </div>
                </div>
              </div>

              {/* UITLEG (bij 2+ fouten op deze skill) */}
              {fbLevel >= 2 && (
                <div style={{
                  borderTop: "1px solid " + A.uitlegBorder,
                  paddingTop: 10,
                  marginTop: 2,
                }}>
                  <div style={{ fontSize: T.xs, fontWeight: 800, color: A.uitlegTxt, letterSpacing: 0.8, marginBottom: 4 }}>
                    {"UITLEG"}
                  </div>
                  <div style={{ fontSize: T.sm, color: A.uitlegTxt, lineHeight: 1.55 }}>
                    {currentSkill.uitleg}
                  </div>

                  {/* VOORBEELD (bij 3+ fouten) */}
                  {fbLevel >= 3 && (
                    <div style={{
                      marginTop: 10,
                      padding: "10px 12px",
                      background: A.voorbeeldBg,
                      border: "1.5px solid " + A.voorbeeldBorder,
                      borderRadius: A.r12,
                    }}>
                      <div style={{ fontSize: T.xs, fontWeight: 800, color: A.voorbeeldTxt, letterSpacing: 0.8, marginBottom: 4 }}>
                        {"VOORBEELD"}
                      </div>
                      <div style={{ fontSize: T.sm, color: A.voorbeeldTxt, lineHeight: 1.55, whiteSpace: "pre-line" }}>
                        {currentSkill.voorbeeld}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Volgende vraag knop */}
            <button
              onClick={handleNextQuestion}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "17px 24px",
                background: A.primary,
                color: "#ffffff",
                border: "none",
                borderRadius: A.r16,
                fontSize: T.lg,
                fontWeight: 800,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                boxShadow: A.shadowMd,
                letterSpacing: 0.2,
              }}
            >
              {"Volgende vraag →"}
            </button>
          </div>
        )}

        {/* Bij correct: subtiele doorgaan-indicator */}
        {feedback === "correct" && (
          <div style={{
            textAlign: "center",
            fontSize: T.sm,
            color: A.success,
            fontWeight: 700,
            animation: "acFadeIn 0.3s ease",
          }}>
            {"✓ Volgende vraag..."}
          </div>
        )}
      </div>

      {/* Uitlegvenster (💡) — over het scherm heen, verandert de opmaak eronder niet */}
      {helpOpen && currentSkill && !showLevelUp && (
        <div
          onClick={function() { setHelpOpen(false); }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(26,29,58,0.45)",
            zIndex: 90,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            animation: "acFadeIn 0.15s ease",
          }}
        >
          <div
            onClick={function(e) { e.stopPropagation(); }}
            role="dialog"
            aria-label={"Hoe doe ik dit?"}
            style={{
              background: A.bgCard,
              width: "100%",
              maxWidth: 520,
              maxHeight: "85dvh",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              borderRadius: A.r20 + "px " + A.r20 + "px 0 0",
              padding: "20px 20px calc(20px + env(safe-area-inset-bottom))",
              boxShadow: A.shadowMd,
              animation: "acSlideUp 0.22s ease",
            }}
          >
            <div style={{ fontSize: T.lg, fontWeight: 900, color: A.text, marginBottom: 2 }}>
              {"💡 Hoe doe ik dit?"}
            </div>
            <div style={{ fontSize: T.xs, fontWeight: 800, color: A.primary, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 14 }}>
              {currentSkill.label + (currentSkill.strategy ? " · " + currentSkill.strategy : "")}
            </div>

            {/* Tip met de getallen van deze som: pas na het antwoorden (verklapt anders het antwoord) */}
            {feedback && (
              <div style={{
                borderRadius: A.r12,
                border: "1.5px solid " + A.tipBorder,
                background: A.tipBg,
                padding: "10px 12px",
                marginBottom: 10,
              }}>
                <div style={{ fontSize: T.xs, fontWeight: 800, color: A.tipTxt, letterSpacing: 0.8, marginBottom: 4 }}>
                  {"BIJ DEZE SOM"}
                </div>
                <div style={{ fontSize: T.sm, color: A.tipTxt, lineHeight: 1.55, fontWeight: 600 }}>
                  {typeof currentSkill.tip === "function" ? currentSkill.tip(currentQuestion.terms, currentQuestion.answer) : currentSkill.tip}
                </div>
              </div>
            )}

            <div style={{
              borderRadius: A.r12,
              border: "1.5px solid " + A.uitlegBorder,
              background: A.uitlegBg,
              padding: "10px 12px",
              marginBottom: 10,
            }}>
              <div style={{ fontSize: T.xs, fontWeight: 800, color: A.uitlegTxt, letterSpacing: 0.8, marginBottom: 4 }}>
                {"UITLEG"}
              </div>
              <div style={{ fontSize: T.sm, color: A.uitlegTxt, lineHeight: 1.55 }}>
                {currentSkill.uitleg}
              </div>
            </div>

            {currentSkill.voorbeeld && (
              <div style={{
                borderRadius: A.r12,
                border: "1.5px solid " + A.voorbeeldBorder,
                background: A.voorbeeldBg,
                padding: "10px 12px",
              }}>
                <div style={{ fontSize: T.xs, fontWeight: 800, color: A.voorbeeldTxt, letterSpacing: 0.8, marginBottom: 4 }}>
                  {"VOORBEELD"}
                </div>
                <div style={{ fontSize: T.sm, color: A.voorbeeldTxt, lineHeight: 1.55, whiteSpace: "pre-line" }}>
                  {currentSkill.voorbeeld}
                </div>
              </div>
            )}

            <button
              onClick={function() { setHelpOpen(false); }}
              style={{
                marginTop: 14,
                width: "100%",
                minHeight: 48,
                padding: "14px 20px",
                background: A.primary,
                color: "#ffffff",
                border: "none",
                borderRadius: A.r16,
                fontSize: T.md,
                fontWeight: 800,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {"Ik snap het"}
            </button>
          </div>
        </div>
      )}

      {/* Level-up overlay */}
      {showLevelUp && levelUpData && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(26,29,58,0.65)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: A.bgCard,
            borderRadius: A.r20,
            padding: "40px 28px",
            textAlign: "center",
            boxShadow: A.shadowLg,
            maxWidth: 340,
            width: "100%",
            border: "2px solid " + A.primary,
            animation: "acPopIn 0.22s ease",
          }}>
            <div style={{ fontSize: 56, marginBottom: 14, lineHeight: 1 }}>
              {"🎓"}
            </div>
            <div style={{ fontSize: T.xxl, fontWeight: 900, color: A.text, marginBottom: 6 }}>
              {"Skill beheerst!"}
            </div>
            <div style={{
              fontSize: T.lg,
              fontWeight: 800,
              color: A.primary,
              marginBottom: 8,
            }}>
              {levelUpData.skillLabel}
            </div>
            <div style={{
              display: "inline-block",
              background: A.primaryLight,
              border: "1px solid " + A.border,
              borderRadius: A.r999,
              padding: "4px 14px",
              fontSize: T.sm,
              color: A.primary,
              fontWeight: 700,
              marginBottom: 24,
            }}>
              {levelUpData.liveTotal + " van " + skillOrder.length + " — " + levelUpData.newTitel + " " + (getSubject(subjectId) ? getSubject(subjectId).label.toLowerCase() : "optellen")}
            </div>
            <button
              onClick={handleLevelUpContinue}
              style={{
                background: A.primary,
                color: "#ffffff",
                border: "none",
                borderRadius: A.r16,
                padding: "17px 32px",
                fontSize: T.lg,
                fontWeight: 800,
                cursor: "pointer",
                width: "100%",
                boxShadow: A.shadowMd,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {autoNextLabel && onAutoNext ? (typeof autoNextLabel === "function" ? autoNextLabel(buildResult()) : autoNextLabel) : "Ga verder →"}
            </button>
          </div>
        </div>
      )}

      <style>
        {"@keyframes acPopIn { from { transform: scale(0.82); opacity: 0; } to { transform: scale(1); opacity: 1; } }" +
        "@keyframes acSlideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }" +
        "@keyframes acFadeIn { from { opacity: 0; } to { opacity: 1; } }" +
        "button:active { transform: scale(0.97) !important; }"}
      </style>
    </Screen>
  );
}
