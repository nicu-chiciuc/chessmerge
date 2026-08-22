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

function readCurrentPullRequest(): CurrentPullRequest | null {
  let raw: string;
  try {
    raw = run("gh", ["pr", "view", "--json", "number,title"]);
  } catch {
    return null;
  }

  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("number" in parsed) ||
    !("title" in parsed) ||
    typeof parsed.number !== "number" ||
    typeof parsed.title !== "string"
  ) {
    throw new Error(`Unexpected gh pr view payload: ${raw}`);
  }

  return { number: parsed.number, title: parsed.title };
}

const printOnly = process.argv.includes("--print-only");
const label = computeProjectedLabel();
const pullRequest = readCurrentPullRequest();

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
