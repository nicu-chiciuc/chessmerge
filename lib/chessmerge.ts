// Piece types and colors
export type PieceType = "p" | "r" | "n" | "b" | "q" | "k";
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

  capturedPieces?: Piece[]; // Pieces captured at destination
}

// Board where each cell can contain 0-2 pieces of the same color
export type Board = Piece[][][];

// A better name
export type GameState = {
  board: Board;
  options: Options;
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
      enPassantTarget: undefined,
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
      enPassantTarget: undefined,
    },
  };
}

// Check if position is valid
export function isValidPosition(pos: Position): boolean {
  return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
}

// Get piece moves for a specific piece at a position
export function getPieceMoves(
  piece: Piece,
  pos: Position,
  gameState: GameState,
  filterCheckMoves: boolean = false,
): Move[] {
  return getSinglePieceMoves(
    piece.pieceType,
    piece.color,
    pos,
    gameState,
    filterCheckMoves,
  );
}

// Similar to Forsyth–Edwards Notation
type Options = {
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
  enPassantTarget?: Position;
  halfMoveClock: number;
};

function getSinglePieceMoves(
  type: PieceType,
  color: PieceColor,
  pos: Position,
  { board, options }: GameState,
  filterCheckMoves: boolean = false,
): Move[] {
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
        isValidPosition({ row: row + direction, col }) &&
        isEmptyOrSameCanMerge(board[row + direction][col])
      ) {
        moves.push({
          from: pos,
          to: { row: row + direction, col },
          piece: "p",
          type: board[row + direction][col].length === 1 ? "merge" : "base",
        });

        // Double move from start
        if (
          row === startRow &&
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
          if (!isValidPosition(newPos)) break;

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
        if (isValidPosition(newPos)) {
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
          if (!isValidPosition(newPos)) break;

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

      const kingMovedPreviously = false; // TODO: Implement this
      const closeRookMovedPreviously = false; // TODO: Implement this
      const farRookMovedPreviously = false; // TODO: Implement this
      const spaceEmptyToCloseRook = false; // TODO: Implement this
      const spaceToCloseRookNotInCheck = false; // TODO: Implement this

      if (
        options.castlingRights[color].short &&
        !kingMovedPreviously &&
        !closeRookMovedPreviously &&
        spaceEmptyToCloseRook &&
        spaceToCloseRookNotInCheck
      ) {
        moves.push({
          type: "castle",
          from: pos,
          to: { row: row + 2, col: col },
          piece: "k",
          capturedPieces: [],
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

    // Move to empty cell
    if (targetCell.length === 0) {
      newBoard[move.to.row][move.to.col] = [sourceCell[0], sourceCell[1]];
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
      newBoard[move.to.row][move.to.col] = [sourceCell[0], sourceCell[1]];
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

  return {
    board: newBoard,
    options: {
      ...gameState.options,
      halfMoveClock: gameState.options.halfMoveClock + 1,
    },
  };
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

// Helper functions for UI - simplified for new structure
export function getAllMovesForCell(
  pos: Position,
  gameState: GameState,
): Move[] {
  const moves: Move[] = [];
  const cell = gameState.board[pos.row][pos.col];

  // Get moves for each piece in the cell
  for (let pieceIndex = 0; pieceIndex < cell.length; pieceIndex++) {
    const piece = cell[pieceIndex];
    const pieceMoves = getPieceMoves(piece, pos, gameState, true);
    moves.push(...pieceMoves);
  }

  if (cell.length === 2) {
    // filter out moves that would merge with the target cell
    return moves.filter((move) => move.type !== "merge");
  }

  return moves;
}

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
