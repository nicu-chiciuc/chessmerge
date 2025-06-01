// Shared types that can be used by both frontend and backend

export interface GameMove {
  from: { row: number; col: number };
  to: { row: number; col: number };
  algebraic?: string;
  timestamp: number;
}

export interface GameState {
  status: "waiting" | "active" | "completed" | "abandoned";
  currentTurn: "white" | "black";
  winner?: "white" | "black" | "draw";
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  rating?: number;
}

// Example of validation schemas that can be shared
export interface CreateGameRequest {
  timeControl?: {
    initial: number; // seconds
    increment: number; // seconds
  };
  isRated?: boolean;
}

export interface JoinGameRequest {
  gameId: string;
}
