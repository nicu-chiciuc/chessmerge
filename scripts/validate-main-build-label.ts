#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import process from "node:process";

function readGitOutput(args: string[]): string | null {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const shallowState = readGitOutput(["rev-parse", "--is-shallow-repository"]);
if (shallowState === null) {
  fail("Unable to determine whether the Git repository has full history.");
}
if (shallowState !== "false") {
  fail("Full Git history is required to validate the main build label.");
}

const rawCommitCount = readGitOutput(["rev-list", "--count", "HEAD"]);
const commitCount = rawCommitCount === null ? NaN : Number(rawCommitCount);
if (!Number.isSafeInteger(commitCount) || commitCount < 1) {
  fail("Unable to resolve the main build number from Git history.");
}

const subject = readGitOutput(["show", "-s", "--format=%s", "HEAD"]);
if (!subject) {
  fail("Unable to read the HEAD commit subject.");
}

const expectedPrefix = `v${commitCount}:`;
if (!subject.startsWith(expectedPrefix)) {
  fail(
    `Expected the HEAD commit subject to start with ${expectedPrefix} but got: ${subject}`,
  );
}
