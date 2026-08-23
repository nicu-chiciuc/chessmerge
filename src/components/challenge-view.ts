import type { FunctionReturnType } from "convex/server";

import { api } from "../../convex/_generated/api";

type PublicChallenge = FunctionReturnType<typeof api.challenges.getChallenge>;
type ParticipantChallenge = Extract<
  NonNullable<PublicChallenge>,
  { status: "joined"; viewerRole: "creator" | "opponent" }
>;
type ChallengeCreator = NonNullable<PublicChallenge>["creator"];

export type ChallengeView =
  | { kind: "creator"; creator: ChallengeCreator }
  | { kind: "game"; gameId: ParticipantChallenge["gameId"] }
  | { kind: "guest"; creator: ChallengeCreator }
  | { kind: "unavailable" };

export function resolveChallengeView(
  challenge: PublicChallenge,
  now: number,
): ChallengeView {
  if (!challenge) return { kind: "unavailable" };

  if (challenge.status === "waiting") {
    if (challenge.expiresAt <= now) return { kind: "unavailable" };

    return challenge.viewerRole === "creator"
      ? { kind: "creator", creator: challenge.creator }
      : { kind: "guest", creator: challenge.creator };
  }

  if (challenge.status === "joined" && challenge.viewerRole !== "guest") {
    return { kind: "game", gameId: challenge.gameId };
  }

  return { kind: "unavailable" };
}
