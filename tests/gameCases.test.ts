import {
  BoardOptions,
  getAllMovesForCell,
  stringToBoard,
  parsePosition,
  applyMove,
  boardToString,
  cleanStringBoard,
  createEmptyGameState,
  GameState,
  FEMN,
  equalPositions,
} from "lib/chessmerge";
import { describe, it, expect } from "vitest";

describe("Game Cases", () => {
  const standardOptions: BoardOptions = createEmptyGameState().options;

  it("should be able to move pawn e2 to e4", () => {
    const board = stringToBoard(`
        r  n  b  q  k  b  n  r 
        p  p  p  p  p  p  p  p 
        .  .  .  .  .  .  .  . 
        .  .  .  .  .  .  .  . 
        .  .  .  .  .  .  .  . 
        .  .  .  .  .  .  .  . 
        P  P  P  P  P  P  P  P 
        R  N  B  Q  K  B  N  R 
    `);

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

  it("pinned piece cannot move", () => {
    const board = stringToBoard(`
      .  .  .  .  .  .  .  . 
      .  k  .  .  .  .  .  . 
      .  .  .  .  .  .  .  . 
      .  .  .  .  .  .  .  . 
      .  .  .  .  .  .  .  b 
      .  .  .  .  .  .  .  . 
      .  .  .  .  .  R  .  . 
      .  .  .  .  K  .  .  . 
    `);

    const gameState = {
      board,
      options: standardOptions,
    };

    const moves = getAllMovesForCell(parsePosition("f2"), gameState);

    expect(moves).toHaveLength(0);
  });

  it("pinned piece can move as long as it doesn't put the king in check", () => {
    const board = stringToBoard(`
      .  .  .  .  .  .  .  . 
      .  k  .  .  .  .  .  . 
      .  .  .  .  .  .  .  . 
      .  .  .  .  .  .  .  . 
      .  .  .  .  .  .  .  b 
      .  .  .  .  .  .  .  . 
      .  .  .  .  .  Q  .  . 
      .  .  .  .  K  .  .  . 
    `);

    const gameState: GameState = {
      board,
      options: FEMN.fromFEMNWithoutBoard("w KQkq - 0 1"),
    };

    const moves = getAllMovesForCell(parsePosition("f2"), gameState);

    expect(moves).toHaveLength(2);
  });

  it("should NOT support taking en passant", () => {
    const board = stringToBoard(`
      .  .  .  .  k  .  .  . 
      .  .  .  .  .  .  .  . 
      .  .  .  .  .  .  .  . 
      .  .  .  .  .  .  .  . 
      .  .  .  .  .  .  p  . 
      .  .  .  .  .  .  .  . 
      .  .  .  .  .  P  .  . 
      .  .  .  .  K  .  .  .  
    `);

    const gameState: GameState = {
      board,
      options: FEMN.fromFEMNWithoutBoard("w - - 0 1"),
    };

    // Move white pawn 2 squares forward to f4
    const whiteMove = getAllMovesForCell(parsePosition("f2"), gameState).find(
      (move) => equalPositions(move.to, parsePosition("f4")),
    );
    if (!whiteMove) {
      throw new Error("White pawn should be able to move to f4");
    }

    const newGameState = applyMove(gameState, whiteMove);

    // enPassantTarget is always null
    expect(newGameState.options.enPassantTarget).toBe(null);

    // Now black pawn should be able to take en passant
    const blackMove = getAllMovesForCell(
      parsePosition("e7"),
      newGameState,
    ).find((move) => equalPositions(move.to, parsePosition("f3")));

    expect(blackMove).toBe(undefined);
  });
});
