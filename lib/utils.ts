// Shared utility functions that can be used by both frontend and backend

// Example: Chess-related utilities
export function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function algebraicToPosition(
  algebraic: string,
): { row: number; col: number } | null {
  if (algebraic.length !== 2) return null;

  const col = algebraic.charCodeAt(0) - 97; // a-h to 0-7
  const row = 8 - parseInt(algebraic[1]); // 1-8 to 7-0

  if (!isValidPosition(row, col)) return null;

  return { row, col };
}

export function positionToAlgebraic(row: number, col: number): string {
  if (!isValidPosition(row, col)) throw new Error("Invalid position");

  const colChar = String.fromCharCode(97 + col); // 0-7 to a-h
  const rowChar = String(8 - row); // 7-0 to 1-8

  return colChar + rowChar;
}

// Example: Validation utilities
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Example: Game constants
export const BOARD_SIZE = 8;
export const MAX_GAME_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

// Example: Type guards
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}
