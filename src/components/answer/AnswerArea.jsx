import { forwardRef } from "react";
import ChoiceGrid from "./ChoiceGrid.jsx";
import NumberAnswer from "./NumberAnswer.jsx";
import { readAnswerQuantity, quantityMaxDecimals } from "../../core/answerCheck.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Antwoordgebied: kiest de invoercomponent bij inputType. Alleen "number" heeft een eigen
// component (cijferblok); "decimal" is hetzelfde cijferblok met een kommatoets, "money" ook, met
// "\u20ac" voor het getal; "percent" is het gewone cijferblok met "%" achter het getal; "quantity" is het
// cijferblok met de eenheid van het antwoord achter het getal (kommatoets alleen met allowDecimal). Al het andere,
// ook een onbekend type, toont de vier keuzes.
// Of een vraag getypt wordt (voorkeur, resolveInput, past het op het scherm) beslist het
// oefenscherm; dat geeft hier het type door dat getoond moet worden.
//
// Contract voor elke invoercomponent:
//   - kijkt zelf niet na en verwerkt niets; geeft de ruwe invoer door (onSubmit / onChoice);
//   - een component met eigen invoer heeft een knop met aria-label "Controleer" (daarop meet
//     het oefenscherm of het antwoordgebied op het scherm past);
//   - props: vraag, size (normal / compact / tiny), fit, feedback, selected, disabled,
//     inputConfig (bijvoorbeeld allowNegative: tekentoets in het antwoordvak),
//     formuleEenRegel (keuzes: formules op één regel als dat past; alleen Algebra en Algebra 2).
var AnswerArea = forwardRef(function AnswerArea(props, ref) {
  if (props.inputType === "number" || props.inputType === "decimal" || props.inputType === "money" || props.inputType === "percent" || props.inputType === "quantity") {
    var hv = props.inputType === "quantity" ? readAnswerQuantity(props.vraag && props.vraag.answer) : null;
    return (
      <NumberAnswer
        ref={ref}
        size={props.size}
        fit={props.fit}
        feedback={props.feedback}
        disabled={props.disabled}
        typed={props.typed}
        onDigit={props.onDigit}
        onBackspace={props.onBackspace}
        onSubmit={props.onSubmit}
        onSign={props.onSign}
        komma={props.inputType === "decimal" || props.inputType === "money" || (props.inputType === "quantity" && quantityMaxDecimals(props.inputConfig) > 0)}
        euro={props.inputType === "money"}
        procent={props.inputType === "percent"}
        eenheid={hv ? hv.eenheid : null}
        onComma={props.onComma}
        inputConfig={props.inputConfig}
        canSubmit={props.canSubmit}
      />
    );
  }
  return (
    <ChoiceGrid
      vraag={props.vraag}
      size={props.size}
      feedback={props.feedback}
      selected={props.selected}
      onChoice={props.onChoice}
      formuleEenRegel={props.formuleEenRegel}
    />
  );
});

export default AnswerArea;
