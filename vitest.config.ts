import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@llkit": fileURLToPath(new URL("./llkit", import.meta.url)) } },
  define: {
    __APP_VERSION__: JSON.stringify("test"),
    __STORE__: "false",
    __TYPST_BUNDLED__: "false",
  },
  test: { include: ["tests/**/*.test.ts"] },
});
