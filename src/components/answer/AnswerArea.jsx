import { forwardRef } from "react";
import ChoiceGrid from "./ChoiceGrid.jsx";
import NumberAnswer from "./NumberAnswer.jsx";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Antwoordgebied: kiest de invoercomponent bij inputType. Alleen "number" heeft een eigen
// component (cijferblok); al het andere, ook een onbekend type, toont de vier keuzes.
// Of een vraag getypt wordt (voorkeur, resolveInput, past het op het scherm) beslist het
// oefenscherm; dat geeft hier het type door dat getoond moet worden.
//
// Contract voor elke invoercomponent:
//   - kijkt zelf niet na en verwerkt niets; geeft de ruwe invoer door (onSubmit / onChoice);
//   - een component met eigen invoer heeft een knop met aria-label "Controleer" (daarop meet
//     het oefenscherm of het antwoordgebied op het scherm past);
//   - props: vraag, size (normal / compact / tiny), fit, feedback, selected, disabled.
var AnswerArea = forwardRef(function AnswerArea(props, ref) {
  if (props.inputType === "number") {
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
    />
  );
});

export default AnswerArea;
