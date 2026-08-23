import { describe, expect, it } from "vitest";

import type { Id } from "../convex/_generated/dataModel";
import { resolveChallengeView } from "../src/components/challenge-view";

const NOW = 1_000;
const GAME_ID = "game-1" as Id<"games">;
const CREATOR = { name: "HostPlayer", isGuest: false };

describe("challenge view resolution", () => {
  it("keeps an unexpired waiting challenge public", () => {
    expect(
      resolveChallengeView(
        {
          status: "waiting",
          expiresAt: NOW + 1,
          viewerRole: "creator",
          creator: CREATOR,
        },
        NOW,
      ),
    ).toEqual({ kind: "creator", creator: CREATOR });
    expect(
      resolveChallengeView(
        {
          status: "waiting",
          expiresAt: NOW + 1,
          viewerRole: "guest",
          creator: CREATOR,
        },
        NOW,
      ),
    ).toEqual({ kind: "guest", creator: CREATOR });
  });

  it("sends both participants, and only participants, to the game", () => {
    expect(
      resolveChallengeView(
        {
          status: "joined",
          expiresAt: NOW + 1,
          viewerRole: "creator",
          gameId: GAME_ID,
          creator: CREATOR,
        },
        NOW,
      ),
    ).toEqual({ kind: "game", gameId: GAME_ID });
    expect(
      resolveChallengeView(
        {
          status: "joined",
          expiresAt: NOW + 1,
          viewerRole: "opponent",
          gameId: GAME_ID,
          creator: CREATOR,
        },
        NOW,
      ),
    ).toEqual({ kind: "game", gameId: GAME_ID });
    expect(
      resolveChallengeView(
        {
          status: "joined",
          expiresAt: NOW + 1,
          viewerRole: "guest",
          creator: CREATOR,
        },
        NOW,
      ),
    ).toEqual({ kind: "unavailable" });
  });

  it("collapses invalid and unusable challenges into one state", () => {
    expect(resolveChallengeView(null, NOW)).toEqual({ kind: "unavailable" });
    expect(
      resolveChallengeView(
        {
          status: "waiting",
          expiresAt: NOW,
          viewerRole: "guest",
          creator: CREATOR,
        },
        NOW,
      ),
    ).toEqual({ kind: "unavailable" });
    expect(
      resolveChallengeView(
        {
          status: "canceled",
          expiresAt: NOW + 1,
          viewerRole: "creator",
          creator: CREATOR,
        },
        NOW,
      ),
    ).toEqual({ kind: "unavailable" });
    expect(
      resolveChallengeView(
        {
          status: "expired",
          expiresAt: NOW - 1,
          viewerRole: "guest",
          creator: CREATOR,
        },
        NOW,
      ),
    ).toEqual({ kind: "unavailable" });
  });
});
