import { createFileRoute } from "@tanstack/react-router";

import { ChallengePage } from "../components/ChallengePage";

export const Route = createFileRoute("/challenge/$challengeId")({
  component: ChallengeRoute,
});

function ChallengeRoute() {
  const { challengeId } = Route.useParams();
  return <ChallengePage challengeId={challengeId} />;
}
