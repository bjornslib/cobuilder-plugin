export const SECTION_KEYS = [
  "intent",
  "problem-and-solution",
  "architecture",
  "build",
  "pull-requests",
  "shipped",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const LEVEL_KEYS = ["intent", "problem-and-solution", "architecture"] as const;
export type LevelKey = (typeof LEVEL_KEYS)[number];

export function isSectionKey(value: string): value is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(value);
}

/** The rail's label for a section. One name for one thing, used everywhere. */
export const SECTION_LABEL: Record<SectionKey, string> = {
  intent: "Intent",
  "problem-and-solution": "Problem & Solution",
  architecture: "Architecture",
  build: "Build",
  "pull-requests": "Pull requests",
  shipped: "Shipped",
};
