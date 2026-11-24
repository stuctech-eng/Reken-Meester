import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// __TOPO__: Topografie alleen in een Vercel-preview en bij "npm run dev", nooit in productie (plan T3 par. 2;
// src/core/topo/zichtbaar.js). Ontbreekt VERCEL_ENV bij een build, dan is Topografie dus niet zichtbaar.
export default defineConfig(function(env) {
  return {
    plugins: [react()],
    define: {
      __TOPO__: JSON.stringify(process.env.VERCEL_ENV === "preview" || env.mode === "development"),
    },
  };
});
