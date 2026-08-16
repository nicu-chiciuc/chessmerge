/// <reference types="node" />
import { spawn } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";

/**
Samebase writes both Convex deploy keys to both Cloudflare Workers Builds triggers because the
Cloudflare dashboard shows one shared build-variable table. The Builds API can store variables per
trigger, but Samebase keeps its API-created setup equivalent to the dashboard setup.

This file has one job. It selects `CONVEX_DEPLOY_KEY` on `main` or
`PREVIEW_CONVEX_DEPLOY_KEY` on another branch. It then gives only the selected value to Convex as
`CONVEX_DEPLOY_KEY` and runs `build:app`. Keep application setup and provider migration work out of
this file. Run `node --run build:app` directly for a local application build.
*/
const PRODUCTION_BRANCH = "main";
const PRODUCTION_KEY = "CONVEX_DEPLOY_KEY";
const PREVIEW_KEY = "PREVIEW_CONVEX_DEPLOY_KEY";

export function selectConvexDeploy(env: NodeJS.ProcessEnv) {
  const branch = env.WORKERS_CI_BRANCH;
  if (!branch) {
    throw new Error(
      "Cloudflare Workers Builds must provide WORKERS_CI_BRANCH. Run build:app for a local build.",
    );
  }

  const preview = branch !== PRODUCTION_BRANCH;
  const keyName = preview ? PREVIEW_KEY : PRODUCTION_KEY;
  const deployKey = env[keyName];
  if (!deployKey) {
    throw new Error(`Set ${keyName} for Cloudflare Workers branch ${branch}.`);
  }

  return {
    args: [
      "--no-install",
      "convex",
      "deploy",
      ...(preview ? ["--preview-name", branch] : []),
      "--cmd",
      "node --run build:app",
    ],
    deployKey,
  };
}

export async function main(env: NodeJS.ProcessEnv = process.env) {
  const deployment = selectConvexDeploy(env);
  const convexEnv: NodeJS.ProcessEnv = {
    ...env,
    CONVEX_DEPLOY_KEY: deployment.deployKey,
  };
  delete convexEnv.PREVIEW_CONVEX_DEPLOY_KEY;

  await new Promise<void>((resolve, reject) => {
    const child = spawn("npx", deployment.args, {
      env: convexEnv,
      shell: process.platform === "win32",
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Convex deploy failed with exit code ${code ?? 1}.`));
    });
  });
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  await main();
}
