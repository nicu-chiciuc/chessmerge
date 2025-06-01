import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Piece types and colors
export type PieceType = "p" | "r" | "n" | "b" | "q" | "k";
export type PieceColor = "w" | "b";

type MergeablePieceType = "p" | "r" | "n" | "b" | "q";
export type MergedPieceTypes =
  | "pp"
  | "pr"
  | "pn"
  | "pb"
  | "pq"
  | "rr"
  | "rn"
  | "rb"
  | "rq"
  | "nn"
  | "nb"
  | "nq"
  | "bb"
  | "bq"
  | "qq";

// Simplified piece representation
export type Piece = {
  color: PieceColor;
  pieceType: PieceType;
};

type Col = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
type Row = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

type Pos = `${Col}${Row}`;

export interface Position {
  row: number;
  col: number;
}

export function parsePosition(pos: Pos): Position {
  const col = pos[0] as Col;
  const row = pos[1] as Row;

  return { row: 8 - parseInt(row), col: col.charCodeAt(0) - "a".charCodeAt(0) };
}

export function formatPosition(pos: Position): Pos {
  const from = `${String.fromCharCode(97 + pos.col)}${8 - pos.row}`;
  return from as Pos;
}

export interface Move {
  from: Position;
  to: Position;

  piece: PieceType | MergedPieceTypes;

  // pieceIndex: number; // Which piece in the source cell is moving (0 or 1)
  capturedPieces?: Piece[]; // Pieces captured at destination
  isCheck?: boolean;
  isCheckmate?: boolean;
  isStalemate?: boolean;
}

// Board where each cell can contain 0-2 pieces of the same color
export type Board = Piece[][][];

// Initialize standard chess board
export function createInitialBoard(): Board {
  const board: Board = Array(8)
    .fill(null)
    .map(() =>
      Array(8)
        .fill(null)
        .map(() => []),
    );

  // White pieces
  const whiteBackRow: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let col = 0; col < 8; col++) {
    board[7][col] = [{ color: "w", pieceType: whiteBackRow[col] }];
    board[6][col] = [{ color: "w", pieceType: "p" }];
  }

  // Black pieces
  const blackBackRow: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let col = 0; col < 8; col++) {
    board[0][col] = [{ color: "b", pieceType: blackBackRow[col] }];
    board[1][col] = [{ color: "b", pieceType: "p" }];
  }

  return board;
}

// Check if position is valid
export function isValidPosition(pos: Position): boolean {
  return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
}

// Get piece moves for a specific piece at a position
export function getPieceMoves(
  piece: Piece,
  pos: Position,
  board: Board,
): Move[] {
  return getSinglePieceMoves(piece.pieceType, piece.color, pos, board);
}

