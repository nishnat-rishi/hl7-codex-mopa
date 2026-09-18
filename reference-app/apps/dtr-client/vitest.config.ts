import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "dtr-client",
    environment: "node",
    include: ["app/**/*.test.ts"],
  },
});
