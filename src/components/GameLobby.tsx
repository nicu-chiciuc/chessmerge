import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { EmailSubscribe } from "./EmailSubscribe";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

interface GameLobbyProps {
  onJoinGame: (gameId: Id<"games">) => void;
  isAuthenticated?: boolean;
}

export function GameLobby({
  onJoinGame,
  isAuthenticated = false,
}: GameLobbyProps) {
  const myGames = useQuery(api.gameLogic.listGames) || [];
  const waitingGames = useQuery(api.gameLogic.getWaitingGames) || [];
  const createPracticeGame = useMutation(api.gameLogic.createPracticeGame);
  const joinGame = useMutation(api.gameLogic.joinGame);
  const navigate = useNavigate();

  const handleCreateGame = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to create games");
      void navigate("/login");
      return;
    }
    void navigate("/new");
  };

  const handleCreatePracticeGame = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to create practice games");
      void navigate("/login");
      return;
    }
    try {
      const gameId = await createPracticeGame();
      onJoinGame(gameId);
      toast.success("Practice game started! You can play both sides.");
    } catch {
      toast.error("Failed to create practice game");
    }
  };

  const handleJoinGame = async (gameId: Id<"games">) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to join games");
      void navigate("/login");
      return;
    }
    try {
      await joinGame({ gameId });
      onJoinGame(gameId);
      toast.success("Joined game!");
    } catch {
      toast.error("Failed to join game");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Game Lobby</h1>
        <p className="text-gray-600 mb-6">
          Welcome to ChessMerge!{" "}
          {isAuthenticated
            ? "Create a new game, practice, or join an existing one."
            : "Try local practice or sign in to play online games."}
        </p>

        {!isAuthenticated && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
            <p className="text-blue-800 text-sm">
              You're browsing as a guest. Sign in to create and join online
              games!
            </p>
          </div>
        )}

        <div className="flex gap-4 justify-center flex-wrap">
          <Button
            onClick={handleCreateGame}
            size="lg"
            className="px-6 py-3"
            disabled={!isAuthenticated}
          >
            Create New Game
          </Button>

          {
            // Only in dev
            import.meta.env.DEV && (
              <Button
                onClick={() => void handleCreatePracticeGame()}
                variant="secondary"
                size="lg"
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white"
                disabled={!isAuthenticated}
              >
                Practice Game
              </Button>
            )
          }

          <Button
            onClick={() => void navigate("/practice")}
            variant="secondary"
            size="lg"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white"
          >
            Local Practice
          </Button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Games Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Games */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">My Games</h2>
            {!isAuthenticated ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Sign in to see your games</p>
                <Button variant="outline" onClick={() => void navigate("/login")}>
                  Sign In
                </Button>
              </div>
            ) : myGames.length === 0 ? (
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
                      <div className="font-medium">
                        {isAuthenticated
                          ? "Waiting for opponent"
                          : "Game available (spectate only)"}
                      </div>
                      <div className="text-sm text-gray-500">
                        Created{" "}
                        {new Date(game._creationTime).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      onClick={() =>
                        void (isAuthenticated
                          ? handleJoinGame(game._id)
                          : onJoinGame(game._id))
                      }
                      size="sm"
                    >
                      {isAuthenticated ? "Join" : "Spectate"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Email Subscription */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6 sticky top-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Stay Updated</h3>
            <p className="text-sm text-gray-600 mb-4">
              Get the latest ChessMerge news and updates delivered to your inbox.
            </p>
            <EmailSubscribe />
          </div>
        </div>
      </div>

      {/* Game Rules Accordion */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <Accordion.Root type="single" collapsible className="w-full">
          <Accordion.Item value="rules" className="border-none group">
            <Accordion.Trigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group-data-[state=open]:bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900">ChessMerge Rules</h2>
              <ChevronDown className="h-5 w-5 text-gray-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Accordion.Trigger>
            <Accordion.Content className="px-6 pb-4 border-t pt-4">
              <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h3 className="font-medium mb-2">Basic Rules</h3>
                  <ul className="space-y-1 text-gray-600">
                    <li>* Standard chess rules apply</li>
                    <li>* But pieces can merge or unmerge</li>
                    <li>* Merged pieces can move as both types of pieces</li>
                    <li>
                      * One of the pieces can split at any time, that also means that
                      it can split from one piece then merge into another one in the
                      same move
                    </li>
                    <li>
                      * Merged pieces can be promoted if it contains a pawn, be
                      careful, this replaces both pieces.
                    </li>
                    <li>
                      * You can choose what to promote to (except pawn and rook, just
                      like in chess)
                    </li>

                    <li>* If the king and rook didn't move they can castle. </li>
                    <li>
                      * A piece (e.g. a bishop) can move into the rook and move
                      somewhere else, that still means that the rook didn't move and
                      still can castle.
                    </li>

                    <li>
                      * When castling and the rook is merged with some other piece,
                      The whole merged piece must castle.
                    </li>

                    <li className="text-red-500">
                      * NO EnPassant, check the questions below. It is too confusing.
                    </li>

                    <li>
                      * (❓ Not sure) Since pawn can get to their back rank (e.g.
                      white pawn to row 1), it's not clear if they still can do the
                      double move.
                    </li>

                    <li>
                      * (❓ Not sure) If pawn moves 2 squares forward and merges into
                      another piece, the en passante will capture only the pawn, and
                      not the the other piece.
                    </li>

                    <li>
                      * (❓ Not sure) If a rook merged with a pawn moves 2 squares
                      from the pawn's starting position, can it still be taken en
                      passante? What if it's a bishope merged with a pawn?{" "}
                    </li>
                  </ul>
                </div>
              </div>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      </div>
    </div>
  );
}
