import { Doc } from "../../convex/_generated/dataModel";

interface GameInfoProps {
  game: Doc<"games">;
  isWhitePlayer: boolean;
  isBlackPlayer: boolean;
}

export function GameInfo({
  game,
  isWhitePlayer,
  isBlackPlayer,
}: GameInfoProps) {
  const getStatusText = () => {
    if (game.isPracticeGame) {
      switch (game.status) {
        case "active":
          return `${game.currentTurn === "w" ? "White" : "Black"}'s turn`;
        case "completed": {
          if (game.winner === "draw") {
            return "Practice game ended in a draw";
          }
          const winnerText = game.winner === "w" ? "White" : "Black";
          return `Practice game complete - ${winnerText} wins!`;
        }
        default:
          return "Practice game";
      }
    }

    switch (game.status) {
      case "waiting":
        return "Waiting for opponent";
      case "active": {
        if (game.currentTurn === "w") {
          return isWhitePlayer ? "Your turn" : "Opponent's turn";
        } else {
          return isBlackPlayer ? "Your turn" : "Opponent's turn";
        }
      }
      case "completed": {
        if (game.winner === "draw") {
          return "Game ended in a draw";
        }
        const winnerText = game.winner === "w" ? "White" : "Black";
        const youWon =
          (game.winner === "w" && isWhitePlayer) ||
          (game.winner === "b" && isBlackPlayer);
        return `${winnerText} wins! ${youWon ? "You won!" : "You lost."}`;
      }
      default:
        return "Unknown status";
    }
  };

  const getStatusColor = () => {
    if (game.status === "completed") {
      if (game.winner === "draw") return "text-yellow-600";
      if (game.isPracticeGame) return "text-blue-600"; // Neutral color for practice games
      const youWon =
        (game.winner === "w" && isWhitePlayer) ||
        (game.winner === "b" && isBlackPlayer);
      return youWon ? "text-primary-600" : "text-destructive-600";
    }
    return "text-blue-600";
  };

  const getPlayerText = () => {
    if (game.isPracticeGame) {
      return "Both sides (Practice)";
    }
    return isWhitePlayer ? "White" : isBlackPlayer ? "Black" : "Spectator";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <h3 className="font-semibold mb-3">
        {game.isPracticeGame ? "Practice Game" : "Game Info"}
      </h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <span className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">You are:</span>
          <span className="font-medium">{getPlayerText()}</span>
        </div>

        {game.status === "active" && (
          <div className="flex justify-between">
            <span className="text-gray-600">Current turn:</span>
            <span className="font-medium capitalize">{game.currentTurn}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-gray-600">Moves:</span>
          <span className="font-medium">
            {Math.floor(game.moveHistory.length / 2) + 1}
          </span>
        </div>

        {game.status === "completed" && game.gameEndReason && (
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
