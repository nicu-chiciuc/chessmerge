import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useHydrated, useNavigate } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import { useQuery } from "convex/react";
import { BookOpen, FlaskConical, Swords } from "lucide-react";

import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { EmailSubscribe } from "./EmailSubscribe";
import { liveGamesQuery } from "./GameLobby.queries";

type GameSummary = FunctionReturnType<typeof api.gameLogic.listGames>[number];

export function GameLobby({
  activeSince,
  isAuthenticated = false,
}: {
  activeSince: number;
  isAuthenticated?: boolean;
}) {
  const { data: liveGames } = useSuspenseQuery(liveGamesQuery(activeSince));
  const myGames = useQuery(
    api.gameLogic.listGames,
    isAuthenticated ? {} : "skip",
  );
  const navigate = useNavigate();
  // The server does not know the visitor's locale and time zone, so the live
  // games' times render after hydration. "My games" renders after sign-in,
  // which happens in the browser.
  const isHydrated = useHydrated();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-3 py-6 sm:px-6 sm:py-10">
      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-8">
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <h1 className="font-serif text-[clamp(2rem,6vw,3.5rem)] leading-none tracking-tight">
              Play ChessMerge
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Challenge a friend or agent, watch a live game, or test a
              position.
            </p>
          </div>
          <div className="grid gap-2 min-[420px]:grid-cols-2 sm:grid-cols-1">
            <Button
              size="lg"
              className="justify-center gap-2"
              onClick={() => void navigate({ to: "/new" })}
            >
              <Swords aria-hidden="true" />
              Create challenge
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="justify-center gap-2"
              onClick={() => void navigate({ to: "/practice" })}
            >
              <FlaskConical aria-hidden="true" />
              Sandbox
            </Button>
          </div>
        </div>
      </section>

      <div
        className={
          isAuthenticated
            ? "grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]"
            : undefined
        }
      >
        <section
          className="min-w-0 rounded-xl border bg-card p-4 shadow-sm sm:p-6"
          aria-labelledby="live-games-title"
        >
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2
              id="live-games-title"
              className="font-serif text-2xl tracking-tight"
            >
              Live games
            </h2>
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted-foreground">
              Last 24 hours
            </span>
          </div>

          {liveGames.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="font-medium">No games are live right now.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A game appears here after the second player joins.
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              {liveGames.map((game) => (
                <button
                  type="button"
                  key={game._id}
                  className="group flex w-full min-w-0 items-center gap-3 rounded-lg border bg-background p-2.5 text-left transition-colors hover:bg-accent/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-3"
                  onClick={() =>
                    void navigate({
                      to: "/game/$gameId",
                      params: { gameId: game._id },
                    })
                  }
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-11 shrink-0 place-items-center rounded-md font-serif text-lg font-bold shadow-inner ${
                      game.turn === "w"
                        ? "bg-amber-100 text-amber-950"
                        : "bg-amber-800 text-amber-50"
                    }`}
                  >
                    {game.turn === "w" ? "W" : "B"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {game.players.white.name} vs {game.players.black.name}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {game.turn === "w" ? "White" : "Black"} to move
                      {game.moveCount > 0
                        ? ` · ${game.moveCount} ${game.moveCount === 1 ? "move" : "moves"}`
                        : ""}
                    </span>
                  </span>
                  <time
                    dateTime={new Date(game.lastMoveAt).toISOString()}
                    className="hidden shrink-0 text-xs text-muted-foreground sm:block"
                  >
                    {isHydrated ? formatLastMove(game.lastMoveAt) : null}
                  </time>
                </button>
              ))}
            </div>
          )}
        </section>

        {isAuthenticated ? (
          <section
            className="min-w-0 rounded-xl border bg-card p-4 shadow-sm sm:p-6"
            aria-labelledby="my-games-title"
          >
            <h2
              id="my-games-title"
              className="mb-4 font-serif text-2xl tracking-tight"
            >
              My games
            </h2>
            {myGames === undefined ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading games…
              </p>
            ) : myGames.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No games yet.
              </p>
            ) : (
              <div className="grid gap-2">
                {myGames.map((game) => (
                  <button
                    type="button"
                    key={game._id}
                    className="w-full min-w-0 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-accent/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() =>
                      void navigate({
                        to: "/game/$gameId",
                        params: { gameId: game._id },
                      })
                    }
                  >
                    <span className="block truncate font-medium">
                      {game.players.white.name} vs {game.players.black.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatGameStatus(game)} ·{" "}
                      {formatLastMove(game.lastMoveAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl tracking-tight">
              How merging works
            </h2>
            <Button asChild size="sm" variant="outline">
              <Link to="/rules">
                <BookOpen aria-hidden="true" />
                Full rules
              </Link>
            </Button>
          </div>
          <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <Rule>Move onto a friendly piece to merge them.</Rule>
            <Rule>Move either half to split the pair again.</Rule>
            <Rule>The pair may move using either piece's movement.</Rule>
            <Rule>Kings cannot merge with another piece.</Rule>
            <Rule>Capturing a merged square captures both pieces.</Rule>
            <Rule>Pawns move one square; en passant is disabled.</Rule>
          </ul>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
          <EmailSubscribe hideCard />
        </section>
      </div>
    </div>
  );
}

function Rule({ children }: { children: string }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden="true" className="font-mono text-primary">
        +
      </span>
      <span>{children}</span>
    </li>
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

function formatGameStatus(game: GameSummary) {
  if (game.status === "active") return "Active";
  if (game.winner === "draw") return "Draw by stalemate";

  const winner = game.winner === "w" ? game.players.white : game.players.black;
  return `${winner.name} won by ${game.gameEndReason}`;
}
