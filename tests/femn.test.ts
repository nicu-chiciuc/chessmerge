import { FEMN as FEMN } from "lib/chessmerge";
import { describe, expect, it } from "vitest";

describe("FEMN, Forsyth–Edwards Merged Notation", () => {
  it("should convert to FEMN board", () => {
    const initial = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    const board = FEMN.fromFEMNBoard(initial);
    const back = FEMN.toFEMNBoard(board);

    expect(back).toBe(initial);
  });

  describe("options", () => {
    it("should parse the options part", () => {
      const options = FEMN.fromFEMNWithoutBoard("w KQkq - 0 1");
      expect(options).toEqual({
        turn: "w",
        castlingRights: {
          w: { short: true, long: true },
          b: { short: true, long: true },
        },
        enPassantTarget: null,
        halfMoveClock: 0,
        fullMoveClock: 1,
      });
    });

    it("should support no castling options", () => {
      const options = FEMN.fromFEMNWithoutBoard("w - - 0 1");
      expect(options).toEqual({
        turn: "w",
        castlingRights: {
          w: { short: false, long: false },
          b: { short: false, long: false },
        },
        enPassantTarget: null,
        halfMoveClock: 0,
        fullMoveClock: 1,
      });
    });
  });
});
