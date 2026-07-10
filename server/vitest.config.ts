import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    restoreMocks: true,
    // Every DB-backed test file TRUNCATEs the same database in beforeEach, so running
    // files concurrently lets one wipe another's fixtures mid-test.
    fileParallelism: false
  }
});
