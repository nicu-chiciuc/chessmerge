import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import {
  ChallengePage,
  UnavailableChallenge,
} from "../components/ChallengePage";
import { challengeQuery } from "../components/ChallengePage.queries";
import { resolveChallengeView } from "../components/challenge-view";

export const Route = createFileRoute("/challenge/$challengeId")({
  loader: async ({ context, params }) => {
    const challenge = await context.queryClient.query(
      challengeQuery(params.challengeId),
    );
    // A malformed id and a missing row both give null, for every viewer.
    if (challenge === null) throw notFound();
    // A joined challenge carries only its game.
    if (challenge.status === "joined") {
      throw redirect({
        to: "/game/$gameId",
        params: { gameId: challenge.gameId },
      });
    }
    // The server render, the hydration, and the head pick the view at the
    // same time, so they agree on whether the challenge has expired.
    return { challenge, now: Date.now() };
  },
  head: ({ loaderData }) => {
    const view = loaderData
      ? resolveChallengeView(loaderData.challenge, loaderData.now)
      : null;
    const [title, description] =
      view?.kind === "creator" || view?.kind === "guest"
        ? [
            `${view.creator.name}'s challenge | ChessMerge`,
            `Join ${view.creator.name} for an untimed game of ChessMerge.`,
          ]
        : [
            "Challenge unavailable | ChessMerge",
            "This ChessMerge challenge link can't be used.",
          ];
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  notFoundComponent: UnavailableChallenge,
  component: ChallengeRoute,
});

function ChallengeRoute() {
  const { challengeId } = Route.useParams();
  const { now } = Route.useLoaderData();
  return <ChallengePage challengeId={challengeId} initialNow={now} />;
}
