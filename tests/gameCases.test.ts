import {
  BoardOptions,
  getAllMovesForCell,
  stringToBoard,
  formatPosition,
  parsePosition,
  applyMove,
  boardToString,
  cleanStringBoard,
} from "lib/chessmerge";
import { describe, it, expect } from "vitest";

describe("Game Cases", () => {
  const standardOptions: BoardOptions = {
    castlingRights: {
      w: {
        short: false,
        long: false,
      },
      b: {
        short: false,
        long: false,
      },
    },
    halfMoveClock: 0,
    enPassantTarget: undefined,
  };

  it("should be able to move pawn e2 to e4", () => {
    const board = stringToBoard(
      [
        "r  n  b  q  k  b  n  r ",
        "p  p  p  p  p  p  p  p ",
        ".  .  .  .  .  .  .  . ",
        ".  .  .  .  .  .  .  . ",
        ".  .  .  .  .  .  .  . ",
        ".  .  .  .  .  .  .  . ",
        "P  P  P  P  P  P  P  P ",
        "R  N  B  Q  K  B  N  R ",
      ].join("\n"),
    );

    const moves = getAllMovesForCell(parsePosition("e2"), {
      board,
      options: standardOptions,
    });

    expect(moves).toHaveLength(2);
  });

  it("black pawn can promote to queen", () => {
    const board = stringToBoard(`
      .  .  .  .  .  .  .  .
      .  .  k  .  .  .  .  .
      .  .  .  .  .  .  .  .
      .  .  .  .  .  .  .  .
      .  .  .  .  .  .  K  .
      .  .  .  .  .  .  .  .
      p  .  .  .  .  .  .  .
      .  .  .  .  .  .  .  .
    `);

    const gameState = {
      board,
      options: standardOptions,
    };

    const moves = getAllMovesForCell(parsePosition("a2"), gameState);

    expect(moves).toHaveLength(1);
    expect(moves[0].isPromotion).toBe(true);
    expect(moves[0].promotion).toBe("q");

    const newGameState = applyMove(gameState, moves[0]);
    const newBoardString = boardToString(newGameState.board);

    expect(newBoardString).toBe(
      cleanStringBoard(`
        .  .  .  .  .  .  .  . 
        .  .  k  .  .  .  .  . 
        .  .  .  .  .  .  .  . 
        .  .  .  .  .  .  .  . 
        .  .  .  .  .  .  K  . 
        .  .  .  .  .  .  .  . 
        .  .  .  .  .  .  .  . 
        q  .  .  .  .  .  .  . 
    `),
    );

    expect(newGameState.board[7][0]).toEqual([
      {
        color: "b",
        pieceType: "q",
      },
    ]);
  });
});
