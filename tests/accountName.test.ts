import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { createInitialGameState } from "../lib/chessmerge";

const modules = import.meta.glob("../convex/**/*.*s");

describe("public account name", () => {
  it("renames a guest without rewriting games and allows recasing", async () => {
    const t = convexTest(schema, modules);
    const seeded = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "OldGuest",
        usernameKey: "oldguest",
        isAnonymous: true,
      });
      const opponentId = await ctx.db.insert("users", {
        name: "Opponent",
        usernameKey: "opponent",
      });
      const game = {
        whitePlayerId: userId,
        blackPlayerId: opponentId,
        status: "active" as const,
        gameState: JSON.stringify(createInitialGameState()),
        moveHistory: [],
        lastMoveAt: 100,
      };
      const gameId = await ctx.db.insert("games", game);
      return { userId, gameId, game };
    });
    const guest = t.withIdentity({ subject: seeded.userId });

    await expect(
      guest.mutation(api.accounts.updateName, {
        name: "  RenamedGuest  ",
      }),
    ).resolves.toEqual({ status: "updated", name: "RenamedGuest" });

    await expect(
      guest.mutation(api.accounts.updateName, { name: "renamedguest" }),
    ).resolves.toEqual({ status: "updated", name: "renamedguest" });

    await t.run(async (ctx) => {
      expect(await ctx.db.get(seeded.userId)).toMatchObject({
        name: "renamedguest",
        usernameKey: "renamedguest",
        isAnonymous: true,
      });
      expect(await ctx.db.get(seeded.gameId)).toMatchObject(seeded.game);
    });
    await expect(
      guest.query(api.gameLogic.getGame, { gameId: seeded.gameId }),
    ).resolves.toMatchObject({
      players: {
        white: { name: "renamedguest", isGuest: true },
        black: { name: "Opponent", isGuest: false },
      },
    });
    await expect(guest.query(api.auth.loggedInUser, {})).resolves.toMatchObject(
      {
        name: "renamedguest",
        isGuest: true,
      },
    );
  });

  it("rejects invalid and case-insensitively taken names", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) => {
      const editableUserId = await ctx.db.insert("users", {
        name: "Editable",
        usernameKey: "editable",
      });
      await ctx.db.insert("users", {
        name: "TakenName",
        usernameKey: "takenname",
      });
      return editableUserId;
    });
    const user = t.withIdentity({ subject: userId });

    await expect(
      user.mutation(api.accounts.updateName, { name: "RegisteredName" }),
    ).resolves.toEqual({ status: "updated", name: "RegisteredName" });
    await expect(
      user.mutation(api.accounts.updateName, { name: "bad name" }),
    ).rejects.toThrow("Invalid username");
    await expect(
      user.mutation(api.accounts.updateName, { name: "takenNAME" }),
    ).resolves.toEqual({ status: "taken" });

    await t.run(async (ctx) => {
      expect(await ctx.db.get(userId)).toMatchObject({
        name: "RegisteredName",
        usernameKey: "registeredname",
      });
    });
  });

  it("rejects stale authentication for a deleted account", async () => {
    const t = convexTest(schema, modules);
    const deletedUserId = await t.run((ctx) =>
      ctx.db.insert("users", { deletedAt: Date.now() }),
    );

    await expect(
      t
        .withIdentity({ subject: deletedUserId })
        .mutation(api.accounts.updateName, { name: "NewName" }),
    ).rejects.toThrow("Not authenticated");
  });
});
