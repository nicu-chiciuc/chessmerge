import { ChildProcess, spawn } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { main, selectConvexDeploy } from "./build-cloudflare.ts";
import { ensurePreviewConvexAuth } from "./ensure-preview-convex-auth.ts";

vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  spawn: vi.fn(),
}));
vi.mock("./ensure-preview-convex-auth.ts", () => ({
  ensurePreviewConvexAuth: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(spawn).mockImplementation(() => {
    const child = new ChildProcess();
    queueMicrotask(() => child.emit("close", 0));
    return child;
  });
});

describe("Cloudflare Convex deployment", () => {
  it("reuses the branch preview instead of deleting its data", () => {
    const deployment = selectConvexDeploy({
      WORKERS_CI_BRANCH: "preview-persistence",
      CONVEX_DEPLOY_KEY: "production-key",
      PREVIEW_CONVEX_DEPLOY_KEY: "preview:team:project|test",
    });

    expect(deployment.args).toEqual([
      "exec",
      "convex",
      "deploy",
      "--preview-name",
      "preview-persistence",
      "--cmd",
      "pnpm run build:app",
    ]);
    expect(deployment.deployKey).toBe("preview:team:project|test");
  });

  it("keeps production deployment on its existing key and command", () => {
    const deployment = selectConvexDeploy({
      WORKERS_CI_BRANCH: "main",
      CONVEX_DEPLOY_KEY: "production-key",
      PREVIEW_CONVEX_DEPLOY_KEY: "preview:team:project|test",
    });

    expect(deployment.args).toEqual([
      "exec",
      "convex",
      "deploy",
      "--cmd",
      "pnpm run build:app",
    ]);
    expect(deployment.deployKey).toBe("production-key");
  });

  it("does not use the production key when the preview key is missing", () => {
    expect(() =>
      selectConvexDeploy({
        WORKERS_CI_BRANCH: "preview-persistence",
        CONVEX_DEPLOY_KEY: "production-key",
      }),
    ).toThrow("Set PREVIEW_CONVEX_DEPLOY_KEY");
  });

  it.each([
    "prod:production|test",
    "dev:development|test",
    "project:team:project|test",
    "preview:deployment|test",
    "preview:team:project",
  ])("rejects a non-preview key before deploying: %s", async (deployKey) => {
    await expect(
      main({
        WORKERS_CI_BRANCH: "preview-persistence",
        PREVIEW_CONVEX_DEPLOY_KEY: deployKey,
      }),
    ).rejects.toThrow(
      "PREVIEW_CONVEX_DEPLOY_KEY must be a Convex preview deploy key",
    );
    expect(spawn).not.toHaveBeenCalled();
    expect(ensurePreviewConvexAuth).not.toHaveBeenCalled();
  });

  it("sets up authentication after a successful deploy with only the selected key", async () => {
    await main({
      WORKERS_CI_BRANCH: "preview-persistence",
      CONVEX_DEPLOY_KEY: "production-key",
      PREVIEW_CONVEX_DEPLOY_KEY: "preview:team:project|test",
    });

    const selectedEnv = {
      WORKERS_CI_BRANCH: "preview-persistence",
      CONVEX_DEPLOY_KEY: "preview:team:project|test",
    };
    expect(spawn).toHaveBeenCalledWith("pnpm", expect.any(Array), {
      env: selectedEnv,
      shell: process.platform === "win32",
      stdio: "inherit",
    });
    expect(ensurePreviewConvexAuth).toHaveBeenCalledExactlyOnceWith(
      selectedEnv,
      "preview-persistence",
    );
  });

  it("does not change production authentication", async () => {
    await main({
      WORKERS_CI_BRANCH: "main",
      CONVEX_DEPLOY_KEY: "production-key",
    });

    expect(ensurePreviewConvexAuth).not.toHaveBeenCalled();
  });

  it("does not set up authentication after a failed deploy", async () => {
    vi.mocked(spawn).mockImplementation(() => {
      const child = new ChildProcess();
      queueMicrotask(() => child.emit("close", 1));
      return child;
    });

    await expect(
      main({
        WORKERS_CI_BRANCH: "preview-persistence",
        PREVIEW_CONVEX_DEPLOY_KEY: "preview:team:project|test",
      }),
    ).rejects.toThrow("Convex deploy failed");
    expect(ensurePreviewConvexAuth).not.toHaveBeenCalled();
  });
});
