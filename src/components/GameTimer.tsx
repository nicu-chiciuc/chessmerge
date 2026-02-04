import { useEffect, useState } from "react";
import { Doc } from "../../convex/_generated/dataModel";

interface GameTimerProps {
  game: Doc<"games">;
  currentTurn: "w" | "b";
}

/**
 * Calculate remaining time for a player based on move timestamps
 */
function calculateRemainingTime(
  game: Doc<"games">,
  player: "w" | "b",
  now: number,
): number {
  const timeControl = game.timeControl;
  if (!timeControl) {
    return Infinity; // No time control
  }

  // If game ended due to timeout, show 0 for the timed-out player
  if (game.status === "completed" && game.gameEndReason === "timeout") {
    const moveCount = (game.moveTimestamps || []).length;
    const timedOutTurn = moveCount % 2 === 0 ? "w" : "b";
    // The player whose turn it was when timeout occurred has 0 time
    if (timedOutTurn === player) {
      return 0;
    }
  }

  const { initialTimeMs, incrementMs } = timeControl;
  const timestamps = game.moveTimestamps || [];
  const moveCount = timestamps.length;
  const gameStartedAt = game.gameStartedAt;

  // Calculate time spent on completed moves
  let timeSpent = 0;
  let movesCompleted = 0;

  for (let i = 0; i < moveCount; i++) {
    const isWhiteMove = i % 2 === 0;
    if ((player === "w" && isWhiteMove) || (player === "b" && !isWhiteMove)) {
      let moveDuration: number;

      if (i === 0) {
        // First move (white's) - use gameStartedAt
        moveDuration = timestamps[0] - gameStartedAt;
      } else {
        moveDuration = timestamps[i] - timestamps[i - 1];
      }

      timeSpent += moveDuration;
      movesCompleted++;
    }
  }

  // Add increment for completed moves
  const totalIncrement = movesCompleted * incrementMs;

  // Calculate live elapsed time only for active games
  const currentTurn = moveCount % 2 === 0 ? "w" : "b";
  let liveElapsed = 0;

  if (currentTurn === player && game.status === "active") {
    const turnStartTime =
      moveCount === 0 ? gameStartedAt : timestamps[moveCount - 1];
    liveElapsed = now - turnStartTime;
  }
  // For completed games, no live elapsed time - timer is frozen at game end

  return Math.max(0, initialTimeMs + totalIncrement - timeSpent - liveElapsed);
}

/**
 * Format milliseconds as MM:SS.s
 */
function formatTime(ms: number): string {
  if (ms === Infinity) return "∞";

  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);

  if (minutes >= 10) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}.${tenths}`;
}

export function GameTimer({ game, currentTurn }: GameTimerProps) {
  const [now, setNow] = useState(Date.now());

  // Update timer every 100ms for smooth countdown
  useEffect(() => {
    if (game.status !== "active") {
      // When game ends, reset now to lastMoveAt to prevent recalculation issues
      setNow(game.lastMoveAt);
      return;
    }

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, [game.status, game.lastMoveAt]);

  // Don't show timer if no time control
  if (!game.timeControl) {
    return null;
  }

  // For completed games, use lastMoveAt to prevent recalculation
  // For active games, use live now value
  const timeReference = game.status === "active" ? now : game.lastMoveAt;
  const whiteTime = calculateRemainingTime(game, "w", timeReference);
  const blackTime = calculateRemainingTime(game, "b", timeReference);

  const isWhiteTurn = currentTurn === "w";
  const isBlackTurn = currentTurn === "b";

  const isWhiteLow = whiteTime < 30000; // Less than 30 seconds
  const isBlackLow = blackTime < 30000;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="font-semibold mb-3 text-center">Time</h3>

      <div className="space-y-3">
        {/* Black timer (top) */}
        <div
          className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
            isBlackTurn && game.status === "active"
              ? isBlackLow
                ? "bg-red-100 border-2 border-red-400"
                : "bg-gray-800 text-white"
              : "bg-gray-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-800 border border-gray-600" />
            <span
              className={`font-medium ${isBlackTurn && game.status === "active" ? "text-white" : ""}`}
            >
              Black
            </span>
          </div>
          <span
            className={`font-mono text-xl font-bold ${
              isBlackLow && game.status === "active" ? "text-red-600" : ""
            } ${isBlackTurn && game.status === "active" && !isBlackLow ? "text-white" : ""}`}
          >
            {formatTime(blackTime)}
          </span>
        </div>

        {/* White timer (bottom) */}
        <div
          className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
            isWhiteTurn && game.status === "active"
              ? isWhiteLow
                ? "bg-red-100 border-2 border-red-400"
                : "bg-amber-100 border-2 border-amber-400"
              : "bg-gray-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-400" />
            <span className="font-medium">White</span>
          </div>
          <span
            className={`font-mono text-xl font-bold ${
              isWhiteLow && game.status === "active" ? "text-red-600" : ""
            }`}
          >
            {formatTime(whiteTime)}
          </span>
        </div>
      </div>

      {/* Time control info */}
      <div className="mt-3 pt-2 border-t text-center text-xs text-gray-500">
        {Math.floor(game.timeControl.initialTimeMs / 60000)}+
        {Math.floor(game.timeControl.incrementMs / 1000)}
      </div>
    </div>
  );
}
