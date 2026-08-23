import type { GameState } from "lib/chessmerge";
import type { FunctionReturnType } from "convex/server";
import { useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";

type GameView = NonNullable<FunctionReturnType<typeof api.gameLogic.getGame>>;

interface GameInfoProps {
  game: GameView;
  gameState: GameState;
  onResign?: () => Promise<void>;
  playerColor: "w" | "b" | null;
}

export function GameInfo({
  game,
  gameState,
  onResign,
  playerColor,
}: GameInfoProps) {
  const [showResign, setShowResign] = useState(false);
  const [isResigning, setIsResigning] = useState(false);
  const [resignError, setResignError] = useState<string | null>(null);
  const resignButton = useRef<HTMLButtonElement>(null);

  const confirmResign = async () => {
    if (!onResign || isResigning) return;

    setIsResigning(true);
    setResignError(null);
    try {
      await onResign();
      setShowResign(false);
    } catch {
      setResignError("Could not resign. Try again.");
    } finally {
      setIsResigning(false);
    }
  };

  const getStatusText = () => {
    if (game.status === "active") {
      if (playerColor === null) {
        return gameState.options.turn === "w"
          ? "White to move"
          : "Black to move";
      }
      return gameState.options.turn === playerColor
        ? "Your turn"
        : "Opponent's turn";
    }

    if (game.winner === "draw") return "Game ended in a draw";
    const winnerText = game.winner === "w" ? "White" : "Black";
    if (playerColor === null) return `${winnerText} wins`;
    const youWon = game.winner === playerColor;
    return `${winnerText} wins! ${youWon ? "You won!" : "You lost."}`;
  };

  const getStatusColor = () => {
    if (game.status === "completed") {
      if (game.winner === "draw") return "text-yellow-600";
      if (playerColor === null) return "text-gray-900";
      const youWon = game.winner === playerColor;
      return youWon ? "text-primary-600" : "text-destructive-600";
    }
    return "text-blue-600";
  };

  const getPlayerText = () => {
    if (playerColor === null) return "Spectator";
    return playerColor === "w" ? "White" : "Black";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="font-semibold mb-3">Game Info</h3>

      <div className="space-y-2 text-sm">
        <PlayerRow
          color="White"
          name={game.players.white.name}
          isGuest={game.players.white.isGuest}
          isYou={playerColor === "w"}
        />
        <PlayerRow
          color="Black"
          name={game.players.black.name}
          isGuest={game.players.black.isGuest}
          isYou={playerColor === "b"}
        />

        <div className="my-3 border-t" />

        <div
          className="flex justify-between"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="text-gray-600">Status:</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {playerColor !== null && (
          <div className="flex justify-between">
            <span className="text-gray-600">You are:</span>
            <span className="font-medium">{getPlayerText()}</span>
          </div>
        )}

        {game.status === "active" && playerColor !== null && (
          <div className="flex justify-between">
            <span className="text-gray-600">Current turn:</span>
            <span className="font-medium">
              {gameState.options.turn === "w" ? "White" : "Black"}
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-gray-600">Moves:</span>
          <span className="font-medium">{game.moveCount}</span>
        </div>

        {game.status === "completed" && (
          <div className="flex justify-between">
            <span className="text-gray-600">End reason:</span>
            <span className="font-medium capitalize">
              {game.gameEndReason.replace("_", " ")}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t">
        <div className="text-xs text-gray-500">
          Game ID: {game._id.slice(-8)}
        </div>
        <div className="text-xs text-gray-500">
          {game.status === "completed" ? "Ended" : "Last move"}:{" "}
          {new Date(game.lastMoveAt).toLocaleTimeString()}
        </div>
      </div>

      {game.status === "active" && playerColor !== null && onResign ? (
        <div className="mt-4 border-t pt-3">
          {showResign ? (
            <div className="rounded-lg border border-destructive/35 bg-destructive/5 p-3">
              <p className="text-sm text-destructive">
                Resign this game? Your opponent will win.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  autoFocus
                  disabled={isResigning}
                  onClick={() => {
                    setShowResign(false);
                    setResignError(null);
                    window.requestAnimationFrame(() =>
                      resignButton.current?.focus(),
                    );
                  }}
                >
                  Keep playing
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isResigning}
                  onClick={() => void confirmResign()}
                >
                  {isResigning ? "Resigning…" : "Resign game"}
                </Button>
              </div>
              {resignError ? (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {resignError}
                </p>
              ) : null}
            </div>
          ) : (
            <Button
              ref={resignButton}
              type="button"
              variant="ghost"
              className="h-auto px-0 py-1 text-destructive hover:bg-transparent hover:text-destructive"
              onClick={() => setShowResign(true)}
            >
              Resign game
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function PlayerRow({
  color,
  isGuest,
  isYou,
  name,
}: {
  color: "White" | "Black";
  isGuest: boolean;
  isYou: boolean;
  name: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-600">{color}</span>
      <span className="min-w-0 truncate font-medium" title={name}>
        {name}
        {isYou ? " (you)" : isGuest ? " (guest)" : ""}
      </span>
    </div>
  );
}
