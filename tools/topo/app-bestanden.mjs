// De bestanden van de app buiten src/core/topo die Topografie mag wijzigen, per fase (voor de bewakers in test-randen.mjs en
// test-steden-nl.mjs: de rest van de app blijft onaangeroerd). Een lijst, zodat de bewakers niet uit elkaar lopen.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.

export var APP_BESTANDEN = [
  // plan T3: de app koppelt Topografie
  "src/core/subjects.js", "src/core/inputResolve.js", "src/screens/PracticeScreen.jsx", "src/screens/HomeScreen.jsx", "src/App.jsx",
  "src/components/ModusLader.jsx", "src/components/answer/AnswerArea.jsx", "src/components/answer/KaartAntwoord.jsx",
  "src/components/answer/KaartGrens.jsx", "vite.config.js",
  // T3c: namen typen, kaart als figuur
  "src/core/grading.js", "src/components/answer/NaamAnswer.jsx", "src/components/answer/kaartMaat.js",
  // plan T4 par. 5.2: beheersing per item (de itemstand in de voortgang, de balk in het modusscherm)
  "src/core/voortgang.js", "src/screens/SubjectScreen.jsx",
];
