import { describe, expect, it } from "vitest";

import {
  boardToString,
  createInitialGameState,
  type GameState,
} from "../lib/chessmerge";
import {
  formatSandboxPosition,
  parseEditableSandboxPosition,
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

  it("allows positions without both kings", () => {
    const result = parseSandboxPosition("8/8/8/8/8/8/8/4K3 w - - 0 1");

    expect(result.kind).toBe("valid");
  });

  it("normalizes mixed-case merged pieces using the existing FEMN parser", () => {
    const result = parseSandboxPosition("4k3/8/8/3R:n4/8/8/8/4K3 w - - 0 1");

    expect(result.kind).toBe("valid");
    if (result.kind === "valid") {
      expect(formatSandboxPosition(result.gameState)).toBe(
        "4k3/8/8/3r:n4/8/8/8/4K3 w - - 0 1",
      );
    }
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

  it("normalizes incomplete board text instead of rejecting it", () => {
    const currentPosition = createInitialGameState();
    const result = parseSandboxBoard(
      ["q . .", ". . . . . . . ."].join("\n"),
      currentPosition,
    );

    expect(result.kind).toBe("valid");
    if (result.kind === "valid") {
      expect(result.gameState.board).toHaveLength(8);
      expect(result.gameState.board.every((row) => row.length === 8)).toBe(
        true,
      );
      expect(result.gameState.board[0][0]).toEqual([
        { color: "b", pieceType: "q" },
      ]);
      expect(
        result.gameState.board[0].slice(3).every((cell) => cell.length === 0),
      ).toBe(true);
    }
  });

  it("keeps unknown board text as an invalid editing value", () => {
    const result = parseSandboxBoard("x", createInitialGameState());

    expect(result).toEqual({
      kind: "invalid",
      message:
        "The board contains an unknown piece. Use ., p, r, n, b, q, or k.",
    });
  });

  it("parses a permissive editable FEMN position without requiring both kings", () => {
    const result = parseEditableSandboxPosition("q7/8 b QKQ - 0 1");

    expect(result.kind).toBe("valid");
    if (result.kind === "valid") {
      expect(formatSandboxPosition(result.gameState)).toBe(
        "q7/8/8/8/8/8/8/8 b KQ - 0 1",
      );
    }
  });
});

function requireValidPosition(input: string): GameState {
  const result = parseSandboxPosition(input);

  if (result.kind === "invalid") {
    throw new Error(result.message);
  }

  return result.gameState;
}
