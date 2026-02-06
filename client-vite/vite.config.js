import { defineConfig } from "vite";

export default defineConfig({
  define: {
    // This satisfies libraries that read process.env
    "process.env": {}
  }
});
