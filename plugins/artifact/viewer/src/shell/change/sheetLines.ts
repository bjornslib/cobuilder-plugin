/**
 * One field as a list of lines, whether the record wrote a list or one string.
 *
 * `intent.testing` is a single string in every entry this bundle carries that holds one,
 * while its four siblings are lists. No document states which shape the field takes, so
 * this reads both rather than assuming either.
 */
export function asLines(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "string" && value.trim() !== "") return [value];
  return [];
}
