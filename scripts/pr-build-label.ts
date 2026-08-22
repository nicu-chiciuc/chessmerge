#!/usr/bin/env node
/**
 * Refresh the current pull request title from the latest `origin/main` count.
 * Pass `--print-only` to show the projected title without editing the pull request.
 */
import { execFileSync } from "node:child_process";

type CurrentPullRequest = {
  number: number;
  title: string;
};

function run(command: string, args: string[]): string {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function computeProjectedLabel(): string {
  run("git", ["fetch", "origin", "main", "--quiet"]);

  const mainCount = Number(run("git", ["rev-list", "--count", "origin/main"]));
  if (!Number.isSafeInteger(mainCount) || mainCount < 1) {
    throw new Error("Could not compute the origin/main commit count.");
  }

  return `v${mainCount + 1}`;
}

function readCurrentBranch(): string {
  const branch = run("git", ["branch", "--show-current"]);
  if (!branch) {
    throw new Error("A current branch is required to find its pull request.");
  }

  return branch;
}

function readCurrentPullRequest(branch: string): CurrentPullRequest | null {
  const raw = run("gh", [
    "pr",
    "list",
    "--head",
    branch,
    "--state",
    "open",
    "--limit",
    "2",
    "--json",
    "number,title",
  ]);
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Unexpected gh pr list payload: ${raw}`);
  }
  if (parsed.length === 0) {
    return null;
  }
  if (parsed.length > 1) {
    throw new Error(`Found multiple open pull requests for branch ${branch}.`);
  }

  const pullRequest: unknown = parsed[0];
  if (
    typeof pullRequest !== "object" ||
    pullRequest === null ||
    !("number" in pullRequest) ||
    !("title" in pullRequest) ||
    typeof pullRequest.number !== "number" ||
    !Number.isSafeInteger(pullRequest.number) ||
    pullRequest.number < 1 ||
    typeof pullRequest.title !== "string"
  ) {
    throw new Error(`Unexpected gh pr list payload: ${raw}`);
  }

  return { number: pullRequest.number, title: pullRequest.title };
}

const printOnly = process.argv.includes("--print-only");
const branch = readCurrentBranch();
const label = computeProjectedLabel();
const pullRequest = readCurrentPullRequest(branch);

if (pullRequest === null) {
  console.log(
    `projected label: ${label} (no pull request found for the current branch)`,
  );
  process.exit(0);
}

const bareTitle = pullRequest.title.replace(/^v\d+:\s*/, "");
const nextTitle = `${label}: ${bareTitle}`;

if (pullRequest.title === nextTitle) {
  console.log(`PR #${pullRequest.number} title already current: ${nextTitle}`);
  process.exit(0);
}

if (printOnly) {
  console.log(`projected label: ${label}`);
  console.log(`PR #${pullRequest.number} title would become: ${nextTitle}`);
  process.exit(0);
}

run("gh", ["pr", "edit", String(pullRequest.number), "--title", nextTitle]);
console.log(`PR #${pullRequest.number} title updated: ${nextTitle}`);
