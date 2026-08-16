import { spawn } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";

const productionKey = "CONVEX_DEPLOY_KEY";
const previewKey = "PREVIEW_CONVEX_DEPLOY_KEY";

type DeployPlan =
  | { kind: "frontend" }
  | { kind: "convex"; deployKey: string; args: string[] };

function isWorkersBuild(env: NodeJS.ProcessEnv) {
  return env.WORKERS_CI === "1" || env.WORKERS_CI === "true";
}

export function selectDeployPlan(env: NodeJS.ProcessEnv): DeployPlan {
  const branch = env.WORKERS_CI_BRANCH;

  if (!branch) {
    if (isWorkersBuild(env)) {
      throw new Error("Workers Builds must provide WORKERS_CI_BRANCH.");
    }
    if (env[productionKey] || env[previewKey]) {
      throw new Error(
        "Set WORKERS_CI_BRANCH when a Convex deploy key is present.",
      );
    }
    return { kind: "frontend" };
  }

  const isProduction = branch === "main";
  const deployKey = env[isProduction ? productionKey : previewKey];
  if (!deployKey) {
    throw new Error(
      `Set ${isProduction ? productionKey : previewKey} for branch ${branch}.`,
    );
  }

  return {
    kind: "convex",
    deployKey,
    args: [
      "convex",
      "deploy",
      ...(isProduction ? [] : ["--preview-name", branch]),
      "--cmd",
      "npm run build:app",
    ],
  };
}

function run(command: string, args: string[], env = process.env) {
  return new Promise<void>((resolve, reject) => {
    const executable =
      process.platform === "win32" ? `${command}.cmd` : command;
    const child = spawn(executable, args, { env, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} failed with exit code ${code ?? 1}.`));
    });
  });
}

export async function main(env = process.env) {
  const plan = selectDeployPlan(env);
  if (plan.kind === "frontend") {
    await run("npm", ["run", "build:app"], env);
    return;
  }

  const convexEnv: NodeJS.ProcessEnv = {
    ...env,
    CONVEX_DEPLOY_KEY: plan.deployKey,
  };
  delete convexEnv.PREVIEW_CONVEX_DEPLOY_KEY;
  await run("npx", plan.args, convexEnv);
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  await main();
}
