import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { EmailSubscribe } from "./EmailSubscribe";
import { Button } from "@/components/ui/button";

interface GameLobbyProps {
  onJoinGame: (gameId: Id<"games">) => void;
}

export function GameLobby({ onJoinGame }: GameLobbyProps) {
  const myGames = useQuery(api.gameLogic.listGames) || [];
  const waitingGames = useQuery(api.gameLogic.getWaitingGames) || [];
  const createGame = useMutation(api.gameLogic.createGame);
  const createPracticeGame = useMutation(api.gameLogic.createPracticeGame);
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

  const handleCreatePracticeGame = async () => {
    try {
      const gameId = await createPracticeGame();
      onJoinGame(gameId);
      toast.success("Practice game started! You can play both sides.");
    } catch (error) {
      toast.error("Failed to create practice game");
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
          Welcome to ChessMerge! Create a new game, practice, or join an
          existing one.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Button
            onClick={() => void handleCreateGame()}
            size="lg"
            className="px-6 py-3"
          >
            Create New Game
          </Button>
          <Button
            onClick={() => void handleCreatePracticeGame()}
            variant="secondary"
            size="lg"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white"
          >
            Practice Game
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* My Games */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">My Games</h2>
          {myGames.length === 0 ? (
            <p className="text-gray-500">
              No games yet. Create one to get started!
            </p>
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
                      {game.isPracticeGame
                        ? "Practice Game"
                        : game.status === "waiting"
                          ? "Waiting for opponent"
                          : game.status === "active"
                            ? "Active game"
                            : "Completed"}

                      <span className="text-gray-500">
                        {" "}
                        ({game._id.slice(0, 6)})
                      </span>
                    </div>

                    <div className="text-sm text-gray-500">
                      {new Date(game.lastMoveAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {game.isPracticeGame && (
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                        Practice
                      </span>
                    )}
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        game.status === "waiting"
                          ? "bg-yellow-100 text-yellow-800"
                          : game.status === "active"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
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
                      Created{" "}
                      {new Date(game._creationTime).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    onClick={() => void handleJoinGame(game._id)}
                    size="sm"
                  >
                    Join
                  </Button>
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
              <li>• But pieces can merge or unmerge</li>
              <li>• Merged pieces can move as both types of pieces</li>
              <li>
                • One of the pieces can split at any time, that also means that
                it can split from one piece then merge into another one in the
                same move
              </li>
              <li>
                • Merged pieces can be promoted if it contains a pawn, be
                careful, this replaces both pieces.
              </li>
              <li>
                • (🚫 Not implemented) You can choose what to promote to (except
                pawn and rook, just like in chess)
              </li>

              <li>• If the king and rook didn't move they can castle. </li>
              <li>
                • A piece (e.g. a bishop) can move into the rook and move
                somewhere else, that still means that the rook didn't move and
                still can castle.
              </li>

              <li>
                • (🚫 Not implemented) When castling and the rook is merged with
                some other piece, you can choose whether you castle with just
                the rook (by unmerging it), or with the merged piece.
              </li>

              <li>
                • (🚫 Not implemented) En passant can be done both by a pawn or
                a merged piece that contains a pawn.
              </li>

              <li>
                • (❓ Not sure) Since pawn can get to their back rank (e.g.
                white pawn to row 1), it's not clear if they still can do the
                double move.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Email Subscription */}
      <div className="max-w-md mx-auto">
        <EmailSubscribe />
      </div>
    </div>
  );
}
