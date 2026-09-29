import { spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import process from "node:process";
import { fileURLToPath } from "node:url";

const convexCli = fileURLToPath(
  new URL("../node_modules/convex/bin/main.js", import.meta.url),
);

function runConvex(args: string[], env: NodeJS.ProcessEnv, input: string) {
  const result = spawnSync(process.execPath, [convexCli, ...args], {
    env,
    input,
    stdio: "pipe",
  });
  if (result.status !== 0) {
    // CLI output and stdin can contain credentials. Do not include them in errors.
    throw new Error(
      `Convex preview auth ${args[1]} failed with exit code ${result.status ?? "unknown"}.`,
    );
  }
  return result.stdout.toString("utf8").trim();
}

/** Preserve existing preview credentials and initialize only missing auth settings. */
export function ensurePreviewConvexAuth(
  env: NodeJS.ProcessEnv,
  previewName: string,
) {
  const selector = ["--preview-name", previewName];
  const privateKey = runConvex(
    ["env", "get", "JWT_PRIVATE_KEY", ...selector],
    env,
    "",
  );
  const jwks = runConvex(["env", "get", "JWKS", ...selector], env, "");
  const siteUrl = runConvex(["env", "get", "SITE_URL", ...selector], env, "");

  if ((privateKey && !jwks) || (jwks && !privateKey)) {
    throw new Error("JWT_PRIVATE_KEY and JWKS must be configured together.");
  }

  let settings = "";
  if (!privateKey && !jwks) {
    const keys = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicExponent: 0x10001,
    });
    const pem = keys.privateKey.export({ format: "pem", type: "pkcs8" });
    const publicJwk = keys.publicKey.export({ format: "jwk" });
    settings = `JWT_PRIVATE_KEY="${pem.toString().trimEnd().replace(/\n/g, " ")}"
JWKS='${JSON.stringify({ keys: [{ use: "sig", ...publicJwk }] })}'
`;
  }
  if (!siteUrl) {
    settings += `SITE_URL=https://chessmerge.com
`;
  }

  if (settings) {
    // A single, non-forced update keeps the key pair together and rejects conflicts.
    runConvex(["env", "set", ...selector], env, settings);
  }
}
