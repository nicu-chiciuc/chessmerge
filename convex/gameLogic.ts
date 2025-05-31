import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Piece types and colors
export type PieceType =
  | "pawn"
  | "rook"
  | "knight"
  | "bishop"
  | "queen"
  | "king";
export type PieceColor = "white" | "black";

// Single piece or merged piece
export interface Piece {
  color: PieceColor;
  type: PieceType;
  merged?: {
    piece1: PieceType;
    piece2: PieceType;
  };
  hasMoved?: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  capturedPiece?: Piece;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isStalemate?: boolean;
  moveType?: "normal" | "merge" | "unmerge" | "castle" | "enpassant";
  mergeWith?: Piece;
  unmergePositions?: Position[];
}

export type Board = (Piece | null)[][];

// Initialize standard chess board
export function createInitialBoard(): Board {
  const board: Board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // White pieces
  board[7] = [
    { color: "white", type: "rook" },
    { color: "white", type: "knight" },
    { color: "white", type: "bishop" },
    { color: "white", type: "queen" },
    { color: "white", type: "king" },
    { color: "white", type: "bishop" },
    { color: "white", type: "knight" },
    { color: "white", type: "rook" },
  ];

  for (let col = 0; col < 8; col++) {
    board[6][col] = { color: "white", type: "pawn" };
  }

  // Black pieces
  board[0] = [
    { color: "black", type: "rook" },
    { color: "black", type: "knight" },
    { color: "black", type: "bishop" },
    { color: "black", type: "queen" },
    { color: "black", type: "king" },
    { color: "black", type: "bishop" },
    { color: "black", type: "knight" },
    { color: "black", type: "rook" },
  ];

  for (let col = 0; col < 8; col++) {
    board[1][col] = { color: "black", type: "pawn" };
  }

  return board;
}

// Check if position is valid
export function isValidPosition(pos: Position): boolean {
  return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
}

// Get piece moves based on type
export function getPieceMoves(
  piece: Piece,
  pos: Position,
  board: Board,
): Move[] {
  if (piece.merged) {
    // Merged piece can move like both constituent pieces
    const moves1 = getSinglePieceMoves(
      piece.merged.piece1,
      piece.color,
      pos,
      board,
      piece,
    );
    const moves2 = getSinglePieceMoves(
      piece.merged.piece2,
      piece.color,
      pos,
      board,
      piece,
    );
    return [...moves1, ...moves2];
  }

  return getSinglePieceMoves(piece.type, piece.color, pos, board, piece);
}

function getSinglePieceMoves(
  type: PieceType,
  color: PieceColor,
  pos: Position,
  board: Board,
  piece: Piece,
): Move[] {
  const moves: Move[] = [];
  const { row, col } = pos;

  switch (type) {
    case "pawn": {
      const direction = color === "white" ? -1 : 1;
      const startRow = color === "white" ? 6 : 1;

      // Forward moves
      if (
        isValidPosition({ row: row + direction, col }) &&
        !board[row + direction][col]
      ) {
        moves.push({
          from: pos,
          to: { row: row + direction, col },
          piece,
          moveType: "normal",
        });

        // Double move from start
        if (row === startRow && !board[row + 2 * direction][col]) {
          moves.push({
            from: pos,
            to: { row: row + 2 * direction, col },
            piece,
            moveType: "normal",
          });
        }
      }

      // Captures and merges
      for (const dcol of [-1, 1]) {
        const newPos = { row: row + direction, col: col + dcol };
        if (isValidPosition(newPos)) {
          const targetPiece = board[newPos.row][newPos.col];
          if (targetPiece) {
            if (targetPiece.color !== color) {
              // Capture enemy piece
              moves.push({
                from: pos,
                to: newPos,
                piece,
                capturedPiece: targetPiece,
                moveType: "normal",
              });
            } else if (canMerge(piece, targetPiece, pos, newPos)) {
              // Merge with friendly piece
              moves.push({
                from: pos,
                to: newPos,
                piece,
                moveType: "merge",
                mergeWith: targetPiece,
              });
            }
          }
        }
      }
      break;
    }

    case "rook": {
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

          const targetPiece = board[newPos.row][newPos.col];
          if (!targetPiece) {
            moves.push({
              from: pos,
              to: newPos,
              piece,
              moveType: "normal",
            });
          } else {
            if (targetPiece.color !== color) {
              // Capture enemy piece
              moves.push({
                from: pos,
                to: newPos,
                piece,
                capturedPiece: targetPiece,
                moveType: "normal",
              });
            } else if (canMerge(piece, targetPiece, pos, newPos)) {
              // Merge with friendly piece
              moves.push({
                from: pos,
                to: newPos,
                piece,
                moveType: "merge",
                mergeWith: targetPiece,
              });
            }
            break;
          }
        }
      }
      break;
    }

    case "knight": {
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
          const targetPiece = board[newPos.row][newPos.col];
          if (!targetPiece) {
            moves.push({
              from: pos,
              to: newPos,
              piece,
              moveType: "normal",
            });
          } else if (targetPiece.color !== color) {
            // Capture enemy piece
            moves.push({
              from: pos,
              to: newPos,
              piece,
              capturedPiece: targetPiece,
              moveType: "normal",
            });
          } else if (canMerge(piece, targetPiece, pos, newPos)) {
            // Merge with friendly piece
            moves.push({
              from: pos,
              to: newPos,
              piece,
              moveType: "merge",
              mergeWith: targetPiece,
            });
          }
        }
      }
      break;
    }

    case "bishop": {
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

          const targetPiece = board[newPos.row][newPos.col];
          if (!targetPiece) {
            moves.push({
              from: pos,
              to: newPos,
              piece,
              moveType: "normal",
            });
          } else {
            if (targetPiece.color !== color) {
              // Capture enemy piece
              moves.push({
                from: pos,
                to: newPos,
                piece,
                capturedPiece: targetPiece,
                moveType: "normal",
              });
            } else if (canMerge(piece, targetPiece, pos, newPos)) {
              // Merge with friendly piece
              moves.push({
                from: pos,
                to: newPos,
                piece,
                moveType: "merge",
                mergeWith: targetPiece,
              });
            }
            break;
          }
        }
      }
      break;
    }

    case "queen": {
      // Combination of rook and bishop
      moves.push(...getSinglePieceMoves("rook", color, pos, board, piece));
      moves.push(...getSinglePieceMoves("bishop", color, pos, board, piece));
      break;
    }

    case "king": {
      for (const dr of [-1, 0, 1]) {
        for (const dc of [-1, 0, 1]) {
          if (dr === 0 && dc === 0) continue;
          const newPos = { row: row + dr, col: col + dc };
          if (isValidPosition(newPos)) {
            const targetPiece = board[newPos.row][newPos.col];
            if (!targetPiece) {
              moves.push({
                from: pos,
                to: newPos,
                piece,
                moveType: "normal",
              });
            } else if (targetPiece.color !== color) {
              // Capture enemy piece
              moves.push({
                from: pos,
                to: newPos,
                piece,
                capturedPiece: targetPiece,
                moveType: "normal",
              });
            }
            // Note: Kings cannot merge as per the canMerge function
          }
        }
      }
      break;
    }
  }

  return moves;
}

