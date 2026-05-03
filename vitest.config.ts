import { defineConfig } from "vitest/config";
import { resolve } from "path";

// Pure-TS modules transitively import "photoshop" (the UXP host module). Tests
// don't run inside Photoshop, so alias it to a stub that throws if a PS API is
// actually invoked. Pure functions load cleanly through this.
export default defineConfig({
  resolve: {
    alias: {
      photoshop: resolve(__dirname, "test/photoshop-stub.ts"),
      uxp: resolve(__dirname, "test/uxp-stub.ts"),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