function getSinglePieceMoves(
  type: PieceType,
  color: PieceColor,
  pos: Position,
  board: Board,
): Move[] {
  const moves: Move[] = [];
  const { row, col } = pos;

  switch (type) {
    case "p": {
      const direction = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;

      // Forward moves
      if (
        isValidPosition({ row: row + direction, col }) &&
        board[row + direction][col].length === 0
      ) {
        moves.push({
          from: pos,
          to: { row: row + direction, col },
          piece: "p",
        });

        // Double move from start
        if (row === startRow && board[row + 2 * direction][col].length === 0) {
          moves.push({
            from: pos,
            to: { row: row + 2 * direction, col },
            piece: "p",
          });
        }
      }

      // Captures and merges
      for (const dcol of [-1, 1]) {
        const newPos = { row: row + direction, col: col + dcol };
        if (isValidPosition(newPos)) {
          const targetCell = board[newPos.row][newPos.col];
          if (targetCell.length > 0) {
            const firstTargetPiece = targetCell[0];
            if (firstTargetPiece.color !== color) {
              // Capture enemy pieces
              moves.push({
                from: pos,
                to: newPos,
                piece: "p",
                capturedPieces: [...targetCell],
              });
            } else if (
              targetCell.length === 1 &&
              canMerge(type, firstTargetPiece.pieceType)
            ) {
              // Merge with friendly piece (only if target has 1 piece)
              moves.push({
                from: pos,
                to: newPos,
                piece: "p",
              });
            }
          }
        }
      }
      break;
    }

    case "r": {
      // Horizontal and vertical moves
      for (const [dr, dc] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) {
        for (let i = 1; i < 8; i++) {
          const newPos = { row: row + dr * i, col: col + dc * i };
          if (!isValidPosition(newPos)) break;

          const targetCell = board[newPos.row][newPos.col];
          if (targetCell.length === 0) {
            moves.push({
              from: pos,
              to: newPos,
              piece: "r",
            });
          } else {
            const firstTargetPiece = targetCell[0];
            if (firstTargetPiece.color !== color) {
              // Capture enemy pieces
              moves.push({
                from: pos,
                to: newPos,
                piece: "r",
                capturedPieces: [...targetCell],
              });
            } else if (
              targetCell.length === 1 &&
              canMerge(type, firstTargetPiece.pieceType)
            ) {
              // Merge with friendly piece
              moves.push({
                from: pos,
                to: newPos,
                piece: "r",
              });
            }
            break;
          }
        }
      }
      break;
    }

    case "n": {
      const knightMoves = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
      ];
      for (const [dr, dc] of knightMoves) {
        const newPos = { row: row + dr, col: col + dc };
        if (isValidPosition(newPos)) {
          const targetCell = board[newPos.row][newPos.col];
          if (targetCell.length === 0) {
            moves.push({
              from: pos,
              to: newPos,
              piece: "n",
            });
          } else {
            const firstTargetPiece = targetCell[0];
            if (firstTargetPiece.color !== color) {
              // Capture enemy pieces
              moves.push({
                from: pos,
                to: newPos,
                piece: "n",
                capturedPieces: [...targetCell],
              });
            } else if (
              targetCell.length === 1 &&
              canMerge(type, firstTargetPiece.pieceType)
            ) {
              // Merge with friendly piece
              moves.push({
                from: pos,
                to: newPos,
                piece: "n",
              });
            }
          }
        }
      }
      break;
    }

    case "b": {
      // Diagonal moves
      for (const [dr, dc] of [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]) {
        for (let i = 1; i < 8; i++) {
          const newPos = { row: row + dr * i, col: col + dc * i };
          if (!isValidPosition(newPos)) break;

          const targetCell = board[newPos.row][newPos.col];
          if (targetCell.length === 0) {
            moves.push({
              from: pos,
              to: newPos,
              piece: "b",
            });
          } else {
            const firstTargetPiece = targetCell[0];
            if (firstTargetPiece.color !== color) {
              // Capture enemy pieces
              moves.push({
                from: pos,
                to: newPos,
                piece: "b",
                capturedPieces: [...targetCell],
              });
            } else if (
              targetCell.length === 1 &&
              canMerge(type, firstTargetPiece.pieceType)
            ) {
              // Merge with friendly piece
              moves.push({
                from: pos,
                to: newPos,
                piece: "b",
              });
            }
            break;
          }
        }
      }
      break;
    }

    case "q": {
      // Combination of rook and bishop
      moves.push(...getSinglePieceMoves("r", color, pos, board));
      moves.push(...getSinglePieceMoves("b", color, pos, board));
      break;
    }

    case "k": {
      for (const dr of [-1, 0, 1]) {
        for (const dc of [-1, 0, 1]) {
          if (dr === 0 && dc === 0) continue;
          const newPos = { row: row + dr, col: col + dc };
          if (isValidPosition(newPos)) {
            const targetCell = board[newPos.row][newPos.col];
            if (targetCell.length === 0) {
              moves.push({
                from: pos,
                to: newPos,
                piece: "k",
              });
            } else {
              const firstTargetPiece = targetCell[0];
              if (firstTargetPiece.color !== color) {
                // Capture enemy pieces
                moves.push({
                  from: pos,
                  to: newPos,
                  piece: "k",
                  capturedPieces: [...targetCell],
                });
              }
              // Note: Kings cannot merge as per the canMerge function
            }
          }
        }
      }
      break;
    }
  }

  return moves;
}

// Check if two piece types can merge
export function canMerge(
  pieceType1: PieceType,
  pieceType2: PieceType,
): boolean {
  // Kings can't merge, otherwise all same-color pieces can merge
  return pieceType1 !== "k" && pieceType2 !== "k";
}

// Check if king is in check
export function isInCheck(board: Board, color: PieceColor): boolean {
  // Find king position
  let kingPos: Position | null = null;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = board[row][col];
      for (const piece of cell) {
        if (piece.color === color && piece.pieceType === "k") {
          kingPos = { row, col };
          break;
        }
      }
      if (kingPos) break;
    }
    if (kingPos) break;
  }

  if (!kingPos) return false;

  // Check if any opponent piece can attack the king
  const opponentColor = color === "w" ? "b" : "w";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = board[row][col];
      for (let pieceIndex = 0; pieceIndex < cell.length; pieceIndex++) {
        const piece = cell[pieceIndex];
        if (piece.color === opponentColor) {
          const moves = getPieceMoves(piece, { row, col }, board);
          if (
            moves.some(
              (move) =>
                move.to.row === kingPos.row && move.to.col === kingPos.col,
            )
          ) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

export const createGame = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = createInitialBoard();

    return await ctx.db.insert("games", {
      whitePlayerId: userId,
      status: "waiting",
      currentTurn: "w",
      board: JSON.stringify(board),
      moveHistory: [],
      lastMoveAt: Date.now(),
    });
  },
});

