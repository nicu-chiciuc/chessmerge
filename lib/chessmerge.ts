import { includes, notEmpty } from "@tscu/dependent";
import {
  boolean,
  literal,
  number,
  object,
  optional,
  string,
  union,
} from "@robolex/sure";

// Piece types and colors
export const PieceTypes = ["p", "r", "n", "b", "q", "k"] as const;
export type PieceType = (typeof PieceTypes)[number];
export type PieceColor = "w" | "b";

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

  type: "base" | "merge" | "castle";

  isPromotion?: boolean;
  promotion?: PieceType;

  /**
   * @deprecated Note used really
   */
  capturedPieces?: Piece[]; // Pieces captured at destination
}

export type Cell = Piece[];
// Board where each cell can contain 0-2 pieces of the same color
export type Board = Cell[][];

// A better name
export type GameState = {
  board: Board;
  options: BoardOptions;
};

export function createEmptyBoard(): GameState {
  return {
    board: Array(8)
      .fill(null)
      .map(() =>
        Array(8)
          .fill(null)
          .map(() => []),
      ),
    options: {
      turn: "w",
      castlingRights: {
        w: {
          short: true,
          long: true,
        },
        b: {
          short: true,
          long: true,
        },
      },
      halfMoveClock: 0,
      fullMoveClock: 1,
      enPassantTarget: null,
    },
  };
}

// Initialize standard chess board
export function createInitialBoard(): GameState {
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

  return {
    board,
    options: {
      turn: "w",
      fullMoveClock: 1,
      castlingRights: {
        w: {
          short: true,
          long: true,
        },
        b: {
          short: true,
          long: true,
        },
      },
      halfMoveClock: 0,
      enPassantTarget: null,
    },
  };
}

// Check if position is valid
export function isInsideBoard(pos: Position): boolean {
  return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
}

// Get piece moves for a specific piece at a position
export function getPieceMoves(
  piece: Piece,
  pos: Position,
  gameState: GameState,
  options?: {
    filterCheckMoves?: boolean;
    ignoreKingMoves?: boolean;
  },
): Move[] {
  const moves = getSinglePieceMoves(
    piece.pieceType,
    piece.color,
    pos,
    gameState,
    options,
  );

  for (const move of moves) {
    if (shouldPromote(move, gameState)) {
      move.isPromotion = true;
      move.promotion = "q";
    }
  }
  return moves;
}

// Similar to Forsyth–Edwards Notation
export type BoardOptions = {
  turn: PieceColor;
  castlingRights: {
    w: {
      short: boolean;
      long: boolean;
    };
    b: {
      short: boolean;
      long: boolean;
    };
  };
  enPassantTarget: Position | null;
  halfMoveClock: number;
  fullMoveClock: number;
};

const PieceColorSchema = union(literal("w"), literal("b"));

const BoardOptionsSchema = object({
  turn: PieceColorSchema,
  castlingRights: object({
    w: object({
      short: boolean,
      long: boolean,
    }),
    b: object({
      short: boolean,
      long: boolean,
    }),
  }),
  enPassantTarget: optional(string),
  halfMoveClock: number,
  fullMoveClock: number,
});

console.log(BoardOptionsSchema);

