import { convexTest, type TestConvex } from "convex-test";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

type ChessMergeTest = TestConvex<typeof schema>;
const modules = import.meta.glob("../convex/**/*.*s");

beforeAll(async () => {
  const keys = await generateKeyPair("RS256", { extractable: true });
  const privateKey = await exportPKCS8(keys.privateKey);
  const publicKey = await exportJWK(keys.publicKey);

  process.env.SITE_URL = "http://localhost:5173";
  process.env.CONVEX_SITE_URL = "https://chessmerge-test.convex.site";
  process.env.JWT_PRIVATE_KEY = privateKey.trimEnd().replace(/\n/g, " ");
  process.env.JWKS = JSON.stringify({
    keys: [{ use: "sig", ...publicKey }],
  });
  process.env.CLOUDFLARE_EMAIL_ACCOUNT_ID = "test-account-id";
  process.env.CLOUDFLARE_EMAIL_API_TOKEN = "test-email-token";
  process.env.AUTH_LOG_LEVEL = "ERROR";
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("password authentication", () => {
  it("requires the emailed code before a new account gets a session", async () => {
    const t = convexTest(schema, modules);

    const signUp = await captureAuthCode(() =>
      t.action(api.auth.signIn, {
        provider: "password",
        params: {
          email: "new-player@example.com",
          username: "NewPlayer",
          password: "secure-password",
          flow: "signUp",
        },
      }),
    );

    expect(signUp.result.tokens).toBeNull();
    await t.run(async (ctx) => {
      expect(await ctx.db.query("authSessions").collect()).toHaveLength(0);
    });

    const verified = await t.action(api.auth.signIn, {
      provider: "password",
      params: {
        email: "new-player@example.com",
        code: signUp.code,
        flow: "email-verification",
      },
    });

    expect(verified.tokens).not.toBeNull();
    await t.run(async (ctx) => {
      const account = await ctx.db.query("authAccounts").first();
      const user = await ctx.db.query("users").first();
      expect(account?.emailVerified).toBe("new-player@example.com");
      expect(user?.name).toBe("NewPlayer");
      expect(await ctx.db.query("authSessions").collect()).toHaveLength(1);
    });
  });

  it("requires four characters after trimming", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.action(api.auth.signIn, {
        provider: "password",
        params: {
          email: "short-name@example.com",
          username: "  abc  ",
          password: "secure-password",
          flow: "signUp",
        },
      }),
    ).rejects.toThrow("Invalid username");

    await t.run(async (ctx) => {
      expect(await ctx.db.query("users").collect()).toEqual([]);
    });
  });

  it("accepts and normalizes a four-character username", async () => {
    const t = convexTest(schema, modules);

    await captureAuthCode(() =>
      t.action(api.auth.signIn, {
        provider: "password",
        params: {
          email: "boundary-name@example.com",
          username: "  Rook  ",
          password: "secure-password",
          flow: "signUp",
        },
      }),
    );

    await t.run(async (ctx) => {
      const user = await ctx.db.query("users").first();
      expect(user).toMatchObject({ name: "Rook", usernameKey: "rook" });
    });
  });

  it("keeps usernames unique regardless of case", async () => {
    const t = convexTest(schema, modules);

    await captureAuthCode(() =>
      t.action(api.auth.signIn, {
        provider: "password",
        params: {
          email: "first-name@example.com",
          username: "MergeFan",
          password: "secure-password",
          flow: "signUp",
        },
      }),
    );

    await expect(
      t.action(api.auth.signIn, {
        provider: "password",
        params: {
          email: "second-name@example.com",
          username: "mergefan",
          password: "secure-password",
          flow: "signUp",
        },
      }),
    ).rejects.toThrow("Username already taken");

    await t.run(async (ctx) => {
      const users = await ctx.db.query("users").collect();
      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({
        name: "MergeFan",
        usernameKey: "mergefan",
      });
    });
  });

  it("assigns a public chess name to a guest", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.action(api.auth.signIn, {
        provider: "anonymous",
        params: {},
      }),
    ).resolves.toMatchObject({ tokens: expect.any(Object) });

    await t.run(async (ctx) => {
      const user = await ctx.db.query("users").first();
      expect(user?.isAnonymous).toBe(true);
      expect(user?.name).toMatch(
        /^(Amber|Brave|Calm|Clever|Quiet|Swift)(Bishop|Knight|Pawn|Queen|Rook)\d{6}$/,
      );
    });
  });

  it("resets the password only after the emailed code is verified", async () => {
    const t = convexTest(schema, modules);
    await createVerifiedUser(t, "returning-player@example.com", "old-password");

    const reset = await captureAuthCode(() =>
      t.action(api.auth.signIn, {
        provider: "password",
        params: {
          email: "returning-player@example.com",
          flow: "reset",
        },
      }),
    );

    const completed = await t.action(api.auth.signIn, {
      provider: "password",
      params: {
        email: "returning-player@example.com",
        code: reset.code,
        newPassword: "new-password",
        flow: "reset-verification",
      },
    });
    expect(completed.tokens).not.toBeNull();

    await expect(
      t.action(api.auth.signIn, {
        provider: "password",
        params: {
          email: "returning-player@example.com",
          password: "old-password",
          flow: "signIn",
        },
      }),
    ).rejects.toThrow();

    const signedIn = await t.action(api.auth.signIn, {
      provider: "password",
      params: {
        email: "returning-player@example.com",
        password: "new-password",
        flow: "signIn",
      },
    });
    expect(signedIn.tokens).not.toBeNull();
  });
});

async function createVerifiedUser(
  t: ChessMergeTest,
  email: string,
  password: string,
) {
  const signUp = await captureAuthCode(() =>
    t.action(api.auth.signIn, {
      provider: "password",
      params: { email, username: "ReturningPlayer", password, flow: "signUp" },
    }),
  );

  await t.action(api.auth.signIn, {
    provider: "password",
    params: {
      email,
      code: signUp.code,
      flow: "email-verification",
    },
  });
}

async function captureAuthCode<Result>(operation: () => Promise<Result>) {
  let code: string | undefined;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      if (
        url !==
        "https://api.cloudflare.com/client/v4/accounts/test-account-id/email/sending/send"
      ) {
        throw new Error(`Unexpected request to ${url}`);
      }

      expect(init?.headers).toEqual({
        Authorization: "Bearer test-email-token",
        "Content-Type": "application/json",
      });

      const rawBody =
        typeof init?.body === "string"
          ? init.body
          : input instanceof Request
            ? await input.clone().text()
            : "";
      const body = JSON.parse(rawBody) as {
        from?: { address?: string; name?: string };
        text?: string;
        html?: string;
      };
      expect(body.from).toEqual({
        address: "notifications@chessmerge.com",
        name: "ChessMerge",
      });
      code = `${body.text ?? ""}\n${body.html ?? ""}`.match(/\b\d{8}\b/)?.[0];

      return new Response(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: {
            delivered: ["new-player@example.com"],
            message_id: "<email-test@chessmerge.com>",
            permanent_bounces: [],
            queued: [],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }),
  );

  const result = await operation();
  expect(code).toMatch(/^\d{8}$/);
  vi.unstubAllGlobals();

  return { code: code!, result };
}
