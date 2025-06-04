import { FEMN as FEMN } from "lib/chessmerge";
import { describe, expect, it } from "vitest";

describe("FEMN, Forsyth–Edwards Merged Notation", () => {
  it("should convert to FEMN board", () => {
    const initial = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    const board = FEMN.fromFEMNBoard(initial);
    const back = FEMN.toFEMNBoard(board);

    expect(back).toBe(initial);
  });
});
