// Is Topografie zichtbaar in deze build? (plan T3 par. 2) Alleen in een Vercel-preview (VERCEL_ENV "preview") en bij
// "npm run dev"; nooit in productie (main), tot T5. De waarde zet vite.config.js bij het bouwen (__TOPO__). Buiten Vite
// (de tests in Node) is __TOPO__ er niet, en dan geldt: niet zichtbaar, zoals in productie.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.

/* global __TOPO__ */
export var TOPO_ZICHTBAAR = typeof __TOPO__ !== "undefined" && __TOPO__ === true;
