// Welke invoer krijgt een vraag? Eén beslispunt voor het oefenscherm.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Volgorde (het eerste dat iets zegt, beslist):
//   1. de vraag zelf:        vraag.inputType / gradingRule / inputConfig
//   2. de vaardigheid:       standaard van de vaardigheid die de vraag maakte
//                            (vraag.bronSkillId bij een gemengde ronde, anders skillId)
//   3. de modus:             de bestaande regels in answerCheck.js (canTypeQuestion)
//   4. veilige terugval:     Kiezen
// Een type of nakijkregel die het oefenscherm (nog) niet kan tonen of nakijken, wordt nooit
// als iets anders behandeld: dan is het Kiezen.

import { getSkillList } from "./subjects.js";
import { canTypeQuestion, parseTypedInteger } from "./answerCheck.js";

// Wat het oefenscherm nu kan: typen met het cijferblok (number) en de vier keuzes (choice),
// elk met de nakijkregel die erbij hoort. Een andere combinatie kan niet worden nagekeken.
var PASSEND = {
  number: { numeric_equal: true },
  choice: { choice_exact: true },
};
var STANDAARD_REGEL = { number: "numeric_equal", choice: "choice_exact" };

var KIEZEN = { inputType: "choice", gradingRule: "choice_exact", inputConfig: {} };

function velden(bron) {
  if (!bron || !bron.inputType) return null;
  return {
    inputType:   bron.inputType,
    gradingRule: bron.gradingRule || STANDAARD_REGEL[bron.inputType] || null,
    inputConfig: bron.inputConfig || {},
  };
}

// Vaardigheid exact opzoeken (getSkill valt bij een onbekende id terug op de eerste
// vaardigheid; dat mag hier niet, anders gelden stil de instellingen van een andere vaardigheid)
function vindVaardigheid(subjectId, id) {
  if (!id) return null;
  var lijst = getSkillList(subjectId) || [];
  for (var i = 0; i < lijst.length; i++) { if (lijst[i].id === id) return lijst[i]; }
  return null;
}

function metBron(r, bron) {
  return { inputType: r.inputType, gradingRule: r.gradingRule, inputConfig: r.inputConfig, bron: bron };
}

export function resolveInput(subjectId, skillId, question) {
  // Fout spotten is altijd kiezen, ook als een vraag of vaardigheid iets anders zou zeggen
  if (!question) return metBron(KIEZEN, "geen-vraag");
  if (question.isErrorSpotter) return metBron(KIEZEN, "fout-spotter");

  var r = velden(question);
  var bron = "vraag";
  if (!r) {
    r = velden(vindVaardigheid(subjectId, question.bronSkillId || skillId));
    bron = "vaardigheid";
  }
  if (!r) {
    r = canTypeQuestion(subjectId, skillId, question)
      ? { inputType: "number", gradingRule: "numeric_equal", inputConfig: {} }
      : KIEZEN;
    bron = "modus";
  }

  // Alleen wat gebouwd is; anders veilig Kiezen
  if (!PASSEND[r.inputType] || !PASSEND[r.inputType][r.gradingRule]) return metBron(KIEZEN, "terugval");
  // Getypt antwoord moet ook nagekeken kunnen worden: het verwachte antwoord moet leesbaar zijn
  if (r.inputType === "number" && parseTypedInteger(String(question.answer)) !== question.answer) return metBron(KIEZEN, "terugval");
  return metBron(r, bron);
}
