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
  it.each([undefined, "false", "0"])(
    "keeps local builds free of deployment effects with WORKERS_CI=%s",
    async (workersCi) => {
      const env = {
        WORKERS_CI: workersCi,
        WORKERS_CI_BRANCH: "main",
        CONVEX_DEPLOY_KEY: "prod:production|test",
      };

      await main(env);

      expect(spawn).toHaveBeenCalledExactlyOnceWith("pnpm", ["run", "build:app"], {
        env,
        shell: process.platform === "win32",
        stdio: "inherit",
      });
      expect(ensurePreviewConvexAuth).not.toHaveBeenCalled();
    },
  );

  it("reuses the branch preview instead of deleting its data", () => {
    const deployment = selectConvexDeploy({
      WORKERS_CI: "1",
      WORKERS_CI_BRANCH: "preview-persistence",
      CONVEX_DEPLOY_KEY: "preview:team:project|test",
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
    expect(deployment.previewName).toBe("preview-persistence");
  });

  it("keeps production deployment on its existing command", () => {
    const deployment = selectConvexDeploy({
      WORKERS_CI: "true",
      WORKERS_CI_BRANCH: "main",
      CONVEX_DEPLOY_KEY: "prod:production|test",
    });

    expect(deployment.args).toEqual([
      "exec",
      "convex",
      "deploy",
      "--cmd",
      "pnpm run build:app",
    ]);
    expect(deployment.previewName).toBeNull();
  });

  it("requires the Workers Builds branch before running Convex", async () => {
    await expect(main({ WORKERS_CI: "1" })).rejects.toThrow("WORKERS_CI_BRANCH");
    expect(spawn).not.toHaveBeenCalled();
    expect(ensurePreviewConvexAuth).not.toHaveBeenCalled();
  });

  it.each(["main", "preview-persistence"])(
    "does not use the legacy preview key when the build key is missing on %s",
    async (branch) => {
      await expect(
        main({
          WORKERS_CI: "1",
          WORKERS_CI_BRANCH: branch,
          PREVIEW_CONVEX_DEPLOY_KEY: "preview:team:project|legacy",
        }),
      ).rejects.toThrow("Set CONVEX_DEPLOY_KEY");
      expect(spawn).not.toHaveBeenCalled();
      expect(ensurePreviewConvexAuth).not.toHaveBeenCalled();
    },
  );

  it.each([
    "prod:production|test",
    "dev:development|test",
    "project:team:project|test",
    "preview:deployment|test",
    "preview:team:project",
  ])("rejects a non-preview key before deploying: %s", async (deployKey) => {
    await expect(
      main({
        WORKERS_CI: "1",
        WORKERS_CI_BRANCH: "preview-persistence",
        CONVEX_DEPLOY_KEY: deployKey,
        PREVIEW_CONVEX_DEPLOY_KEY: "preview:team:project|legacy",
      }),
    ).rejects.toThrow("CONVEX_DEPLOY_KEY must be a Convex preview deploy key");
    expect(spawn).not.toHaveBeenCalled();
    expect(ensurePreviewConvexAuth).not.toHaveBeenCalled();
  });

  it("sets up authentication after a successful deploy with the build-specific key", async () => {
    const env = {
      WORKERS_CI: "1",
      WORKERS_CI_BRANCH: "preview-persistence",
      CONVEX_DEPLOY_KEY: "preview:team:project|test",
    };

    await main(env);

    expect(spawn).toHaveBeenCalledWith("pnpm", expect.any(Array), {
      env,
      shell: process.platform === "win32",
      stdio: "inherit",
    });
    expect(ensurePreviewConvexAuth).toHaveBeenCalledExactlyOnceWith(
      env,
      "preview-persistence",
    );
  });

  it("does not change production authentication", async () => {
    await main({
      WORKERS_CI: "1",
      WORKERS_CI_BRANCH: "main",
      CONVEX_DEPLOY_KEY: "prod:production|test",
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
        WORKERS_CI: "1",
        WORKERS_CI_BRANCH: "preview-persistence",
        CONVEX_DEPLOY_KEY: "preview:team:project|test",
      }),
    ).rejects.toThrow("Cloudflare build failed");
    expect(ensurePreviewConvexAuth).not.toHaveBeenCalled();
  });
});
