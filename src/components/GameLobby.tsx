import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface GameLobbyProps {
  onJoinGame: (gameId: Id<"games">) => void;
}

export function GameLobby({ onJoinGame }: GameLobbyProps) {
  const myGames = useQuery(api.gameLogic.listGames) || [];
  const waitingGames = useQuery(api.gameLogic.getWaitingGames) || [];
  const createGame = useMutation(api.gameLogic.createGame);
  const joinGame = useMutation(api.gameLogic.joinGame);

  const handleCreateGame = async () => {
    try {
      const gameId = await createGame();
      onJoinGame(gameId);
      toast.success("Game created! Waiting for opponent...");
    } catch (error) {
      toast.error("Failed to create game");
    }
  };

  const handleJoinGame = async (gameId: Id<"games">) => {
    try {
      await joinGame({ gameId });
      onJoinGame(gameId);
      toast.success("Joined game!");
    } catch (error) {
      toast.error("Failed to join game");
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Game Lobby</h1>
        <p className="text-gray-600 mb-6">
          Welcome to ChessMerge! Create a new game or join an existing one.
        </p>
        
        <button
          onClick={handleCreateGame}
          className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-sm hover:shadow"
        >
          Create New Game
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* My Games */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">My Games</h2>
          {myGames.length === 0 ? (
            <p className="text-gray-500">No games yet. Create one to get started!</p>
          ) : (
            <div className="space-y-3">
              {myGames.map((game) => (
                <div
                  key={game._id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => onJoinGame(game._id)}
                >
                  <div>
                    <div className="font-medium">
                      {game.status === "waiting" ? "Waiting for opponent" : 
                       game.status === "active" ? "Active game" : "Completed"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(game.lastMoveAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      game.status === "waiting" ? "bg-yellow-100 text-yellow-800" :
                      game.status === "active" ? "bg-green-100 text-green-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {game.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Games */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Available Games</h2>
          {waitingGames.length === 0 ? (
            <p className="text-gray-500">No games waiting for players.</p>
          ) : (
            <div className="space-y-3">
              {waitingGames.map((game) => (
                <div
                  key={game._id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium">Waiting for opponent</div>
                    <div className="text-sm text-gray-500">
                      Created {new Date(game._creationTime).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinGame(game._id)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Game Rules */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4">ChessMerge Rules</h2>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="font-medium mb-2">Basic Rules</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Standard chess rules apply</li>
              <li>• Same win conditions (checkmate, stalemate)</li>
              <li>• Kings cannot be merged</li>
              <li>• Merged pieces move like both constituent pieces</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Merge Mechanics</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Merge two adjacent pieces of same color</li>
              <li>• Unmerge back to original pieces</li>
              <li>• Merged pieces cannot merge again</li>
              <li>• Unmerge requires adjacent empty square</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
