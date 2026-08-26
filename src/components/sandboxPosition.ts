import {
  FEMN,
  createInitialGameState,
  stringToBoard,
} from "../../lib/chessmerge";
import type { GameState } from "../../lib/chessmerge";

export type SandboxPositionResult =
  | {
      kind: "valid";
      gameState: GameState;
    }
  | {
      kind: "invalid";
      message: string;
    };

const fullPositionPattern =
  /^(\S+)[ _]+([wb])[ _]+([KQkq-]*)[ _]+(-)[ _]+(\d+)[ _]+(\d+)$/;
const piecePattern = /^[prnbqk]$/i;
const defaultSerializedPosition = formatPosition(createInitialGameState(), "_");

export function parseSandboxPosition(input: string): SandboxPositionResult {
  const match = input.trim().match(fullPositionPattern);

  if (!match) {
    return invalidPosition(
      "Enter a full FEMN position with a board, turn, castling rights, and move counts.",
    );
  }

  const [, boardField, turn, castlingRights, , halfMove, fullMove] = match;
  const boardError = validateBoardField(boardField);

  if (boardError) {
    return invalidPosition(boardError);
  }

  if (castlingRights !== "-" && !/^(?:K?Q?k?q?)$/.test(castlingRights)) {
    return invalidPosition(
      "List castling rights once in KQkq order, or use - for none.",
    );
  }

  const halfMoveClock = Number(halfMove);
  const fullMoveClock = Number(fullMove);

  if (!Number.isSafeInteger(halfMoveClock)) {
    return invalidPosition("The half-move count is too large.");
  }

  if (!Number.isSafeInteger(fullMoveClock) || fullMoveClock < 1) {
    return invalidPosition("The full-move count must be 1 or greater.");
  }

  try {
    const gameState = FEMN.fromFEMNGame(
      [boardField, turn, castlingRights, "-", halfMove, fullMove].join(" "),
    );

    return { kind: "valid", gameState };
  } catch {
    return invalidPosition("This FEMN position contains an unknown piece.");
  }
}

export function parseEditableSandboxPosition(
  input: string,
): SandboxPositionResult {
  const match = input
    .trim()
    .match(/^(\S+)[ _]+([wb])[ _]+(\S+)[ _]+(\S+)[ _]+(\d+)[ _]+(\d+)$/);

  if (!match) {
    return invalidPosition(
      "Enter a full FEMN position with a board, turn, castling rights, and move counts.",
    );
  }

  const [, boardField, turn, castlingRights, enPassant, halfMove, fullMove] =
    match;
  const halfMoveClock = Number(halfMove);
  const fullMoveClock = Number(fullMove);

  if (
    !Number.isSafeInteger(halfMoveClock) ||
    !Number.isSafeInteger(fullMoveClock) ||
    fullMoveClock < 1
  ) {
    return invalidPosition("Enter valid move counts.");
  }

  try {
    return {
      kind: "valid",
      gameState: FEMN.fromFEMNGame(
        [boardField, turn, castlingRights, enPassant, halfMove, fullMove].join(
          " ",
        ),
      ),
    };
  } catch {
    return invalidPosition("This FEMN position contains an unknown piece.");
  }
}

export function parseSandboxBoard(
  input: string,
  currentGameState: GameState,
): SandboxPositionResult {
  try {
    return {
      kind: "valid",
      gameState: {
        ...currentGameState,
        board: stringToBoard(input),
      },
    };
  } catch {
    return invalidPosition(
      "The board contains an unknown piece. Use ., p, r, n, b, q, or k.",
    );
  }
}

export function formatSandboxPosition(gameState: GameState): string {
  return formatPosition(gameState, " ");
}

export function serializeSandboxPosition(gameState: GameState): string {
  return formatPosition(gameState, "_");
}

export function isDefaultSandboxPosition(gameState: GameState): boolean {
  return serializeSandboxPosition(gameState) === defaultSerializedPosition;
}

function formatPosition(gameState: GameState, joiner: " " | "_"): string {
  const { options } = gameState;
  const castlingRights = [
    options.castlingRights.w.short ? "K" : "",
    options.castlingRights.w.long ? "Q" : "",
    options.castlingRights.b.short ? "k" : "",
    options.castlingRights.b.long ? "q" : "",
  ].join("");

  return [
    FEMN.toFEMNBoard(gameState.board),
    options.turn,
    castlingRights || "-",
    "-",
    options.halfMoveClock,
    options.fullMoveClock,
  ].join(joiner);
}

function validateBoardField(boardField: string): string | null {
  const rows = boardField.split("/");

  if (rows.length !== 8) {
    return "The board must contain exactly 8 ranks.";
  }

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const rowError = validateBoardRow(rows[rowIndex], 8 - rowIndex);

    if (rowError) {
      return rowError;
    }
  }

  return null;
}

function validateBoardRow(row: string, rank: number): string | null {
  let squareCount = 0;

  for (let index = 0; index < row.length; index += 1) {
    const symbol = row[index];

    if (/^[1-8]$/.test(symbol)) {
      squareCount += Number(symbol);
      continue;
    }

    if (!piecePattern.test(symbol)) {
      return `Rank ${rank} contains an unknown piece or separator.`;
    }

    squareCount += 1;

    if (row[index + 1] !== ":") {
      continue;
    }

    const mergedPiece = row[index + 2];

    if (!mergedPiece || !piecePattern.test(mergedPiece)) {
      return `Rank ${rank} has an incomplete merged piece.`;
    }

    index += 2;
  }

  if (squareCount !== 8) {
    return `Rank ${rank} must describe exactly 8 squares.`;
  }

  return null;
}

function invalidPosition(message: string): SandboxPositionResult {
  return { kind: "invalid", message };
}
