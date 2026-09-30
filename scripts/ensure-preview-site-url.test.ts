import { spawnSync } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensurePreviewSiteUrl } from "./ensure-preview-site-url.ts";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn() }));
const run = vi.mocked(spawnSync);
const env = { WORKERS_CI: "1", WORKERS_CI_BRANCH: "preview-persistence" };

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

beforeEach(() => {
  run.mockReset();
});

describe("preview site URL", () => {
  it("preserves a configured URL", () => {
    run.mockReturnValue(result("https://custom.example"));
    ensurePreviewSiteUrl(env);
    expect(run).toHaveBeenCalledExactlyOnceWith(
      process.execPath,
      [
        expect.stringMatching(/convex[\\/]bin[\\/]main\.js$/),
        "env",
        "get",
        "SITE_URL",
        "--preview-name",
        env.WORKERS_CI_BRANCH,
      ],
      { env, stdio: "pipe" },
    );
  });

  it("sets only the absent URL after the deploy", () => {
    run.mockReturnValue(result(""));
    ensurePreviewSiteUrl(env);
    expect(run).toHaveBeenCalledTimes(2);
    expect(run.mock.calls[1]?.[1]).toEqual([
      expect.stringMatching(/convex[\\/]bin[\\/]main\.js$/),
      "env",
      "set",
      "--preview-name",
      env.WORKERS_CI_BRANCH,
      "--",
      "SITE_URL",
      "https://chessmerge.com",
    ]);
  });

  it.each([{}, { WORKERS_CI: "1", WORKERS_CI_BRANCH: "main" }])(
    "skips local and production builds",
    (buildEnv) => {
      ensurePreviewSiteUrl(buildEnv);
      expect(run).not.toHaveBeenCalled();
    },
  );

  it("fails without a Workers branch", () => {
    expect(() => ensurePreviewSiteUrl({ WORKERS_CI: "1" })).toThrow("WORKERS_CI_BRANCH");
    expect(run).not.toHaveBeenCalled();
  });

  it("stops after a failed read without writing or exposing output", () => {
    run.mockReturnValue(result("sensitive stdout", 1));
    expect(() => ensurePreviewSiteUrl(env)).toThrow(
      "Convex preview SITE_URL get failed with exit code 1.",
    );
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("reports a failed update without exposing output", () => {
    run.mockReturnValueOnce(result(""));
    run.mockReturnValueOnce(result("sensitive stdout", 1));
    expect(() => ensurePreviewSiteUrl(env)).toThrow(
      "Convex preview SITE_URL set failed with exit code 1.",
    );
  });
});
