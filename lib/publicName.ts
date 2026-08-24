export const PUBLIC_NAME_MIN_LENGTH = 4;
export const PUBLIC_NAME_MAX_LENGTH = 24;
export const PUBLIC_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;
export const PUBLIC_NAME_HTML_PATTERN = "^[A-Za-z0-9_\\-]+$";

export function trimPublicName(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidPublicName(name: string): boolean {
  return (
    name.length >= PUBLIC_NAME_MIN_LENGTH &&
    name.length <= PUBLIC_NAME_MAX_LENGTH &&
    PUBLIC_NAME_PATTERN.test(name)
  );
}

export function publicNameKey(name: string): string {
  return name.toLowerCase();
}
