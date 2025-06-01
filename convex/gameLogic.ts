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
export type Piece = {
  color: PieceColor;
  hasMoved?: boolean;
} & (
  | { type: "standard"; pieceType: PieceType }
  | { type: "merged"; piece1: PieceType; piece2: PieceType }
);

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
  // For unmerge-then-move scenarios
  unmergeDetails?: {
    remainingPiecePosition: Position; // Where the non-moving piece stays
    movingPieceType: PieceType; // Which piece type is moving
  };
  // For merged pieces - which constituent piece types can make this move
  validForPieceTypes?: PieceType[];
}

export type Board = (Piece | null)[][];

// Initialize standard chess board
export function createInitialBoard(): Board {
  const board: Board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // White pieces
  board[7] = [
    { color: "white", type: "standard", pieceType: "rook" },
    { color: "white", type: "standard", pieceType: "knight" },
    { color: "white", type: "standard", pieceType: "bishop" },
    { color: "white", type: "standard", pieceType: "queen" },
    { color: "white", type: "standard", pieceType: "king" },
    { color: "white", type: "standard", pieceType: "bishop" },
    { color: "white", type: "standard", pieceType: "knight" },
    { color: "white", type: "standard", pieceType: "rook" },
  ];

  for (let col = 0; col < 8; col++) {
    board[6][col] = { color: "white", type: "standard", pieceType: "pawn" };
  }

  // Black pieces
  board[0] = [
    { color: "black", type: "standard", pieceType: "rook" },
    { color: "black", type: "standard", pieceType: "knight" },
    { color: "black", type: "standard", pieceType: "bishop" },
    { color: "black", type: "standard", pieceType: "queen" },
    { color: "black", type: "standard", pieceType: "king" },
    { color: "black", type: "standard", pieceType: "bishop" },
    { color: "black", type: "standard", pieceType: "knight" },
    { color: "black", type: "standard", pieceType: "rook" },
  ];

  for (let col = 0; col < 8; col++) {
    board[1][col] = { color: "black", type: "standard", pieceType: "pawn" };
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
  if (piece.type === "merged") {
    // Get moves for each constituent piece and tag them appropriately
    const moves1 = getSinglePieceMoves(
      piece.piece1,
      piece.color,
      pos,
      board,
      piece,
    ).map((move) => ({
      ...move,
      validForPieceTypes: [piece.piece1],
    }));

    const moves2 = getSinglePieceMoves(
      piece.piece2,
      piece.color,
      pos,
      board,
      piece,
    ).map((move) => ({
      ...move,
      validForPieceTypes: [piece.piece2],
    }));

    // Combine moves and merge duplicates
    const allMoves = [...moves1, ...moves2];
    const mergedMoves: Move[] = [];

    for (const move of allMoves) {
      const existing = mergedMoves.find(
        (m) =>
          m.to.row === move.to.row &&
          m.to.col === move.to.col &&
          m.moveType === move.moveType,
      );

      if (existing && existing.validForPieceTypes && move.validForPieceTypes) {
        // Merge the valid piece types
        existing.validForPieceTypes = [
          ...existing.validForPieceTypes,
          ...move.validForPieceTypes,
        ];
      } else {
        mergedMoves.push(move);
      }
    }

    // Add unmerge-then-move moves (one piece moves out)
    const unmergeThenMoveMoves = getUnmergeThenMoveMoves(piece, pos, board);

    // Add simple unmerge moves (both pieces separate to adjacent squares)
    const simpleUnmergeMoves = getSimpleUnmergeMoves(piece, pos, board);

    return [...mergedMoves, ...unmergeThenMoveMoves, ...simpleUnmergeMoves];
  }

  return getSinglePieceMoves(piece.pieceType, piece.color, pos, board, piece);
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
  if (piece1.type === "merged" || piece2.type === "merged") return false; // Can't merge already merged pieces
  if (piece1.pieceType === "king" || piece2.pieceType === "king") return false; // Kings can't merge

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

// Generate moves where a merged piece unmerges and one part moves
function getUnmergeThenMoveMoves(
  mergedPiece: Piece,
  pos: Position,
  board: Board,
): Move[] {
  if (mergedPiece.type !== "merged") return [];

  const moves: Move[] = [];

  // Get moves for piece1 moving out while piece2 stays
  const piece1Moves = getSinglePieceMoves(
    mergedPiece.piece1,
    mergedPiece.color,
    pos,
    board,
    {
      color: mergedPiece.color,
      type: "standard",
      pieceType: mergedPiece.piece1,
    },
  ).filter((move) => {
    // Don't include moves to the current position
    return !(move.to.row === pos.row && move.to.col === pos.col);
  });

  // Get moves for piece2 moving out while piece1 stays
  const piece2Moves = getSinglePieceMoves(
    mergedPiece.piece2,
    mergedPiece.color,
    pos,
    board,
    {
      color: mergedPiece.color,
      type: "standard",
      pieceType: mergedPiece.piece2,
    },
  ).filter((move) => {
    // Don't include moves to the current position
    return !(move.to.row === pos.row && move.to.col === pos.col);
  });

  // Convert piece1 moves to unmerge-then-move format
  for (const move of piece1Moves) {
    moves.push({
      from: pos,
      to: move.to,
      piece: mergedPiece,
      capturedPiece: move.capturedPiece,
      moveType: "unmerge",
      mergeWith: move.mergeWith,
      unmergeDetails: {
        remainingPiecePosition: pos,
        movingPieceType: mergedPiece.piece1,
      },
      validForPieceTypes: [mergedPiece.piece1],
    });
  }

  // Convert piece2 moves to unmerge-then-move format
  for (const move of piece2Moves) {
    moves.push({
      from: pos,
      to: move.to,
      piece: mergedPiece,
      capturedPiece: move.capturedPiece,
      moveType: "unmerge",
      mergeWith: move.mergeWith,
      unmergeDetails: {
        remainingPiecePosition: pos,
        movingPieceType: mergedPiece.piece2,
      },
      validForPieceTypes: [mergedPiece.piece2],
    });
  }

  return moves;
}

// Get simple unmerge moves for a merged piece (both pieces move to adjacent squares)
function getSimpleUnmergeMoves(
  mergedPiece: Piece,
  pos: Position,
  board: Board,
): Move[] {
  if (mergedPiece.type !== "merged") return [];

  const moves: Move[] = [];
  const unmergePositions = getUnmergePositions(pos, board);

  // For each possible unmerge position, create a simple unmerge move
  for (const unmergePos of unmergePositions) {
    moves.push({
      from: pos,
      to: unmergePos,
      piece: mergedPiece,
      moveType: "unmerge",
      unmergePositions: [unmergePos],
    });
  }

  return moves;
}

// Check if king is in check
export function isInCheck(board: Board, color: PieceColor): boolean {
  // Find king position
  let kingPos: Position | null = null;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (
        piece?.color === color &&
        ((piece.type === "standard" && piece.pieceType === "king") ||
          (piece.type === "merged" &&
            (piece.piece1 === "king" || piece.piece2 === "king")))
      ) {
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

    if (
      piece1 &&
      piece2 &&
      piece1.type === "standard" &&
      piece2.type === "standard"
    ) {
      const mergedPiece: Piece = {
        color: piece1.color,
        type: "merged",
        piece1: piece1.pieceType,
        piece2: piece2.pieceType,
      };

      newBoard[move.to.row][move.to.col] = mergedPiece;
      newBoard[move.from.row][move.from.col] = null;
    }
  } else if (move.moveType === "unmerge") {
    const piece = newBoard[move.from.row][move.from.col];

    if (piece?.type === "merged") {
      if (move.unmergeDetails) {
        // Unmerge-then-move scenario
        const { remainingPiecePosition, movingPieceType } = move.unmergeDetails;

        // Determine which piece types go where
        const isMovingPiece1 = movingPieceType === piece.piece1;
        const movingType = movingPieceType;
        const stayingType = isMovingPiece1 ? piece.piece2 : piece.piece1;

        // Place the staying piece
        newBoard[remainingPiecePosition.row][remainingPiecePosition.col] = {
          color: piece.color,
          type: "standard",
          pieceType: stayingType,
        };

        // Place the moving piece at destination
        const movingPiece: Piece = {
          color: piece.color,
          type: "standard",
          pieceType: movingType,
          hasMoved: true,
        };

        newBoard[move.to.row][move.to.col] = movingPiece;
        newBoard[move.from.row][move.from.col] = null;

        // Handle merging at destination if specified
        if (move.mergeWith && move.mergeWith.type === "standard") {
          const mergedPiece: Piece = {
            color: movingPiece.color,
            type: "merged",
            piece1: movingPiece.pieceType,
            piece2: move.mergeWith.pieceType,
          };
          newBoard[move.to.row][move.to.col] = mergedPiece;
        }
      } else if (move.unmergePositions && move.unmergePositions.length === 1) {
        // Simple unmerge (legacy support)
        const unmergePos = move.unmergePositions[0];

        // Place first piece at original position
        newBoard[move.from.row][move.from.col] = {
          color: piece.color,
          type: "standard",
          pieceType: piece.piece1,
        };

        // Place second piece at unmerge position
        newBoard[unmergePos.row][unmergePos.col] = {
          color: piece.color,
          type: "standard",
          pieceType: piece.piece2,
        };
      }
    }
  } else {
    // Normal move
    const movingPiece = newBoard[move.from.row][move.from.col];
    if (movingPiece) {
      // Create a proper copy of the piece to preserve all properties
      newBoard[move.to.row][move.to.col] = {
        ...movingPiece,
        hasMoved: true,
      };
      newBoard[move.from.row][move.from.col] = null;
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

// Helper functions for UI move filtering
export type ViewMode = "merged" | "piece1" | "piece2";

export function filterMovesByViewMode(
  moves: Move[],
  piece: Piece,
  viewMode: ViewMode,
): Move[] {
  if (piece.type !== "merged" || viewMode === "merged") {
    return moves;
  }

  const targetPieceType = viewMode === "piece1" ? piece.piece1 : piece.piece2;

  return moves.filter((move) => {
    if (move.moveType === "unmerge" && move.unmergeDetails) {
      // For unmerge moves, only show moves where the target piece type is moving
      return move.unmergeDetails.movingPieceType === targetPieceType;
    } else if (move.validForPieceTypes) {
      // For regular moves, check if the target piece type can make this move
      return move.validForPieceTypes.includes(targetPieceType);
    }

    return false;
  });
}

export function getAvailableUnmergeOptions(
  piece: Piece,
  pos: Position,
  board: Board,
): { hasUnmergeOptions: boolean; canMoveAfterUnmerge: boolean } {
  if (piece.type !== "merged") {
    return { hasUnmergeOptions: false, canMoveAfterUnmerge: false };
  }

  const unmergePositions = getUnmergePositions(pos, board);
  const hasUnmergeOptions = unmergePositions.length > 0;

  if (!hasUnmergeOptions) {
    return { hasUnmergeOptions: false, canMoveAfterUnmerge: false };
  }

  // Check if either piece can move after unmerging
  const unmergeMoves = getUnmergeThenMoveMoves(piece, pos, board);
  const canMoveAfterUnmerge = unmergeMoves.length > 0;

  return { hasUnmergeOptions, canMoveAfterUnmerge };
}
