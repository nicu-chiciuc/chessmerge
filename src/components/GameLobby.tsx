import { useQuery } from "convex/react";
import { useNavigate } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { EmailSubscribe } from "./EmailSubscribe";
import { Button } from "@/components/ui/button";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

export function GameLobby({
  isAuthenticated = false,
}: {
  isAuthenticated?: boolean;
}) {
  const liveGames = useQuery(api.gameLogic.listLiveGames);
  const myGames = useQuery(
    api.gameLogic.listGames,
    isAuthenticated ? {} : "skip",
  );
  const navigate = useNavigate();

  const handleCreateChallenge = () => {
    void navigate({ to: "/new" });
  };

  return (
    <div className="space-y-6 pt-8">
      {/* Header Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Game Lobby</h1>
        <p className="text-gray-600 mb-6">
          {isAuthenticated
            ? "Create a challenge, watch a live game, or resume yours."
            : "Create a challenge, watch a live game, or use the Sandbox."}
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Button
            onClick={handleCreateChallenge}
            size="lg"
            className="px-6 py-3"
          >
            Create challenge
          </Button>

          <Button
            onClick={() => void navigate({ to: "/practice" })}
            variant="secondary"
            size="lg"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white"
          >
            Sandbox
          </Button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Games Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Live games</h2>
            {liveGames === undefined ? (
              <p className="text-gray-500">Loading games…</p>
            ) : liveGames.length === 0 ? (
              <p className="text-gray-500">No games are live right now.</p>
            ) : (
              <div className="space-y-3">
                {liveGames.map((game) => (
                  <button
                    type="button"
                    key={game._id}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() =>
                      void navigate({
                        to: "/game/$gameId",
                        params: { gameId: game._id },
                      })
                    }
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">
                          Game {game._id.slice(-6)}
                        </span>
                        <span className="block text-sm text-gray-500">
                          {game.turn === "w" ? "White" : "Black"} to move
                          {game.moveCount > 0
                            ? ` · ${game.moveCount} ${game.moveCount === 1 ? "move" : "moves"}`
                            : ""}
                        </span>
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-xs text-gray-500 sm:block">
                      {formatLastMove(game.lastMoveAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {isAuthenticated && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">My games</h2>
              {myGames === undefined ? (
                <p className="text-gray-500">Loading games…</p>
              ) : myGames.length === 0 ? (
                <p className="text-gray-500">No games yet.</p>
              ) : (
                <div className="space-y-3">
                  {myGames.map((game) => (
                    <button
                      type="button"
                      key={game._id}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-gray-50"
                      onClick={() =>
                        void navigate({
                          to: "/game/$gameId",
                          params: { gameId: game._id },
                        })
                      }
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">
                          {game.status === "active"
                            ? "Active game"
                            : "Completed game"}

                          <span className="text-gray-500">
                            {" "}
                            ({game._id.slice(0, 6)})
                          </span>
                        </span>

                        <span className="block text-sm text-gray-500">
                          {new Date(game.lastMoveAt).toLocaleDateString()}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            game.status === "active"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {game.status}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Email Subscription */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6 sticky top-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              Stay Updated
            </h3>
            <EmailSubscribe compact={true} hideCard={true} />
          </div>
        </div>
      </div>

      {/* Game Rules Accordion */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <Accordion.Root type="single" collapsible className="w-full">
          <Accordion.Item value="rules" className="border-none group">
            <Accordion.Trigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group-data-[state=open]:bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900">
                ChessMerge Rules
              </h2>
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
                      * One of the pieces can split at any time, that also means
                      that it can split from one piece then merge into another
                      one in the same move
                    </li>
                    <li>
                      * Merged pieces can be promoted if it contains a pawn, be
                      careful, this replaces both pieces.
                    </li>
                    <li>
                      * You can choose what to promote to (except pawn and rook,
                      just like in chess)
                    </li>

                    <li>
                      * If the king and rook didn't move they can castle.{" "}
                    </li>
                    <li>
                      * A piece (e.g. a bishop) can move into the rook and move
                      somewhere else, that still means that the rook didn't move
                      and still can castle.
                    </li>

                    <li>
                      * When castling and the rook is merged with some other
                      piece, The whole merged piece must castle.
                    </li>

                    <li className="text-red-500">
                      * NO EnPassant, check the questions below. It is too
                      confusing.
                    </li>

                    <li>
                      * (❓ Not sure) Since pawn can get to their back rank
                      (e.g. white pawn to row 1), it's not clear if they still
                      can do the double move.
                    </li>

                    <li>
                      * (❓ Not sure) If pawn moves 2 squares forward and merges
                      into another piece, the en passante will capture only the
                      pawn, and not the the other piece.
                    </li>

                    <li>
                      * (❓ Not sure) If a rook merged with a pawn moves 2
                      squares from the pawn's starting position, can it still be
                      taken en passante? What if it's a bishope merged with a
                      pawn?{" "}
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

function formatLastMove(lastMoveAt: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(lastMoveAt);
}
