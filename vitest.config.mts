import { defineConfig } from "vitest/config";
import nextEnv from "@next/env";
import { fileURLToPath } from "node:url";

nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    // Remote Supabase session poolers can make the end-to-end service fixture
    // exceed 15 seconds while each assertion still completes normally.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