export const createPracticeGame = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const board = createInitialBoard();

    return await ctx.db.insert("games", {
      whitePlayerId: userId,
      blackPlayerId: userId, // Same user plays both sides
      isPracticeGame: true,
      status: "active", // Start immediately, no need to wait
      currentTurn: "w",
      board: JSON.stringify(board),
      moveHistory: [],
      lastMoveAt: Date.now(),
    });
  },
});

export const joinGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "waiting")
      throw new Error("Game is not waiting for players");
    if (game.whitePlayerId === userId)
      throw new Error("Cannot join your own game");

    await ctx.db.patch(args.gameId, {
      blackPlayerId: userId,
      status: "active",
    });

    return game;
  },
});

export const makeMove = mutation({
  args: {
    gameId: v.id("games"),
    move: v.string(), // JSON serialized move
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "active") throw new Error("Game is not active");

    const isWhitePlayer = game.whitePlayerId === userId;
    const isBlackPlayer = game.blackPlayerId === userId;

    if (!isWhitePlayer && !isBlackPlayer)
      throw new Error("Not a player in this game");

    // For practice games, allow the same user to play both sides
    if (game.isPracticeGame) {
      // In practice mode, user can make moves for either side
    } else {
      // For regular games, enforce turn order
      if (game.currentTurn !== (isWhitePlayer ? "w" : "b")) {
        throw new Error("Not your turn");
      }
    }

    const move: Move = JSON.parse(args.move);
    const board: Board = JSON.parse(game.board);

    // Validate and apply move
    const newBoard = applyMove(board, move);
    const nextTurn = game.currentTurn === "w" ? "b" : "w";

    // Check for game end conditions
    const isCheck = isInCheck(newBoard, nextTurn);
    let status: "waiting" | "active" | "completed" | "abandoned" = game.status;
    let winner: "w" | "b" | "draw" | undefined = game.winner;
    let gameEndReason:
      | "checkmate"
      | "stalemate"
      | "resignation"
      | "timeout"
      | "draw_agreement"
      | undefined = game.gameEndReason;

    if (isCheck) {
      // Check for checkmate
      const hasValidMoves = hasAnyValidMoves(newBoard, nextTurn);
      if (!hasValidMoves) {
        status = "completed";
        winner = game.currentTurn;
        gameEndReason = "checkmate";
      }
    } else {
      // Check for stalemate
      const hasValidMoves = hasAnyValidMoves(newBoard, nextTurn);
      if (!hasValidMoves) {
        status = "completed";
        winner = "draw";
        gameEndReason = "stalemate";
      }
    }

    await ctx.db.patch(args.gameId, {
      board: JSON.stringify(newBoard),
      currentTurn: nextTurn,
      moveHistory: [...game.moveHistory, args.move],
      lastMoveAt: Date.now(),
      status,
      winner,
      gameEndReason,
    });

    return {
      success: true,
      isCheck,
      isCheckmate: gameEndReason === "checkmate",
    };
  },
});

export function boardToString(board: Board): string {
  return board
    .map((row) =>
      row
        .map((cell) => {
          if (cell.length === 0) {
            return ".  ";
          }
          if (cell.length === 1) {
            return cell[0].color + cell[0].pieceType + " ";
          }
          if (cell.length === 2) {
            return cell[0].color + cell[0].pieceType + cell[1].pieceType;
          }
          throw new Error("Invalid board state");
        })
        .join(" "),
    )
    .join("\n");
}

