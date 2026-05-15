import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("three") || id.includes("@react-three")) return "three-r3f";
            if (id.includes("react") || id.includes("react-dom")) return "react-vendor";
          }
          if (id.includes("src/components/editors")) return "editor-lab";
          if (id.includes("src/components/rooms/DevToolsPanel") || id.includes("dynastyPlaytest") || id.includes("balanceReport")) return "qa-reports";
          if (id.includes("src/components/three")) return "three-surfaces";
          return undefined;
        }
      }
    }
  }
});
