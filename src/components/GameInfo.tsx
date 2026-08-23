import type { GameState } from "lib/chessmerge";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";

type GameView = NonNullable<FunctionReturnType<typeof api.gameLogic.getGame>>;

interface GameInfoProps {
  game: GameView;
  gameState: GameState;
  playerColor: "w" | "b" | null;
}

export function GameInfo({ game, gameState, playerColor }: GameInfoProps) {
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

        <div className="flex justify-between">
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
          Last move: {new Date(game.lastMoveAt).toLocaleTimeString()}
        </div>
      </div>
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