function applyMove(board: Board, move: Move): Board {
  console.log("Applying move", move);
  const newBoard = board.map((row) => row.map((cell) => [...cell]));

  const sourceCell = newBoard[move.from.row][move.from.col];
  const targetCell = newBoard[move.to.row][move.to.col];

  if (sourceCell.length === 0) {
    throw new Error("No piece found at source position");
  }

  if (move.piece.length === 2 && sourceCell.length !== 2) {
    throw new Error("Trying to move 2 pieces but source cell has only 1 piece");
  }

  // Basic move
  if (move.piece.length === 1) {
    if (
      sourceCell[0].pieceType !== move.piece &&
      sourceCell[1].pieceType !== move.piece
    ) {
      throw new Error("Trying to move a piece that is not in the source cell");
    }

    let pieceToMove = sourceCell[0];

    // This is incorrect since the source can have 2
    if (sourceCell.length === 1) {
      newBoard[move.from.row][move.from.col] = [];
    } else {
      if (sourceCell[0].pieceType === move.piece) {
        newBoard[move.from.row][move.from.col] = [sourceCell[1]];
        pieceToMove = sourceCell[0];
      } else {
        newBoard[move.from.row][move.from.col] = [sourceCell[0]];
        pieceToMove = sourceCell[1];
      }
    }

    console.log({ pieceToMove });

    // Move to empty cell
    if (targetCell.length === 0) {
      newBoard[move.to.row][move.to.col] = [pieceToMove];
      return newBoard;
    }

    // Capture enemy piece/s
    if (targetCell[0].color !== pieceToMove.color) {
      newBoard[move.to.row][move.to.col] = [pieceToMove];
      return newBoard;
    }

    if (targetCell.length > 1) {
      throw new Error("Trying to move to a cell with 2 pieces");
    }

    // Here we merge
    if (!canMerge(pieceToMove.pieceType, targetCell[0].pieceType)) {
      throw new Error(
        `Trying to merge pieces that cannot merge: ${pieceToMove.pieceType} and ${targetCell[0].pieceType}`,
      );
    }

    newBoard[move.to.row][move.to.col] = [targetCell[0], pieceToMove];
    return newBoard;
  }

  if (move.piece.length === 2) {
    // both pieces should be in the source cell
    if (sourceCell.length !== 2) {
      throw new Error(
        "Trying to move 2 pieces but source cell has only 1 piece",
      );
    }

    const bothPiecesAreInSourceCell =
      (sourceCell[0].pieceType === move.piece[0] &&
        sourceCell[1].pieceType === move.piece[1]) ||
      (sourceCell[0].pieceType === move.piece[1] &&
        sourceCell[1].pieceType === move.piece[0]);

    if (!bothPiecesAreInSourceCell) {
      throw new Error(
        "The pieces that are being moved are not in the source cell",
      );
    }

    // Move to empty cell
    if (targetCell.length === 0) {
      newBoard[move.to.row][move.to.col] = [sourceCell[0]];
      return newBoard;
    }

    // Capture enemy piece/s
    if (targetCell[0].color !== sourceCell[0].color) {
      newBoard[move.to.row][move.to.col] = [sourceCell[0]];
      return newBoard;
    }

    throw new Error("Trying to move 2 pieces to a cell with at least 1 piece");
  }

  return newBoard;
}

function hasAnyValidMoves(board: Board, color: PieceColor): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = board[row][col];
      for (let pieceIndex = 0; pieceIndex < cell.length; pieceIndex++) {
        const piece = cell[pieceIndex];
        if (piece.color === color) {
          const moves = getPieceMoves(piece, { row, col }, board);
          if (moves.length > 0) return true;
        }
      }
    }
  }
  return false;
}

export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId);
  },
});

export const listGames = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const games = await ctx.db
      .query("games")
      .filter((q) =>
        q.or(
          q.eq(q.field("whitePlayerId"), userId),
          q.eq(q.field("blackPlayerId"), userId),
        ),
      )
      .order("desc")
      .take(20);

    return games;
  },
});

export const getWaitingGames = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("games")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .filter((q) => q.neq(q.field("whitePlayerId"), userId))
      .order("desc")
      .take(10);
  },
});

// Helper functions for UI - simplified for new structure
export function getAllMovesForCell(pos: Position, board: Board): Move[] {
  const moves: Move[] = [];
  const cell = board[pos.row][pos.col];

  // Get moves for each piece in the cell
  for (let pieceIndex = 0; pieceIndex < cell.length; pieceIndex++) {
    const piece = cell[pieceIndex];
    const pieceMoves = getPieceMoves(piece, pos, board);
    moves.push(...pieceMoves);
  }

  return moves;
}

export const deleteAllGames = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get all games for this user
    const games = await ctx.db
      .query("games")
      .filter((q) =>
        q.or(
          q.eq(q.field("whitePlayerId"), userId),
          q.eq(q.field("blackPlayerId"), userId),
        ),
      )
      .collect();

    // Delete all games
    for (const game of games) {
      await ctx.db.delete(game._id);
    }

    return { deletedCount: games.length };
  },
});
