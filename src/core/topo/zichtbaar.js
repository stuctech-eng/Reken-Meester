// Is Topografie zichtbaar in deze build? Sinds 25-11-2026 (na T4) in elke build, ook in productie; verbergen kan met de
// omgevingsvariabele TOPO_UIT=1 bij het bouwen (Vercel). De waarde zet vite.config.js bij het bouwen (__TOPO__). Buiten Vite
// (de tests in Node) is __TOPO__ er niet, en dan geldt: niet zichtbaar (de tests zetten hem zelf als ze Topografie nodig hebben).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.

/* global __TOPO__ */
export var TOPO_ZICHTBAAR = typeof __TOPO__ !== "undefined" && __TOPO__ === true;
