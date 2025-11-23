import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@components": resolve(__dirname, "src/components"),
      "@services": resolve(__dirname, "src/services"),
      "@modules": resolve(__dirname, "src/modules"),
      "@utils": resolve(__dirname, "src/utils"),
      "@styles": resolve(__dirname, "src/styles"),
    },
  },
  build: {
    outDir: "dist-renderer",
    emptyOutDir: true,
    rollupOptions: {
      external: ["electron", "better-sqlite3"],
    },
  },
  server: {
    port: 5173,
  },
});