function getSinglePieceMoves(
  type: PieceType,
  color: PieceColor,
  pos: Position,
  gameState: GameState,
  {
    filterCheckMoves = false,
    ignoreKingMoves = false,
  }: {
    filterCheckMoves?: boolean;
    ignoreKingMoves?: boolean;
  } = {},
): Move[] {
  const { board, options } = gameState;
  const moves: Move[] = [];
  const { row, col } = pos;

  switch (type) {
    case "p": {
      const direction = color === "w" ? -1 : 1;
      const startRow = color === "w" ? 6 : 1;

      function isEmptyOrSameCanMerge(targetCell: Piece[]) {
        if (targetCell.length === 0) return true;

        if (
          targetCell.length === 1 &&
          canMerge(type, targetCell[0].pieceType) &&
          targetCell[0].color === color
        ) {
          return true;
        }

        return false;
      }

      // Forward moves
      if (
        isInsideBoard({ row: row + direction, col }) &&
        isEmptyOrSameCanMerge(board[row + direction][col])
      ) {
        const to = { row: row + direction, col };

        moves.push({
          from: pos,
          to,
          piece: "p",
          type: board[row + direction][col].length === 1 ? "merge" : "base",
        });

        // Double move from start
        if (
          row === startRow &&
          // TODO: Pawn can also get one row back, should they also be able to double move from there?
          isEmptyOrSameCanMerge(board[row + 2 * direction][col]) &&
          // but there's no piece in the way
          board[row + direction][col].length === 0
        ) {
          moves.push({
            from: pos,
            to: { row: row + 2 * direction, col },
            piece: "p",
            type:
              board[row + 2 * direction][col].length === 1 ? "merge" : "base",
          });
        }
      }

      // Captures
      for (const dcol of [-1, 1]) {
        const newPos = { row: row + direction, col: col + dcol };
        if (isInsideBoard(newPos)) {
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
                type: "base",
              });
            }
          }

          if (
            options.enPassantTarget &&
            equalPositions(options.enPassantTarget, newPos)
          ) {
            // check the piece in the cell behind the en passant target
            const cellBehind = board[row + direction][col];
            if (
              cellBehind.length > 0 &&
              cellBehind[0].pieceType === "p" &&
              cellBehind[0].color === otherColor(color)
            ) {
              moves.push({
                from: pos,
                to: newPos,
                piece: "p",
                type: "base",
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
          if (!isInsideBoard(newPos)) break;

          const targetCell = board[newPos.row][newPos.col];
          if (targetCell.length === 0) {
            moves.push({
              from: pos,
              to: newPos,
              piece: "r",
              type: "base",
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
                type: "base",
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
                type: "merge",
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
        if (isInsideBoard(newPos)) {
          const targetCell = board[newPos.row][newPos.col];
          if (targetCell.length === 0) {
            moves.push({
              from: pos,
              to: newPos,
              piece: "n",
              type: "base",
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
                type: "base",
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
                type: "merge",
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
          if (!isInsideBoard(newPos)) break;

          const targetCell = board[newPos.row][newPos.col];
          if (targetCell.length === 0) {
            moves.push({
              from: pos,
              to: newPos,
              piece: "b",
              type: "base",
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
                type: "base",
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
                type: "merge",
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
      moves.push(
        ...[
          ...getSinglePieceMoves("r", color, pos, { board, options }),
          ...getSinglePieceMoves("b", color, pos, { board, options }),
        ].map(
          (move): Move => ({
            ...move,
            piece: "q",
          }),
        ),
      );
      break;
    }

    case "k": {
      if (ignoreKingMoves) {
        break;
      }

      for (const dr of [-1, 0, 1]) {
        for (const dc of [-1, 0, 1]) {
          if (dr === 0 && dc === 0) continue;
          const newPos = { row: row + dr, col: col + dc };
          if (isInsideBoard(newPos)) {
            const targetCell = board[newPos.row][newPos.col];
            if (targetCell.length === 0) {
              moves.push({
                from: pos,
                to: newPos,
                piece: "k",
                type: "base",
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
                  type: "base",
                });
              }
              // Note: Kings cannot merge as per the canMerge function
            }
          }
        }
      }

      // This is necessary because the board can be edited, and the status of castling rights is not updated
      const kingsAreOnStartPosition =
        (color === "w" && row === 0 && col === 4) ||
        (color === "b" && row === 7 && col === 4);

      if (
        options.castlingRights[color].short &&
        kingsAreOnStartPosition &&
        // Nothing is attacked
        !isCellAttacked(gameState, { row: row, col: col + 0 }, color, true) &&
        !isCellAttacked(gameState, { row: row, col: col + 1 }, color, true) &&
        !isCellAttacked(gameState, { row: row, col: col + 2 }, color, true) &&
        // space to close rook is empty
        // We use ?., because the board can be edited, and the status of castling rights is not updated
        board[row]?.[col + 1]?.length === 0 &&
        board[row]?.[col + 2]?.length === 0
      ) {
        moves.push({
          type: "castle",
          from: pos,
          to: { row: row, col: col + 2 },
          piece: "k",
        });
      }

      if (
        options.castlingRights[color].long &&
        kingsAreOnStartPosition &&
        // Nothing is attacked
        !isCellAttacked(gameState, { row: row, col: col - 0 }, color, true) &&
        !isCellAttacked(gameState, { row: row, col: col - 1 }, color, true) &&
        !isCellAttacked(gameState, { row: row, col: col - 2 }, color, true) &&
        // space to close rook is empty
        board[row][col - 1].length === 0 &&
        board[row][col - 2].length === 0
      ) {
        moves.push({
          type: "castle",
          from: pos,
          to: { row: row, col: col - 2 },
          piece: "k",
        });
      }

      break;
    }
  }

  // Filter out moves that result in check
  if (filterCheckMoves) {
    return moves.filter((move) => {
      const newBoard = applyMove({ board, options }, move);
      return !isInCheck(newBoard, color);
    });
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

function findKingPosition({ board }: GameState, color: PieceColor): Position {
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

  if (!kingPos)
    throw new Error("No king found on the board for the given color");

  return kingPos;
}

export function isInCheck(gameState: GameState, color: PieceColor): boolean {
  const kingPos = findKingPosition(gameState, color);

  // Check if any opponent piece can attack the king
  const opponentColor = otherColor(color);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = gameState.board[row][col];
      for (let pieceIndex = 0; pieceIndex < cell.length; pieceIndex++) {
        const piece = cell[pieceIndex];
        if (piece.color === opponentColor) {
          const moves = getPieceMoves(piece, { row, col }, gameState);
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

export function applyMove(gameState: GameState, move: Move): GameState {
  const newBoard = gameState.board.map((row) => row.map((cell) => [...cell]));

  const sourceCell = newBoard[move.from.row][move.from.col];
  const targetCell = newBoard[move.to.row][move.to.col];

  if (sourceCell.length === 0) {
    throw new Error("No piece found at source position");
  }

  if (move.piece.length === 2 && sourceCell.length !== 2) {
    throw new Error("Trying to move 2 pieces but source cell has only 1 piece");
  }

  if (move.type === "castle") {
    // short castle
    if (move.to.col === move.from.col + 2) {
      newBoard[move.to.row][move.to.col] = [sourceCell[0]];
      newBoard[move.to.row][move.to.col - 1] = [
        ...newBoard[move.to.row][move.to.col + 1],
      ];
      newBoard[move.to.row][move.to.col + 1] = [];
      newBoard[move.from.row][move.from.col] = [];

      return {
        board: newBoard,
        options: {
          ...gameState.options,
          castlingRights: {
            ...gameState.options.castlingRights,
            [sourceCell[0].color]: {
              short: false,
              long: false,
            },
          },
        },
      };
    }

    // long castle
    if (move.to.col === move.from.col - 2) {
      newBoard[move.to.row][move.to.col] = [sourceCell[0]];
      newBoard[move.to.row][move.to.col + 1] = [
        ...newBoard[move.to.row][move.to.col - 2],
      ];
      newBoard[move.to.row][move.to.col - 2] = [];
      newBoard[move.from.row][move.from.col] = [];

      return {
        board: newBoard,
        options: {
          ...gameState.options,
          castlingRights: {
            ...gameState.options.castlingRights,
            [sourceCell[0].color]: {
              short: false,
              long: false,
            },
          },
        },
      };
    }
  }

  let promotedPiece: Piece | null = null;
  // TODO: promotion can be undefined since applyMove is also called by other functions
  if (move.isPromotion && move.promotion) {
    // At least one piece should be a pawn
    if (
      !(sourceCell[0]?.pieceType === "p" || sourceCell[1]?.pieceType === "p")
    ) {
      throw new Error(
        `Trying to promote a piece that is not a pawn: ${sourceCell[0].pieceType} and ${sourceCell[1].pieceType}`,
      );
    }

    promotedPiece = {
      color: sourceCell[0].color,
      pieceType: move.promotion,
    };
  }

  // Basic move
  if (move.piece.length === 1) {
    if (
      sourceCell[0].pieceType !== move.piece &&
      sourceCell[1].pieceType !== move.piece
    ) {
      throw new Error("Trying to move a piece that is not in the source cell");
    }

    let pieceToMove = promotedPiece ?? sourceCell[0];

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

    // Move to empty cell
    if (targetCell.length === 0) {
      newBoard[move.to.row][move.to.col] = [pieceToMove];
      return {
        board: newBoard,
        options: {
          ...gameState.options,
          halfMoveClock: gameState.options.halfMoveClock + 1,
        },
      };
    }

    // Capture enemy piece/s
    if (targetCell[0].color !== pieceToMove.color) {
      newBoard[move.to.row][move.to.col] = [pieceToMove];
      return {
        board: newBoard,
        options: {
          ...gameState.options,
          halfMoveClock: 0,
        },
      };
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

    return {
      board: newBoard,
      options: {
        ...gameState.options,
        halfMoveClock: gameState.options.halfMoveClock + 1,
      },
    };
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

    newBoard[move.from.row][move.from.col] = [];

    const newCell = promotedPiece
      ? [promotedPiece]
      : [sourceCell[0], sourceCell[1]];

    // Move to empty cell
    if (targetCell.length === 0) {
      newBoard[move.to.row][move.to.col] = newCell;
      return {
        board: newBoard,
        options: {
          ...gameState.options,
          halfMoveClock: gameState.options.halfMoveClock + 1,
        },
      };
    }

    // Capture enemy piece/s
    if (targetCell[0].color !== sourceCell[0].color) {
      newBoard[move.to.row][move.to.col] = newCell;
      return {
        board: newBoard,
        options: {
          ...gameState.options,
          halfMoveClock: 0,
        },
      };
    }

    throw new Error("Trying to move 2 pieces to a cell with at least 1 piece");
  }

  throw new Error(`Invalid move type: ${JSON.stringify(move)}`);
}

function isCellAttacked(
  gameState: GameState,
  pos: Position,
  color: PieceColor,
  ignoreKingMoves: boolean = false,
): boolean {
  const opponentColor = otherColor(color);

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = gameState.board[row][col];
      for (const piece of cell) {
        if (piece.color === opponentColor) {
          const moves = getPieceMoves(piece, { row, col }, gameState, {
            filterCheckMoves: false,
            ignoreKingMoves,
          });
          if (
            moves.some(
              (move) => move.to.row === pos.row && move.to.col === pos.col,
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

function otherColor(color: PieceColor): PieceColor {
  return color === "w" ? "b" : "w";
}

/**
 * Check if there is any move that can be made so
 * that the king is not in check after the move
 */
export function canAnyMoveCombatCheck(
  gameState: GameState,
  color: PieceColor,
): boolean {
  // For each piece of the color, check if any move would combat the check
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = gameState.board[row][col];
      for (const piece of cell) {
        if (piece.color === color) {
          const moves = getPieceMoves(piece, { row, col }, gameState);

          for (const move of moves) {
            const newBoard = applyMove(gameState, move);
            const isCheck = isInCheck(newBoard, color);

            if (!isCheck) return true;
          }
        }
      }
    }
  }

  return false;
}

function shouldPromote(move: Move, gameState: GameState): boolean {
  const cell = gameState.board[move.from.row][move.from.col];

  const isPawn = cell[0]?.pieceType === "p" || cell[1]?.pieceType === "p";
  const isToLastRow =
    (cell[0]?.color === "w" && move.to.row === 0) ||
    (cell[0]?.color === "b" && move.to.row === 7);

  return isPawn && isToLastRow;
}

export function printMove(move: Move) {
  return {
    ...move,
    from: formatPosition(move.from),
    to: formatPosition(move.to),
  };
}

function equalPositions(pos1: Position, pos2: Position): boolean {
  return pos1.row === pos2.row && pos1.col === pos2.col;
}

// Helper functions for UI - simplified for new structure
export function getAllMovesForCell(
  pos: Position,
  gameState: GameState,
): Move[] {
  const moves: Move[] = [];
  const cell = gameState.board[pos.row][pos.col];
  const firstCellMoves = cell[0]
    ? getPieceMoves(cell[0], pos, gameState, {
        filterCheckMoves: true,
      })
    : [];

  const secondCellMoves = cell[1]
    ? getPieceMoves(cell[1], pos, gameState, {
        filterCheckMoves: true,
      })
    : [];

  moves.push(...firstCellMoves, ...secondCellMoves);

  if (cell.length === 2) {
    // @ts-expect-error Fix
    const pieceType: PieceType = cell[0].pieceType + cell[1].pieceType;

    const movesOnlyFromFirstPiece = firstCellMoves.filter((move) =>
      secondCellMoves.every(
        (secondMove) => !equalPositions(move.to, secondMove.to),
      ),
    );

    const movesOnlyFromSecondPiece = secondCellMoves.filter((move) =>
      firstCellMoves.every(
        (firstMove) => !equalPositions(move.to, firstMove.to),
      ),
    );

    // Check if a move to the same square is possible by both pieces
    const sameSquareMoves = firstCellMoves
      .map((move): Move | null => {
        const found = secondCellMoves.find((secondMove) =>
          equalPositions(move.to, secondMove.to),
        );

        if (!found) {
          return null;
        }

        const anyMoveIsMerge = move.type === "merge" || found.type === "merge";

        // Merge things like like type?
        // isPromotion?
        return {
          ...move,
          ...found,
          // Theoretically not possible to have castle
          type: anyMoveIsMerge ? "merge" : "base",
        };
      })
      .filter(notEmpty);

    console.log({
      movesOnlyFromFirstPiece: movesOnlyFromFirstPiece.map(printMove),
      movesOnlyFromSecondPiece: movesOnlyFromSecondPiece.map(printMove),
      sameSquareMoves: sameSquareMoves.map(printMove),
    });

    const allMoves: Move[] = [
      ...movesOnlyFromFirstPiece,
      ...movesOnlyFromSecondPiece,
      ...sameSquareMoves,
    ]
      .filter((move) => move !== null && move.type !== "merge")
      .map(
        (move): Move => ({
          ...move,
          piece: pieceType,
        }),
      );

    console.log({
      allMoves: allMoves.map(printMove),
    });

    moves.push(...allMoves);
  }

  return moves;
}

export function cleanStringBoard(str: string): string {
  return boardToString(stringToBoard(str));
}

/**
 * Similar to FEN notation
 * White are uppercase, black are lowercase
 */
export function boardToString(board: Board): string {
  return board
    .map((row) =>
      row
        .map((cell) => {
          if (cell.length === 0) {
            return ". ";
          }
          if (cell.length === 1) {
            const str = cell[0].pieceType + " ";
            if (cell[0].color === "w") {
              return str.toUpperCase();
            }
            return str;
          }
          if (cell.length === 2) {
            const str = cell[0].pieceType + cell[1].pieceType;
            if (cell[0].color === "w") {
              return str.toUpperCase();
            }
            return str;
          }
          throw new Error("Invalid board state");
        })
        .join(" "),
    )
    .join("\n");
}

function strToPieceType(str: string): PieceType {
  if (includes(PieceTypes, str)) {
    return str;
  }
  throw new Error(`Invalid piece type: ${str}`);
}

export function stringToBoard(string: string): Board {
  // It's fine if there are empty rows at beginning or end
  // this makes parsing easier in code when it's indented
  const realRows = string
    .split("\n")
    .map((row) => row.trim())
    .filter((row) => row.length > 0);

  const board = realRows.map((row) => {
    // given "r    n    br   .  k  b  n  r  "
    // remove multiple spaces, even between dots
    // and then split by spaces
    const trimmedRow = row.trim().replace(/\s+/g, " ");

    const cellRow = trimmedRow.split(" ").map((cell): Cell => {
      if (cell === ".") {
        return [];
      }

      const piece = cell.toLowerCase();
      const color = cell.toUpperCase() === cell ? "w" : "b";

      if (piece.length === 1) {
        return [{ color, pieceType: strToPieceType(piece) }];
      }

      // Don't care if there are more than 2 pieces in a cell
      return [
        { color, pieceType: strToPieceType(piece[0]) },
        { color, pieceType: strToPieceType(piece[1]) },
      ];
    });

    // if >8 or <8, make it return 8
    return cellRow.concat(Array(8).fill([])).slice(0, 8);
  });

  const { board: emptyBoard } = createEmptyBoard();

  const exactBoard = board.concat(emptyBoard).slice(0, 8);

  return exactBoard;
}

export function mapToName(piece: PieceType) {
  switch (piece) {
    case "k":
      return "King";
    case "q":
      return "Queen";
    case "r":
      return "Rook";
    case "b":
      return "Bishop";
    case "n":
      return "Knight";
    case "p":
      return "Pawn";
    default:
      piece satisfies never;
      return "Unknown";
  }
}

export const FEMN = {
  // rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR
  toFEMNBoard: (board: Board) => {
    return board
      .map((row) => {
        let str = "";
        let lastPiece = 0;

        row.forEach((cell) => {
          if (cell.length === 0) {
            lastPiece += 1;
            return;
          }

          if (lastPiece > 0) {
            str += lastPiece;
          }
          lastPiece = 0;

          if (cell.length === 1) {
            let piece: string = cell[0].pieceType;
            if (cell[0].color === "w") {
              piece = piece.toUpperCase();
            }
            str += piece;

            return;
          }

          if (cell.length === 2) {
            let piece = cell[0].pieceType + "+" + cell[1].pieceType;
            if (cell[0].color === "w") {
              piece = piece.toUpperCase();
            }
            str += piece;

            return;
          }
        });

        if (lastPiece > 0) {
          str += lastPiece;
        }

        return str;
      })
      .join("/");
  },

  fromFEMNBoard: (str: string): Board => {
    const rows = str.split("/");

    const board = rows.map((row) => {
      const cells = row.split("");

      //
      for (let i = 0; i < cells.length; i++) {
        if (cells[i] === "+") {
          cells[i] = cells[i - 1] + cells[i + 1];
          cells[i - 1] = "";
          cells[i + 1] = "";
        }
      }

      const filtered = cells.flatMap((strCell): Cell[] => {
        if (strCell === "") {
          return [];
        }

        // empty cells
        if (strCell.match(/[1-8]/)) {
          return Array(Number(strCell))
            .fill(".")
            .map(
              () =>
                // empty cell
                [] satisfies Cell,
            );
        }

        const piece = strCell.toLowerCase();
        const color = strCell.toUpperCase() === strCell ? "w" : "b";

        if (piece.length === 1) {
          return [[{ color, pieceType: strToPieceType(piece) }]];
        }

        // Don't care if there are more than 2 pieces in a cell
        return [
          [
            { color, pieceType: strToPieceType(piece[0]) },
            { color, pieceType: strToPieceType(piece[1]) },
          ],
        ];
      });

      // if >8 or <8, make it return 8
      return filtered.concat(Array(8).fill([])).slice(0, 8);
    });

    const { board: emptyBoard } = createEmptyBoard();

    const exactBoard = board.concat(emptyBoard).slice(0, 8);

    return exactBoard;
  },

  // "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  toFEMNGame: (gameState: GameState, joiner: string = " ") => {
    const boardStr = FEMN.toFEMNBoard(gameState.board);

    const castlingRightsStr = [
      gameState.options.castlingRights.w.short ? "K" : "",
      gameState.options.castlingRights.w.long ? "Q" : "",
      gameState.options.castlingRights.b.short ? "k" : "",
      gameState.options.castlingRights.b.long ? "q" : "",
    ].join("");

    return [
      boardStr,
      gameState.options.turn === "w" ? "w" : "b",
      castlingRightsStr,
      gameState.options.enPassantTarget
        ? formatPosition(gameState.options.enPassantTarget)
        : "-",
      gameState.options.halfMoveClock,
      gameState.options.fullMoveClock,
    ].join(joiner);
  },

  // allows " " or "_"
  fromFEMNGame: (str: string, joiner: string = " "): GameState => {
    const [
      boardStr,
      turn,
      castlingRights,
      enPassantTarget,
      halfMoveClock,
      fullMoveClock,
    ] = str.split(joiner);

    return {
      board: FEMN.fromFEMNBoard(boardStr),
      options: {
        turn: turn === "w" ? "w" : "b",
        enPassantTarget:
          enPassantTarget === "-"
            ? null
            : // @ts-expect-error Figure out
              parsePosition(enPassantTarget),
        castlingRights: {
          w: {
            short: castlingRights.includes("K"),
            long: castlingRights.includes("Q"),
          },
          b: {
            short: castlingRights.includes("k"),
            long: castlingRights.includes("q"),
          },
        },
        halfMoveClock: Number(halfMoveClock),
        fullMoveClock: Number(fullMoveClock),
      },
    };
  },
};
