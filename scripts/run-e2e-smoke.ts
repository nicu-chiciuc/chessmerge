/// <reference types="node" />
import { spawn } from "node:child_process";
import process from "node:process";

const smokeEnv: NodeJS.ProcessEnv = {
  ...process.env,
  CHESSMERGE_E2E_SMOKE: "1",
  VITE_CONVEX_URL: "https://smoke-test.convex.cloud",
};

await new Promise<void>((resolve, reject) => {
  const child = spawn(
    "pnpm",
    ["exec", "playwright", "test", "e2e/hydration.spec.ts"],
    {
      env: smokeEnv,
      shell: process.platform === "win32",
      stdio: "inherit",
    },
  );
  child.on("error", reject);
  child.on("close", (code) => {
    if (code === 0) {
      resolve();
      return;
    }

    reject(
      new Error(`Hydration smoke test failed with exit code ${code ?? 1}.`),
    );
  });
});
