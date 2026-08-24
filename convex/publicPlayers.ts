import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  isValidPublicName,
  PUBLIC_NAME_MAX_LENGTH,
  PUBLIC_NAME_MIN_LENGTH,
  publicNameKey,
  trimPublicName,
} from "../lib/publicName";
import { isDeletedUser } from "./authUser";

export const USERNAME_MIN_LENGTH = PUBLIC_NAME_MIN_LENGTH;
export const USERNAME_MAX_LENGTH = PUBLIC_NAME_MAX_LENGTH;

export const publicPlayerValidator = v.object({
  name: v.string(),
  isGuest: v.boolean(),
});

export type PublicPlayer = {
  name: string;
  isGuest: boolean;
};

export function validateUsername(value: unknown): string {
  const username = trimPublicName(value);
  if (!isValidPublicName(username)) throw new Error("Invalid username");
  return username;
}

export function usernameKey(username: string): string {
  return publicNameKey(username);
}

export function createGuestName(): string {
  const adjectives = ["Amber", "Brave", "Calm", "Clever", "Quiet", "Swift"];
  const pieces = ["Bishop", "Knight", "Pawn", "Queen", "Rook"];
  const random = new Uint32Array(3);
  crypto.getRandomValues(random);

  return `${adjectives[random[0] % adjectives.length]}${
    pieces[random[1] % pieces.length]
  }${String(random[2] % 1_000_000).padStart(6, "0")}`;
}

export function getPublicPlayer(user: Doc<"users"> | null): PublicPlayer {
  if (!user) return { name: "Player0000", isGuest: false };
  if (isDeletedUser(user)) return { name: "Deleted player", isGuest: false };

  const name = user.name?.trim();
  if (name && name.length >= USERNAME_MIN_LENGTH) {
    return { name, isGuest: user.isAnonymous === true };
  }

  const suffix = stableNumber(user._id);
  return {
    name: `${user.isAnonymous === true ? "Guest" : "Player"}${suffix}`,
    isGuest: user.isAnonymous === true,
  };
}

function stableNumber(value: string): string {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return String(hash % 10_000).padStart(4, "0");
}
