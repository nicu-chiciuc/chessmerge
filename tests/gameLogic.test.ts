import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import {
  createInitialBoard,
  isValidPosition,
  canMerge,
  getPieceMoves,
  isInCheck,
  getAllMovesForCell,
  canCellUnmerge,
  type Board,
  type Position,
  type Piece,
  type PieceType,
  type PieceColor,
} from "../convex/gameLogic";

describe("Game Logic Tests", () => {
  describe("createInitialBoard", () => {
    it("should create a standard 8x8 chess board", () => {
      const board = createInitialBoard();

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
      const board = createInitialBoard();

      // Check white pawns on row 6
      for (let col = 0; col < 8; col++) {
        expect(board[6][col]).toHaveLength(1);
        expect(board[6][col][0]).toEqual({
          color: "white",
          pieceType: "pawn",
        });
      }

      // Check white back row on row 7
      const expectedBackRow: PieceType[] = [
        "rook",
        "knight",
        "bishop",
        "queen",
        "king",
        "bishop",
        "knight",
        "rook",
      ];
      for (let col = 0; col < 8; col++) {
        expect(board[7][col]).toHaveLength(1);
        expect(board[7][col][0]).toEqual({
          color: "white",
          pieceType: expectedBackRow[col],
        });
      }
    });

    it("should place black pieces on rows 0 and 1", () => {
      const board = createInitialBoard();

      // Check black back row on row 0
      const expectedBackRow: PieceType[] = [
        "rook",
        "knight",
        "bishop",
        "queen",
        "king",
        "bishop",
        "knight",
        "rook",
      ];
      for (let col = 0; col < 8; col++) {
        expect(board[0][col]).toHaveLength(1);
        expect(board[0][col][0]).toEqual({
          color: "black",
          pieceType: expectedBackRow[col],
        });
      }

      // Check black pawns on row 1
      for (let col = 0; col < 8; col++) {
        expect(board[1][col]).toHaveLength(1);
        expect(board[1][col][0]).toEqual({
          color: "black",
          pieceType: "pawn",
        });
      }
    });

    it("should have empty cells in the middle rows", () => {
      const board = createInitialBoard();

      for (let row = 2; row < 6; row++) {
        for (let col = 0; col < 8; col++) {
          expect(board[row][col]).toHaveLength(0);
        }
      }
    });
  });

  describe("isValidPosition", () => {
    it("should return true for valid positions", () => {
      expect(isValidPosition({ row: 0, col: 0 })).toBe(true);
      expect(isValidPosition({ row: 7, col: 7 })).toBe(true);
      expect(isValidPosition({ row: 3, col: 4 })).toBe(true);
    });

    it("should return false for positions outside the board", () => {
      expect(isValidPosition({ row: -1, col: 0 })).toBe(false);
      expect(isValidPosition({ row: 0, col: -1 })).toBe(false);
      expect(isValidPosition({ row: 8, col: 0 })).toBe(false);
      expect(isValidPosition({ row: 0, col: 8 })).toBe(false);
      expect(isValidPosition({ row: -5, col: -5 })).toBe(false);
      expect(isValidPosition({ row: 10, col: 10 })).toBe(false);
    });
  });

  describe("canMerge", () => {
    it("should allow merging of non-king pieces", () => {
      expect(canMerge("pawn", "rook")).toBe(true);
      expect(canMerge("queen", "bishop")).toBe(true);
      expect(canMerge("knight", "pawn")).toBe(true);
      expect(canMerge("rook", "queen")).toBe(true);
      expect(canMerge("bishop", "knight")).toBe(true);
    });

    it("should not allow merging with kings", () => {
      expect(canMerge("king", "pawn")).toBe(false);
      expect(canMerge("pawn", "king")).toBe(false);
      expect(canMerge("king", "queen")).toBe(false);
      expect(canMerge("queen", "king")).toBe(false);
      expect(canMerge("king", "king")).toBe(false);
    });
  });

  describe("getPieceMoves", () => {
    let board: Board;

    beforeEach(() => {
      board = createInitialBoard();
    });

    describe("Pawn moves", () => {
      it("should allow white pawn to move forward one square", () => {
        const piece: Piece = { color: "white", pieceType: "pawn" };
        const moves = getPieceMoves(piece, 0, { row: 6, col: 4 }, board);

        const forwardMoves = moves.filter(
          (move) =>
            move.to.row === 5 &&
            move.to.col === 4 &&
            move.moveType === "normal",
        );
        expect(forwardMoves).toHaveLength(1);
      });

      it("should allow white pawn to move forward two squares from starting position", () => {
        const piece: Piece = { color: "white", pieceType: "pawn" };
        const moves = getPieceMoves(piece, 0, { row: 6, col: 4 }, board);

        const doubleMoves = moves.filter(
          (move) =>
            move.to.row === 4 &&
            move.to.col === 4 &&
            move.moveType === "normal",
        );
        expect(doubleMoves).toHaveLength(1);
      });

      it("should allow black pawn to move forward one square", () => {
        const piece: Piece = { color: "black", pieceType: "pawn" };
        const moves = getPieceMoves(piece, 0, { row: 1, col: 4 }, board);

        const forwardMoves = moves.filter(
          (move) =>
            move.to.row === 2 &&
            move.to.col === 4 &&
            move.moveType === "normal",
        );
        expect(forwardMoves).toHaveLength(1);
      });

      it("should not allow pawn to move forward if path is blocked", () => {
        // Create custom board with a piece blocking the pawn
        const customBoard = createInitialBoard();
        customBoard[5][4] = [{ color: "black", pieceType: "pawn" }];

        const piece: Piece = { color: "white", pieceType: "pawn" };
        const moves = getPieceMoves(piece, 0, { row: 6, col: 4 }, customBoard);

        // Should have no forward moves
        const forwardMoves = moves.filter(
          (move) => move.to.col === 4 && move.moveType === "normal",
        );
        expect(forwardMoves).toHaveLength(0);
      });
    });

    describe("Rook moves", () => {
      it("should allow rook to move horizontally and vertically", () => {
        // Create empty board and place a rook in the center
        const emptyBoard: Board = Array(8)
          .fill(null)
          .map(() =>
            Array(8)
              .fill(null)
              .map(() => []),
          );
        emptyBoard[4][4] = [{ color: "white", pieceType: "rook" }];

        const piece: Piece = { color: "white", pieceType: "rook" };
        const moves = getPieceMoves(piece, 0, { row: 4, col: 4 }, emptyBoard);

        // Should have 14 moves (7 horizontal + 7 vertical)
        const normalMoves = moves.filter((move) => move.moveType === "normal");
        expect(normalMoves.length).toBeGreaterThanOrEqual(14);
      });

      it("should be blocked by pieces in its path", () => {
        const emptyBoard: Board = Array(8)
          .fill(null)
          .map(() =>
            Array(8)
              .fill(null)
              .map(() => []),
          );
        emptyBoard[4][4] = [{ color: "white", pieceType: "rook" }];
        emptyBoard[4][6] = [{ color: "black", pieceType: "pawn" }]; // Block path

        const piece: Piece = { color: "white", pieceType: "rook" };
        const moves = getPieceMoves(piece, 0, { row: 4, col: 4 }, emptyBoard);

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
        const emptyBoard: Board = Array(8)
          .fill(null)
          .map(() =>
            Array(8)
              .fill(null)
              .map(() => []),
          );
        emptyBoard[4][4] = [{ color: "white", pieceType: "knight" }];

        const piece: Piece = { color: "white", pieceType: "knight" };
        const moves = getPieceMoves(piece, 0, { row: 4, col: 4 }, emptyBoard);

        const normalMoves = moves.filter((move) => move.moveType === "normal");
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
        const emptyBoard: Board = Array(8)
          .fill(null)
          .map(() =>
            Array(8)
              .fill(null)
              .map(() => []),
          );
        emptyBoard[4][4] = [{ color: "white", pieceType: "king" }];

        const piece: Piece = { color: "white", pieceType: "king" };
        const moves = getPieceMoves(piece, 0, { row: 4, col: 4 }, emptyBoard);

        const normalMoves = moves.filter((move) => move.moveType === "normal");
        expect(normalMoves).toHaveLength(8); // King should have 8 possible moves from center
      });

      it("should not be able to merge with other pieces", () => {
        const emptyBoard: Board = Array(8)
          .fill(null)
          .map(() =>
            Array(8)
              .fill(null)
              .map(() => []),
          );
        emptyBoard[4][4] = [{ color: "white", pieceType: "king" }];
        emptyBoard[4][5] = [{ color: "white", pieceType: "pawn" }]; // Friendly piece

        const piece: Piece = { color: "white", pieceType: "king" };
        const moves = getPieceMoves(piece, 0, { row: 4, col: 4 }, emptyBoard);

        // Should not have any merge moves
        const mergeMoves = moves.filter((move) => move.moveType === "merge");
        expect(mergeMoves).toHaveLength(0);
      });
    });
  });

  describe("isInCheck", () => {
    it("should return false for initial board position", () => {
      const board = createInitialBoard();
      expect(isInCheck(board, "white")).toBe(false);
      expect(isInCheck(board, "black")).toBe(false);
    });

    it("should detect check when king is under attack", () => {
      const emptyBoard: Board = Array(8)
        .fill(null)
        .map(() =>
          Array(8)
            .fill(null)
            .map(() => []),
        );

      // Place white king and black rook that attacks it
      emptyBoard[4][4] = [{ color: "white", pieceType: "king" }];
      emptyBoard[4][7] = [{ color: "black", pieceType: "rook" }];

      expect(isInCheck(emptyBoard, "white")).toBe(true);
      expect(isInCheck(emptyBoard, "black")).toBe(false);
    });

    it("should return false when king is not under attack", () => {
      const emptyBoard: Board = Array(8)
        .fill(null)
        .map(() =>
          Array(8)
            .fill(null)
            .map(() => []),
        );

      // Place white king and black rook that doesn't attack it
      emptyBoard[4][4] = [{ color: "white", pieceType: "king" }];
      emptyBoard[6][7] = [{ color: "black", pieceType: "rook" }];

      expect(isInCheck(emptyBoard, "white")).toBe(false);
      expect(isInCheck(emptyBoard, "black")).toBe(false);
    });
  });

  describe("getAllMovesForCell", () => {
    it("should return empty array for empty cell", () => {
      const board = createInitialBoard();
      const moves = getAllMovesForCell({ row: 3, col: 3 }, board);
      expect(moves).toHaveLength(0);
    });

    it("should return moves for cell with one piece", () => {
      const board = createInitialBoard();
      const moves = getAllMovesForCell({ row: 6, col: 4 }, board); // White pawn
      expect(moves.length).toBeGreaterThan(0);
    });

    it("should include unmerge moves for cell with two pieces", () => {
      const emptyBoard: Board = Array(8)
        .fill(null)
        .map(() =>
          Array(8)
            .fill(null)
            .map(() => []),
        );

      // Place two pieces in the same cell
      emptyBoard[4][4] = [
        { color: "white", pieceType: "pawn" },
        { color: "white", pieceType: "rook" },
      ];

      const moves = getAllMovesForCell({ row: 4, col: 4 }, emptyBoard);
      const unmergeMoves = moves.filter((move) => move.moveType === "unmerge");
      expect(unmergeMoves.length).toBeGreaterThan(0);
    });
  });

  describe("canCellUnmerge", () => {
    it("should return false for empty cell", () => {
      const board = createInitialBoard();
      expect(canCellUnmerge({ row: 3, col: 3 }, board)).toBe(false);
    });

    it("should return false for cell with one piece", () => {
      const board = createInitialBoard();
      expect(canCellUnmerge({ row: 6, col: 4 }, board)).toBe(false);
    });

    it("should return true for cell with two pieces that can unmerge", () => {
      const emptyBoard: Board = Array(8)
        .fill(null)
        .map(() =>
          Array(8)
            .fill(null)
            .map(() => []),
        );

      // Place two pieces in the same cell with empty adjacent squares
      emptyBoard[4][4] = [
        { color: "white", pieceType: "pawn" },
        { color: "white", pieceType: "rook" },
      ];

      expect(canCellUnmerge({ row: 4, col: 4 }, emptyBoard)).toBe(true);
    });

    it("should return false for cell with two pieces but no empty adjacent squares", () => {
      const fullBoard: Board = Array(8)
        .fill(null)
        .map(() =>
          Array(8)
            .fill(null)
            .map(() => [{ color: "black", pieceType: "pawn" }]),
        );

      // Place two pieces in the same cell
      fullBoard[4][4] = [
        { color: "white", pieceType: "pawn" },
        { color: "white", pieceType: "rook" },
      ];

      expect(canCellUnmerge({ row: 4, col: 4 }, fullBoard)).toBe(false);
    });
  });
});
