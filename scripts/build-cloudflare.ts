/// <reference types="node" />
import { spawn } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { ensurePreviewConvexAuth } from "./ensure-preview-convex-auth.ts";

/**
Workers Builds supplies CONVEX_DEPLOY_KEY from Production or Previews Base build settings.
Local builds run only build:app. Preview builds reuse the branch deployment and initialize
missing auth settings without replacing existing credentials.
*/
const PRODUCTION_BRANCH = "main";
const DEPLOY_KEY = "CONVEX_DEPLOY_KEY";

export function selectConvexDeploy(env: NodeJS.ProcessEnv) {
  if (env.WORKERS_CI !== "1" && env.WORKERS_CI !== "true") {
    return { args: ["run", "build:app"], previewName: null };
  }
  const branch = env.WORKERS_CI_BRANCH;
  if (!branch) {
    throw new Error(
      "Cloudflare Workers Builds must provide WORKERS_CI_BRANCH. Run build:app for a local build.",
    );
  }

  const preview = branch !== PRODUCTION_BRANCH;
  const deployKey = env[DEPLOY_KEY];
  if (!deployKey) {
    throw new Error(
      `Set ${DEPLOY_KEY} for Cloudflare Workers branch ${branch}.`,
    );
  }
  // Convex ignores --preview-name for deployment keys. Require a project preview key.
  if (preview && !/^preview:[^:|]+:[^:|]+\|.+$/.test(deployKey)) {
    throw new Error(`${DEPLOY_KEY} must be a Convex preview deploy key.`);
  }

  return {
    args: [
      "exec",
      "convex",
      "deploy",
      ...(preview ? ["--preview-name", branch] : []),
      "--cmd",
      "pnpm run build:app",
    ],
    previewName: preview ? branch : null,
  };
}

export async function main(env: NodeJS.ProcessEnv = process.env) {
  const deployment = selectConvexDeploy(env);

  await new Promise<void>((resolve, reject) => {
    const child = spawn("pnpm", deployment.args, {
      env,
      shell: process.platform === "win32",
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Cloudflare build failed with exit code ${code ?? 1}.`));
    });
  });

  if (deployment.previewName) {
    ensurePreviewConvexAuth(env, deployment.previewName);
  }
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  await main();
}
