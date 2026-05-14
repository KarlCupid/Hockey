import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "three-r3f": ["three", "@react-three/fiber", "@react-three/drei"]
        }
      }
    }
  }
});
