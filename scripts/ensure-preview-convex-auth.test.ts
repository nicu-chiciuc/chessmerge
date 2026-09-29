import { spawnSync } from "node:child_process";
import { parse } from "dotenv";
import { exportJWK, importPKCS8 } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensurePreviewConvexAuth } from "./ensure-preview-convex-auth.ts";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn() }));

const env = { CONVEX_DEPLOY_KEY: "preview-key" };
const previewName = "preview-persistence";
const cli = expect.stringMatching(/convex[\\/]bin[\\/]main\.js$/);
const run = vi.mocked(spawnSync);

function result(stdout: string, status = 0) {
  return {
    pid: 1,
    output: [null, Buffer.from(stdout), Buffer.from("sensitive stderr")],
    stdout: Buffer.from(stdout),
    stderr: Buffer.from("sensitive stderr"),
    status,
    signal: null,
  };
}

function reads(privateKey: string, jwks: string, siteUrl: string) {
  run.mockReturnValueOnce(result(privateKey));
  run.mockReturnValueOnce(result(jwks));
  run.mockReturnValueOnce(result(siteUrl));
}

beforeEach(() => {
  run.mockReset();
  run.mockReturnValue(result(""));
});

describe("preview authentication setup", () => {
  it("preserves existing credentials and targets every read at the named preview", () => {
    reads("existing-private-key", "existing-jwks", "https://custom.example");

    ensurePreviewConvexAuth(env, previewName);

    expect(run.mock.calls).toEqual(
      ["JWT_PRIVATE_KEY", "JWKS", "SITE_URL"].map((name) => [
        process.execPath,
        [cli, "env", "get", name, "--preview-name", previewName],
        { env, input: "", stdio: "pipe" },
      ]),
    );
  });

  it("creates a matching key pair once in a single non-forced update", async () => {
    reads("", "", "");

    ensurePreviewConvexAuth(env, previewName);

    expect(run).toHaveBeenCalledTimes(4);
    expect(run).toHaveBeenLastCalledWith(
      process.execPath,
      [cli, "env", "set", "--preview-name", previewName],
      { env, input: expect.any(String), stdio: "pipe" },
    );
    const input = run.mock.calls[3]?.[2]?.input;
    if (typeof input !== "string") throw new Error("Expected dotenv input");
    const settings = parse(input);
    const privateKey = await importPKCS8(settings.JWT_PRIVATE_KEY, "RS256", {
      extractable: true,
    });
    const privateJwk = await exportJWK(privateKey);
    expect(JSON.parse(settings.JWKS)).toEqual({
      keys: [{ kty: "RSA", n: privateJwk.n, e: privateJwk.e, use: "sig" }],
    });
    expect(settings.SITE_URL).toBe("https://chessmerge.com");

    run.mockClear();
    reads(settings.JWT_PRIVATE_KEY, settings.JWKS, settings.SITE_URL);
    ensurePreviewConvexAuth(env, previewName);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("adds a missing site URL without changing existing keys", () => {
    reads("existing-private-key", "existing-jwks", "");

    ensurePreviewConvexAuth(env, previewName);

    expect(run).toHaveBeenLastCalledWith(
      process.execPath,
      [cli, "env", "set", "--preview-name", previewName],
      { env, input: "SITE_URL=https://chessmerge.com\n", stdio: "pipe" },
    );
  });

  it("keeps a custom site URL when it creates missing keys", () => {
    reads("", "", "https://custom.example");

    ensurePreviewConvexAuth(env, previewName);

    const input = run.mock.calls[3]?.[2]?.input;
    if (typeof input !== "string") throw new Error("Expected dotenv input");
    expect(Object.keys(parse(input)).sort()).toEqual([
      "JWKS",
      "JWT_PRIVATE_KEY",
    ]);
  });

  it.each([
    ["existing-private-key", ""],
    ["", "existing-jwks"],
  ])("rejects an incomplete key pair without writing", (privateKey, jwks) => {
    reads(privateKey, jwks, "");

    expect(() => ensurePreviewConvexAuth(env, previewName)).toThrow(
      "JWT_PRIVATE_KEY and JWKS must be configured together.",
    );
    expect(run).toHaveBeenCalledTimes(3);
  });

  it.each([0, 1, 2])(
    "stops after failed read %i without writing or exposing output",
    (index) => {
      for (let read = 0; read < index; read++)
        run.mockReturnValueOnce(result(""));
      run.mockReturnValueOnce(result("sensitive stdout", 1));

      expect(() => ensurePreviewConvexAuth(env, previewName)).toThrow(
        /^Convex preview auth get failed with exit code 1\.$/,
      );
      expect(run).toHaveBeenCalledTimes(index + 1);
    },
  );

  it("reports a failed update without exposing its input or output", () => {
    reads("existing-private-key", "existing-jwks", "");
    run.mockReturnValueOnce(result("sensitive stdout", 1));

    expect(() => ensurePreviewConvexAuth(env, previewName)).toThrow(
      /^Convex preview auth set failed with exit code 1\.$/,
    );
  });
});
