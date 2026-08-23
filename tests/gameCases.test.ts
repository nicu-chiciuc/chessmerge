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
} from "lib/chessmerge";
import { describe, it, expect } from "vitest";

describe("Game Cases", () => {
  const standardOptions: BoardOptions = createEmptyGameState().options;

  it("should NOT be able to move pawn e2 to e4", () => {
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

    expect(moves).toHaveLength(1);
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

  describe("castling", () => {
    it("requires the same-color rook on its original corner", () => {
      const gameState = createCastlingState();
      gameState.board[7][7] = [];

      expect(canCastleTo(gameState, "g1")).toBe(false);

      gameState.board[7][7] = [{ color: "b", pieceType: "r" }];
      expect(canCastleTo(gameState, "g1")).toBe(false);
    });

    it("requires the queenside b-file to be empty", () => {
      const gameState = createCastlingState();
      gameState.board[7][1] = [{ color: "w", pieceType: "n" }];

      expect(canCastleTo(gameState, "c1")).toBe(false);
    });

    it("does not castle through an empty square attacked by a pawn", () => {
      const gameState = createCastlingState();
      gameState.board[6][4] = [{ color: "b", pieceType: "p" }];

      expect(canCastleTo(gameState, "g1")).toBe(false);
    });

    it("does not castle while adjacent to the enemy king", () => {
      const gameState = createCastlingState();
      gameState.board[0][4] = [];
      gameState.board[6][4] = [{ color: "b", pieceType: "k" }];

      expect(canCastleTo(gameState, "g1")).toBe(false);
    });

    it("does not restore castling after the king returns", () => {
      const gameState = createCastlingState();
      const moved = applyMove(gameState, {
        from: parsePosition("e1"),
        to: parsePosition("e2"),
        piece: "k",
        type: "base",
      });
      const returned = applyMove(moved, {
        from: parsePosition("e2"),
        to: parsePosition("e1"),
        piece: "k",
        type: "base",
      });

      expect(returned.options.castlingRights.w).toEqual({
        short: false,
        long: false,
      });
      expect(canCastleTo(returned, "g1")).toBe(false);
    });

    it("does not restore castling after a corner rook returns", () => {
      const gameState = createCastlingState();
      const moved = applyMove(gameState, {
        from: parsePosition("h1"),
        to: parsePosition("h2"),
        piece: "r",
        type: "base",
      });
      const returned = applyMove(moved, {
        from: parsePosition("h2"),
        to: parsePosition("h1"),
        piece: "r",
        type: "base",
      });

      expect(returned.options.castlingRights.w).toEqual({
        short: false,
        long: true,
      });
      expect(canCastleTo(returned, "g1")).toBe(false);
    });

    it("removes castling rights when a corner rook is captured", () => {
      const gameState = createCastlingState();
      gameState.options.turn = "b";
      gameState.board[6][6] = [{ color: "b", pieceType: "b" }];

      const captured = applyMove(gameState, {
        from: parsePosition("g2"),
        to: parsePosition("h1"),
        piece: "b",
        type: "base",
      });

      expect(captured.options.castlingRights.w.short).toBe(false);
    });
  });
});

function createCastlingState(): GameState {
  const gameState = createEmptyGameState();
  gameState.board[0][4] = [{ color: "b", pieceType: "k" }];
  gameState.board[7][0] = [{ color: "w", pieceType: "r" }];
  gameState.board[7][4] = [{ color: "w", pieceType: "k" }];
  gameState.board[7][7] = [{ color: "w", pieceType: "r" }];
  return gameState;
}

function canCastleTo(gameState: GameState, square: "c1" | "g1"): boolean {
  const destination = parsePosition(square);
  return getAllMovesForCell(parsePosition("e1"), gameState).some(
    (move) =>
      move.type === "castle" &&
      move.to.row === destination.row &&
      move.to.col === destination.col,
  );
}
