import { describe, expect, it } from "vitest";

import {
  boardToString,
  createInitialGameState,
  type GameState,
} from "../lib/chessmerge";
import {
  formatSandboxPosition,
  parseSandboxBoard,
  parseSandboxPosition,
  serializeSandboxPosition,
} from "../src/components/sandboxPosition";

describe("Sandbox positions", () => {
  it("round-trips the starting position through its URL form", () => {
    const startingPosition = createInitialGameState();
    const serialized = serializeSandboxPosition(startingPosition);

    expect(serialized).toContain("_w_KQkq_-_0_1");
    expect(formatSandboxPosition(requireValidPosition(serialized))).toBe(
      formatSandboxPosition(startingPosition),
    );
  });

  it("parses a chosen turn and a merged piece", () => {
    const position = requireValidPosition("4k3/8/8/3R:N4/8/8/8/4K3 b - - 7 12");

    expect(position.options.turn).toBe("b");
    expect(position.options.castlingRights).toEqual({
      w: { short: false, long: false },
      b: { short: false, long: false },
    });
    expect(position.board[3][3]).toEqual([
      { color: "w", pieceType: "r" },
      { color: "w", pieceType: "n" },
    ]);
  });

  it("requires every rank to describe eight squares", () => {
    const result = parseSandboxPosition("4k3/8/8/8/8/8/8/4K2 w - - 0 1");

    expect(result).toEqual({
      kind: "invalid",
      message: "Rank 1 must describe exactly 8 squares.",
    });
  });

  it("requires one king for each side", () => {
    const result = parseSandboxPosition("8/8/8/8/8/8/8/4K3 w - - 0 1");

    expect(result).toEqual({
      kind: "invalid",
      message: "Place exactly one white king and one black king.",
    });
  });

  it("rejects merged pieces with different colors", () => {
    const result = parseSandboxPosition("4k3/8/8/3R:n4/8/8/8/4K3 w - - 0 1");

    expect(result).toEqual({
      kind: "invalid",
      message: "Merged pieces on rank 5 must have the same color.",
    });
  });

  it("parses the eight-rank board text without changing the game options", () => {
    const currentPosition = createInitialGameState();
    currentPosition.options.turn = "b";
    const result = parseSandboxBoard(
      [
        ". . . . k . . .",
        ". . . . . . . .",
        ". . . . . . . .",
        ". . . . . . . .",
        "RN . . . . . . .",
        ". . . . . . . .",
        ". . . . . . . .",
        ". . . . K . . .",
      ].join("\n"),
      currentPosition,
    );

    expect(result.kind).toBe("valid");
    if (result.kind === "valid") {
      expect(result.gameState.options).toBe(currentPosition.options);
      expect(result.gameState.board[4][0]).toEqual([
        { color: "w", pieceType: "r" },
        { color: "w", pieceType: "n" },
      ]);
      expect(boardToString(result.gameState.board)).toContain(
        "RN .  .  .  .  .  .  . ",
      );
    }
  });

  it("rejects malformed text and merged kings", () => {
    const currentPosition = createInitialGameState();

    expect(
      parseSandboxBoard(
        boardToString(currentPosition.board).split("\n").slice(1).join("\n"),
        currentPosition,
      ),
    ).toEqual({
      kind: "invalid",
      message: "The board text must contain exactly 8 ranks.",
    });

    const mergedKing = boardToString(currentPosition.board).replace(
      "R  N  B  Q  K ",
      "R  N  B  Q  KN",
    );
    expect(parseSandboxBoard(mergedKing, currentPosition)).toEqual({
      kind: "invalid",
      message: "Kings cannot be merged.",
    });
  });
});

function requireValidPosition(input: string): GameState {
  const result = parseSandboxPosition(input);

  if (result.kind === "invalid") {
    throw new Error(result.message);
  }

  return result.gameState;
}
