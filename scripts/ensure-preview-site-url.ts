import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const convexCli = fileURLToPath(new URL("../node_modules/convex/bin/main.js", import.meta.url));

function runConvex(args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(process.execPath, [convexCli, ...args], { env, stdio: "pipe" });
  if (result.status !== 0) {
    // CLI output can contain credentials. Do not include it in errors.
    throw new Error(
      `Convex preview SITE_URL ${args[1]} failed with exit code ${result.status ?? "unknown"}.`,
    );
  }
  return result.stdout.toString("utf8").trim();
}

/** Keep ChessMerge's redirect fallback after the standard Convex deploy and auth setup. */
export function ensurePreviewSiteUrl(env: NodeJS.ProcessEnv = process.env) {
  if (env["WORKERS_CI"] !== "1" && env["WORKERS_CI"] !== "true") return;
  const branch = env["WORKERS_CI_BRANCH"];
  if (!branch) throw new Error("Workers Builds must provide WORKERS_CI_BRANCH.");
  if (branch === "main") return;

  const selection = ["--preview-name", branch];
  if (!runConvex(["env", "get", "SITE_URL", ...selection], env)) {
    runConvex(["env", "set", ...selection, "--", "SITE_URL", "https://chessmerge.com"], env);
  }
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  ensurePreviewSiteUrl();
}
