import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useEffect, useRef } from "react";

import { ChessGameWrapper } from "../components/ChessGame";
import { gameQuery } from "../components/ChessGame.queries";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/game/$gameId")({
  loader: async ({ context, params }) => {
    const game = await context.queryClient.query(gameQuery(params.gameId));
    if (game === null) throw notFound();
    return game;
  },
  head: ({ loaderData: game }) => {
    let title = "Game unavailable | ChessMerge";
    let description = "This link doesn't point to an available game.";
    if (game) {
      const { white, black } = game.players;
      const moves = `${game.moveCount} ${game.moveCount === 1 ? "move" : "moves"}`;
      title = `${white.name} vs ${black.name} | ChessMerge`;
      description =
        game.status === "active"
          ? `Live ChessMerge game after ${moves}.`
          : game.winner === "draw"
            ? `Draw by stalemate after ${moves}.`
            : `${(game.winner === "w" ? white : black).name} won by ${game.gameEndReason} after ${moves}.`;
    }
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  notFoundComponent: GameUnavailable,
  component: GameRoute,
});

function GameRoute() {
  const { gameId } = Route.useParams();
  const navigate = useNavigate();
  const { isLoading } = useConvexAuth();
  const { data } = useSuspenseQuery(gameQuery(gameId));
  const heading = useRef<HTMLHeadingElement>(null);
  const observedRematch = useRef<{ gameId: string; ready: boolean } | null>(
    null,
  );
  // The server renders signed out, so until Convex Auth knows the viewer the
  // page shows the public board as a spectator does: white at the bottom and
  // no player actions.
  const game =
    data && isLoading ? { ...data, playerColor: null, rematch: null } : data;
  const rematchStatus = game?.rematch?.status ?? null;
  const rematchGameId =
    game?.rematch?.status === "ready" ? game.rematch.gameId : null;

  useEffect(() => {
    heading.current?.focus();
  }, [gameId]);

  useEffect(() => {
    // Only a player's view has a rematch state, so the first state observed
    // is the player's own, and reopening a game whose rematch is ready stays
    // on it. Navigate only when the rematch becomes ready on this page.
    if (rematchStatus === null) return;

    const previous = observedRematch.current;
    observedRematch.current = { gameId, ready: rematchGameId !== null };
    if (!rematchGameId || previous?.gameId !== gameId || previous.ready) {
      return;
    }

    void navigate({
      to: "/game/$gameId",
      params: { gameId: rematchGameId },
      replace: true,
    });
  }, [gameId, navigate, rematchGameId, rematchStatus]);

  // The game can become unavailable after the loader found it.
  if (game === null) return <GameUnavailable />;

  return (
    <>
      <h1 ref={heading} tabIndex={-1} className="sr-only">
        {game.playerColor === null ? "Watching chess game" : "Chess game"}
      </h1>
      <ChessGameWrapper game={game} />
    </>
  );
}

function GameUnavailable() {
  const navigate = useNavigate();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div className="grid flex-1 place-items-center px-3 py-8">
      <article className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg sm:p-8">
        <h1
          ref={heading}
          tabIndex={-1}
          className="font-serif text-3xl leading-tight tracking-tight sm:text-4xl"
        >
          Game unavailable
        </h1>
        <p className="mt-3 text-muted-foreground">
          This link doesn&apos;t point to an available game.
        </p>
        <div className="mt-6 grid gap-2 min-[420px]:grid-cols-2">
          <Button
            type="button"
            size="lg"
            onClick={() => void navigate({ to: "/new" })}
          >
            Create challenge
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={() => void navigate({ to: "/" })}
          >
            Lobby
          </Button>
        </div>
      </article>
    </div>
  );
}
