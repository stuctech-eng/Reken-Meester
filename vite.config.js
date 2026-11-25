import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// __TOPO__: Topografie is zichtbaar in elke build, ook in productie (besluit 25-11-2026, na T4; src/core/topo/zichtbaar.js).
// Verbergen zonder codewijziging: de omgevingsvariabele TOPO_UIT=1 in Vercel en opnieuw bouwen (deploy).
export default defineConfig(function() {
  return {
    plugins: [react()],
    define: {
      __TOPO__: JSON.stringify(process.env.TOPO_UIT !== "1"),
    },
  };
});