// Check if two pieces can merge
export function canMerge(
  piece1: Piece,
  piece2: Piece,
  pos1: Position,
  pos2: Position,
): boolean {
  // Same color and adjacent positions
  if (piece1.color !== piece2.color) return false;
  if (piece1.merged || piece2.merged) return false; // Can't merge already merged pieces
  if (piece1.type === "king" || piece2.type === "king") return false; // Kings can't merge

  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);

  return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
}

// Get valid unmerge positions for a merged piece
export function getUnmergePositions(pos: Position, board: Board): Position[] {
  const positions: Position[] = [];

  for (const dr of [-1, 0, 1]) {
    for (const dc of [-1, 0, 1]) {
      if (dr === 0 && dc === 0) continue;
      const newPos = { row: pos.row + dr, col: pos.col + dc };
      if (isValidPosition(newPos) && !board[newPos.row][newPos.col]) {
        positions.push(newPos);
      }
    }
  }

  return positions;
}

// Check if king is in check
export function isInCheck(board: Board, color: PieceColor): boolean {
  // Find king position
  let kingPos: Position | null = null;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece?.color === color && piece.type === "king") {
        kingPos = { row, col };
        break;
      }
    }
    if (kingPos) break;
  }

  if (!kingPos) return false;

  // Check if any opponent piece can attack the king
  const opponentColor = color === "white" ? "black" : "white";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece?.color === opponentColor) {
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
      currentTurn: "white",
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

    const playerColor = isWhitePlayer ? "white" : "black";
    if (game.currentTurn !== playerColor) throw new Error("Not your turn");

    const move: Move = JSON.parse(args.move);
    const board: Board = JSON.parse(game.board);

    // Validate and apply move
    const newBoard = applyMove(board, move);
    const nextTurn = game.currentTurn === "white" ? "black" : "white";

    // Check for game end conditions
    const isCheck = isInCheck(newBoard, nextTurn);
    let status: "waiting" | "active" | "completed" | "abandoned" = game.status;
    let winner: "white" | "black" | "draw" | undefined = game.winner;
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

function applyMove(board: Board, move: Move): Board {
  const newBoard = board.map((row) => [...row]);

  if (move.moveType === "merge") {
    // Merge two pieces
    const piece1 = newBoard[move.from.row][move.from.col];
    const piece2 = newBoard[move.to.row][move.to.col];

    if (piece1 && piece2) {
      const mergedPiece: Piece = {
        color: piece1.color,
        type: piece1.type, // Primary type
        merged: {
          piece1: piece1.type,
          piece2: piece2.type,
        },
      };

      newBoard[move.to.row][move.to.col] = mergedPiece;
      newBoard[move.from.row][move.from.col] = null;
    }
  } else if (move.moveType === "unmerge") {
    // Unmerge a piece
    const piece = newBoard[move.from.row][move.from.col];
    if (
      piece?.merged &&
      move.unmergePositions &&
      move.unmergePositions.length === 1
    ) {
      const unmergePos = move.unmergePositions[0];

      // Place first piece at original position
      newBoard[move.from.row][move.from.col] = {
        color: piece.color,
        type: piece.merged.piece1,
      };

      // Place second piece at unmerge position
      newBoard[unmergePos.row][unmergePos.col] = {
        color: piece.color,
        type: piece.merged.piece2,
      };
    }
  } else {
    // Normal move
    newBoard[move.to.row][move.to.col] = newBoard[move.from.row][move.from.col];
    newBoard[move.from.row][move.from.col] = null;

    if (newBoard[move.to.row][move.to.col]) {
      newBoard[move.to.row][move.to.col]!.hasMoved = true;
    }
  }

  return newBoard;
}

function hasAnyValidMoves(board: Board, color: PieceColor): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece?.color === color) {
        const moves = getPieceMoves(piece, { row, col }, board);
        if (moves.length > 0) return true;
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
