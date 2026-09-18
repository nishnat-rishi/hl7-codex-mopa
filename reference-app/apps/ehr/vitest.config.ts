import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "ehr",
    environment: "node",
    include: ["app/**/*.test.ts"],
  },
});
