import { defineConfig } from "vite-plus";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    exclude: ["**/node_modules/**", "**/scripts/**"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
