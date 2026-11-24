import { forwardRef, lazy, Suspense } from "react";
import ChoiceGrid from "./ChoiceGrid.jsx";
import NumberAnswer from "./NumberAnswer.jsx";
import FractionAnswer from "./FractionAnswer.jsx";
import PairAnswer from "./PairAnswer.jsx";
import { readAnswerQuantity, quantityMaxDecimals } from "../../core/answerCheck.js";
import KaartGrens from "./KaartGrens.jsx";

// Aanwijzen op de kaart (Topografie, plan T3 par. 3.2): pas geladen als een vraag de kaart nodig heeft, zodat de kaart en zijn
// code niet in de standaardbundel staan (plan T3 par. 3.1)
var KaartAntwoord = lazy(function() { return import("./KaartAntwoord.jsx"); });

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Antwoordgebied: kiest de invoercomponent bij inputType. Alleen "number" heeft een eigen
// component (cijferblok); "decimal" is hetzelfde cijferblok met een kommatoets, "money" ook, met
// "\u20ac" voor het getal; "percent" is het gewone cijferblok met "%" achter het getal; "quantity" is het
// cijferblok met de eenheid van het antwoord achter het getal (kommatoets alleen met allowDecimal); "fraction"
// is het breukvak (FractionAnswer: teller, noemer en bij inputConfig.gemengd een geheel); "pair" zijn twee
// vakjes naast elkaar met inputConfig.tussen ertussen ("rest" of ":"; PairAnswer); "kaart" is aanwijzen op de kaart
// (KaartAntwoord, pas geladen bij gebruik; bij een fout een melding). Al het andere,
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
//     formuleEenRegel (keuzes: formules op één regel als dat past; alleen Algebra, Algebra 2 en Functies),
//     onNext (alleen de kaart: "Volgende vraag" na een fout, op de plek van "Dit is mijn antwoord").
var AnswerArea = forwardRef(function AnswerArea(props, ref) {
  if (props.inputType === "kaart") {
    // Gaat het laden of tekenen van de kaart mis, dan een zichtbare melding met "Opnieuw laden"; nooit de keuzes, want die
    // verraden het antwoord van een aanwijsvraag (besluit 24-11-2026)
    return (
      <KaartGrens>
        <Suspense fallback={<div role="status" style={{ padding: 16, textAlign: "center", fontWeight: 800 }}>{"Kaart laden…"}</div>}>
          <KaartAntwoord key={props.breukKey} vraag={props.vraag} feedback={props.feedback} selected={props.selected} disabled={props.disabled} onChoice={props.onChoice} onNext={props.onNext} />
        </Suspense>
      </KaartGrens>
    );
  }
  if (props.inputType === "fraction") {
    // breukKey: per getoonde vraag nieuw, zodat het breukvak bij elke vraag leeg begint
    return (
      <FractionAnswer
        key={props.breukKey}
        ref={ref}
        size={props.size}
        fit={props.fit}
        feedback={props.feedback}
        disabled={props.disabled}
        gemengd={!!(props.inputConfig && props.inputConfig.gemengd)}
        onSubmit={props.onSubmitBreuk}
      />
    );
  }
  if (props.inputType === "pair") {
    // zelfde key als het breukvak: per getoonde vraag nieuw, zodat de vakjes bij elke vraag leeg beginnen
    return (
      <PairAnswer
        key={props.breukKey}
        ref={ref}
        size={props.size}
        fit={props.fit}
        feedback={props.feedback}
        disabled={props.disabled}
        tussen={props.inputConfig && props.inputConfig.tussen}
        onSubmit={props.onSubmitBreuk}
      />
    );
  }
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
