import { describe, it, expect, beforeEach } from "vitest";
import {
  createInitialBoard,
  isInsideBoard,
  canMerge,
  getPieceMoves,
  isInCheck,
  getAllMovesForCell,
  parsePosition,
  formatPosition,
  type Piece,
  type PieceType,
  boardToString,
  GameState,
  createEmptyBoard,
} from "../lib/chessmerge";

describe("Game Logic Tests", () => {
  describe("parsePosition", () => {
    it("all possible positions should be valid", () => {
      expect(parsePosition("a1")).toEqual({ row: 7, col: 0 });
      expect(parsePosition("a2")).toEqual({ row: 6, col: 0 });
      expect(parsePosition("a3")).toEqual({ row: 5, col: 0 });
      expect(parsePosition("a4")).toEqual({ row: 4, col: 0 });
      expect(parsePosition("a5")).toEqual({ row: 3, col: 0 });
      expect(parsePosition("a6")).toEqual({ row: 2, col: 0 });
      expect(parsePosition("a7")).toEqual({ row: 1, col: 0 });
      expect(parsePosition("a8")).toEqual({ row: 0, col: 0 });

      expect(parsePosition("b1")).toEqual({ row: 7, col: 1 });
      expect(parsePosition("b2")).toEqual({ row: 6, col: 1 });
      expect(parsePosition("b3")).toEqual({ row: 5, col: 1 });
      expect(parsePosition("b4")).toEqual({ row: 4, col: 1 });
      expect(parsePosition("b5")).toEqual({ row: 3, col: 1 });
      expect(parsePosition("b6")).toEqual({ row: 2, col: 1 });
      expect(parsePosition("b7")).toEqual({ row: 1, col: 1 });
      expect(parsePosition("b8")).toEqual({ row: 0, col: 1 });

      expect(parsePosition("c1")).toEqual({ row: 7, col: 2 });
      expect(parsePosition("c2")).toEqual({ row: 6, col: 2 });
      expect(parsePosition("c3")).toEqual({ row: 5, col: 2 });
      expect(parsePosition("c4")).toEqual({ row: 4, col: 2 });
      expect(parsePosition("c5")).toEqual({ row: 3, col: 2 });
      expect(parsePosition("c6")).toEqual({ row: 2, col: 2 });
      expect(parsePosition("c7")).toEqual({ row: 1, col: 2 });
      expect(parsePosition("c8")).toEqual({ row: 0, col: 2 });

      expect(parsePosition("d1")).toEqual({ row: 7, col: 3 });
      expect(parsePosition("d2")).toEqual({ row: 6, col: 3 });
      expect(parsePosition("d3")).toEqual({ row: 5, col: 3 });
      expect(parsePosition("d4")).toEqual({ row: 4, col: 3 });
      expect(parsePosition("d5")).toEqual({ row: 3, col: 3 });
      expect(parsePosition("d6")).toEqual({ row: 2, col: 3 });
      expect(parsePosition("d7")).toEqual({ row: 1, col: 3 });
      expect(parsePosition("d8")).toEqual({ row: 0, col: 3 });
    });
  });

  describe("parse+formatPosition", () => {
    it("should roundtrip positions correctly", () => {
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          expect(parsePosition(formatPosition({ row, col }))).toEqual({
            row,
            col,
          });
        }
      }
    });
  });

  describe("createInitialBoard", () => {
    it("should create a standard 8x8 chess board", () => {
      const { board } = createInitialBoard();

      expect(board).toHaveLength(8);
      expect(board[0]).toHaveLength(8);

      // Check that all cells are arrays
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          expect(Array.isArray(board[row][col])).toBe(true);
        }
      }
    });

    it("should place white pieces on rows 6 and 7", () => {
      const { board } = createInitialBoard();

      // Check white pawns on row 6
      for (let col = 0; col < 8; col++) {
        expect(board[6][col]).toHaveLength(1);
        expect(board[6][col][0]).toEqual({
          color: "w",
          pieceType: "p",
        });
      }

      // Check white back row on row 7
      const expectedBackRow: PieceType[] = [
        "r",
        "n",
        "b",
        "q",
        "k",
        "b",
        "n",
        "r",
      ];
      for (let col = 0; col < 8; col++) {
        expect(board[7][col]).toHaveLength(1);
        expect(board[7][col][0]).toEqual({
          color: "w",
          pieceType: expectedBackRow[col],
        });
      }
    });

    it("should place black pieces on rows 0 and 1", () => {
      const { board } = createInitialBoard();

      // Check black back row on row 0
      const expectedBackRow: PieceType[] = [
        "r",
        "n",
        "b",
        "q",
        "k",
        "b",
        "n",
        "r",
      ];
      for (let col = 0; col < 8; col++) {
        expect(board[0][col]).toHaveLength(1);
        expect(board[0][col][0]).toEqual({
          color: "b",
          pieceType: expectedBackRow[col],
        });
      }

      // Check black pawns on row 1
      for (let col = 0; col < 8; col++) {
        expect(board[1][col]).toHaveLength(1);
        expect(board[1][col][0]).toEqual({
          color: "b",
          pieceType: "p",
        });
      }
    });

    it("should have empty cells in the middle rows", () => {
      const { board } = createInitialBoard();

      for (let row = 2; row < 6; row++) {
        for (let col = 0; col < 8; col++) {
          expect(board[row][col]).toHaveLength(0);
        }
      }
    });
  });

  describe("isValidPosition", () => {
    it("should return true for valid positions", () => {
      expect(isInsideBoard({ row: 0, col: 0 })).toBe(true);
      expect(isInsideBoard({ row: 7, col: 7 })).toBe(true);
      expect(isInsideBoard({ row: 3, col: 4 })).toBe(true);
    });

    it("should return false for positions outside the board", () => {
      expect(isInsideBoard({ row: -1, col: 0 })).toBe(false);
      expect(isInsideBoard({ row: 0, col: -1 })).toBe(false);
      expect(isInsideBoard({ row: 8, col: 0 })).toBe(false);
      expect(isInsideBoard({ row: 0, col: 8 })).toBe(false);
      expect(isInsideBoard({ row: -5, col: -5 })).toBe(false);
      expect(isInsideBoard({ row: 10, col: 10 })).toBe(false);
    });
  });

  describe("canMerge", () => {
    it("should allow merging of non-king pieces", () => {
      expect(canMerge("p", "r")).toBe(true);
      expect(canMerge("q", "b")).toBe(true);
      expect(canMerge("n", "p")).toBe(true);
      expect(canMerge("r", "q")).toBe(true);
      expect(canMerge("b", "n")).toBe(true);
    });

    it("should not allow merging with kings", () => {
      expect(canMerge("k", "p")).toBe(false);
      expect(canMerge("p", "k")).toBe(false);
      expect(canMerge("k", "q")).toBe(false);
      expect(canMerge("q", "k")).toBe(false);
      expect(canMerge("k", "k")).toBe(false);
    });
  });

  describe("getPieceMoves", () => {
    let gameState: GameState;

    beforeEach(() => {
      gameState = createInitialBoard();
    });

    describe("Pawn moves", () => {
      it("should allow white pawn to move forward one square", () => {
        const piece: Piece = { color: "w", pieceType: "p" };
        const moves = getPieceMoves(piece, { row: 6, col: 4 }, gameState);

        const forwardMoves = moves.filter(
          (move) => move.to.row === 5 && move.to.col === 4,
        );
        expect(forwardMoves).toHaveLength(1);
      });

      it("should allow white pawn to move forward two squares from starting position", () => {
        const piece: Piece = { color: "w", pieceType: "p" };
        const moves = getPieceMoves(piece, { row: 6, col: 4 }, gameState);

        const doubleMoves = moves.filter(
          (move) => move.to.row === 4 && move.to.col === 4,
        );
        expect(doubleMoves).toHaveLength(1);
      });

      it("should allow black pawn to move forward one square", () => {
        const piece: Piece = { color: "b", pieceType: "p" };
        const moves = getPieceMoves(piece, { row: 1, col: 4 }, gameState);

        const forwardMoves = moves.filter(
          (move) => move.to.row === 2 && move.to.col === 4,
        );
        expect(forwardMoves).toHaveLength(1);
      });

      it("should not allow pawn to move forward if path is blocked", () => {
        // Create custom board with a piece blocking the pawn
        const customBoard = createInitialBoard();
        customBoard.board[5][4] = [{ color: "b", pieceType: "p" }];

        const piece: Piece = { color: "w", pieceType: "p" };
        const moves = getPieceMoves(piece, { row: 6, col: 4 }, customBoard);

        // Should have no forward moves
        const forwardMoves = moves.filter((move) => move.to.col === 4);
        expect(forwardMoves).toHaveLength(0);
      });
    });

    describe("Rook moves", () => {
      it("should allow rook to move horizontally and vertically", () => {
        const emptyState = createEmptyBoard();
        emptyState.board[4][4] = [{ color: "w", pieceType: "r" }];

        const piece: Piece = { color: "w", pieceType: "r" };
        const moves = getPieceMoves(piece, { row: 4, col: 4 }, emptyState);

        // Should have 14 moves (7 horizontal + 7 vertical)
        const normalMoves = moves;
        expect(normalMoves.length).toBeGreaterThanOrEqual(14);
      });

      it("should be blocked by pieces in its path", () => {
        const emptyState = createEmptyBoard();
        emptyState.board[4][4] = [{ color: "w", pieceType: "r" }];
        emptyState.board[4][6] = [{ color: "b", pieceType: "p" }]; // Block path

        const piece: Piece = { color: "w", pieceType: "r" };
        const moves = getPieceMoves(piece, { row: 4, col: 4 }, emptyState);

        // Should not be able to move to column 7 (blocked by piece at column 6)
        const blockedMoves = moves.filter(
          (move) => move.to.row === 4 && move.to.col === 7,
        );
        expect(blockedMoves).toHaveLength(0);

        // Should be able to capture the blocking piece
        const captureMoves = moves.filter(
          (move) =>
            move.to.row === 4 && move.to.col === 6 && move.capturedPieces,
        );
        expect(captureMoves).toHaveLength(1);
      });
    });

    describe("Knight moves", () => {
      it("should move in L-shapes", () => {
        const emptyState = createEmptyBoard();
        emptyState.board[4][4] = [{ color: "w", pieceType: "n" }];

        const piece: Piece = { color: "w", pieceType: "n" };
        const moves = getPieceMoves(piece, { row: 4, col: 4 }, emptyState);

        const normalMoves = moves;
        expect(normalMoves).toHaveLength(8); // Knight should have 8 possible moves from center

        // Check some specific L-shape moves
        const expectedMoves = [
          { row: 2, col: 3 },
          { row: 2, col: 5 },
          { row: 3, col: 2 },
          { row: 3, col: 6 },
          { row: 5, col: 2 },
          { row: 5, col: 6 },
          { row: 6, col: 3 },
          { row: 6, col: 5 },
        ];

        expectedMoves.forEach((expectedMove) => {
          const foundMove = normalMoves.find(
            (move) =>
              move.to.row === expectedMove.row &&
              move.to.col === expectedMove.col,
          );
          expect(foundMove).toBeDefined();
        });
      });
    });

    describe("King moves", () => {
      it("should move one square in any direction", () => {
        const emptyState = createEmptyBoard();
        emptyState.board[4][4] = [{ color: "w", pieceType: "k" }];

        const piece: Piece = { color: "w", pieceType: "k" };
        const moves = getPieceMoves(piece, { row: 4, col: 4 }, emptyState);

        const normalMoves = moves;
        expect(normalMoves).toHaveLength(8); // King should have 8 possible moves from center
      });

      it.skip("should not be able to merge with other pieces", () => {
        const emptyState = createEmptyBoard();
        emptyState.board[4][4] = [{ color: "w", pieceType: "k" }];
        emptyState.board[4][5] = [{ color: "w", pieceType: "p" }]; // Friendly piece

        const piece: Piece = { color: "w", pieceType: "k" };
        const moves = getPieceMoves(piece, { row: 4, col: 4 }, emptyState);

        // Should not have any merge moves
        const mergeMoves = moves;
        expect(mergeMoves).toHaveLength(0);
      });
    });
  });

  describe("isInCheck", () => {
    it("should return false for initial board position", () => {
      const gameState = createInitialBoard();
      expect(isInCheck(gameState, "w")).toBe(false);
      expect(isInCheck(gameState, "b")).toBe(false);
    });

    it("should detect check when king is under attack", () => {
      const gameState = createInitialBoard();
      gameState.board = Array(8)
        .fill(null)
        .map(() =>
          Array(8)
            .fill(null)
            .map(() => []),
        );

      // Place white king and black rook that attacks it
      gameState.board[4][4] = [{ color: "w", pieceType: "k" }];
      gameState.board[4][7] = [{ color: "b", pieceType: "r" }];

      expect(isInCheck(gameState, "w")).toBe(true);
      expect(() => isInCheck(gameState, "b")).toThrow();
    });

    it("should return false when king is not under attack", () => {
      const gameState = createInitialBoard();
      gameState.board = Array(8)
        .fill(null)
        .map(() =>
          Array(8)
            .fill(null)
            .map(() => []),
        );

      // Place white king and black rook that doesn't attack it
      gameState.board[4][4] = [{ color: "w", pieceType: "k" }];
      gameState.board[6][7] = [{ color: "b", pieceType: "r" }];

      expect(isInCheck(gameState, "w")).toBe(false);
      expect(() => isInCheck(gameState, "b")).toThrow();
    });
  });

  describe("boardToString", () => {
    it("should convert board to string", () => {
      const { board } = createInitialBoard();
      const string = boardToString(board);

      expect(string).toBe(
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
    });
  });

  describe("getAllMovesForCell", () => {
    it("should return empty array for empty cell", () => {
      const gameState = createInitialBoard();
      const moves = getAllMovesForCell({ row: 3, col: 3 }, gameState);
      expect(moves).toHaveLength(0);
    });

    it("should return moves for cell with one piece", () => {
      const gameState = createInitialBoard();
      const moves = getAllMovesForCell({ row: 6, col: 4 }, gameState); // White pawn
      expect(moves.length).toBeGreaterThan(0);
    });
  });
});
