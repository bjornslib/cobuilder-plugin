export interface DiffFile {
  path: string;
  adds: number;
  dels: number;
  /** True when the diff carries no hunk, only a binary notice or a mode change. */
  binary: boolean;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  /** The `@@ ... @@` line, verbatim. */
  header: string;
  lines: Array<{ kind: "add" | "del" | "context"; text: string }>;
}

const BINARY_PREFIXES = ["Binary files ", "GIT binary patch"];
const SKIPPED_PREFIXES = [
  "diff --git ",
  "index ",
  "--- ",
  "+++ ",
  "new file",
  "deleted file",
];
const LINE_KINDS = [
  ["+", "add"],
  ["-", "del"],
  [" ", "context"],
] as const;

function startsWithAny(line: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => line.startsWith(prefix));
}

function kindOf(line: string): DiffHunk["lines"][number]["kind"] | null {
  return LINE_KINDS.find(([mark]) => line.startsWith(mark))?.[1] ?? null;
}

/**
 * One diff text, split into its hunks and counted.
 *
 * The counts come from the diff's own `+` and `-` lines, so they cannot disagree with the
 * hunks the surface draws under them.
 */
export function diffFile(path: string, text: string): DiffFile {
  const file: DiffFile = { path, adds: 0, dels: 0, binary: false, hunks: [] };
  for (const line of text.split("\n")) readLine(file, line);
  return file;
}

function readLine(file: DiffFile, line: string): void {
  if (line.startsWith("@@")) {
    file.hunks.push({ header: line, lines: [] });
  } else if (startsWithAny(line, BINARY_PREFIXES)) {
    file.binary = true;
  } else if (!startsWithAny(line, SKIPPED_PREFIXES)) {
    addToHunk(file, line);
  }
}

function addToHunk(file: DiffFile, line: string): void {
  const current = file.hunks[file.hunks.length - 1];
  const kind = kindOf(line);
  if (current === undefined || kind === null) return;
  if (kind === "add") file.adds += 1;
  if (kind === "del") file.dels += 1;
  current.lines.push({ kind, text: line.slice(1) });
}

/** Every file a diff holds, largest change first. */
export function diffFiles(diff: Record<string, string>): DiffFile[] {
  return Object.entries(diff)
    .map(([path, text]) => diffFile(path, text))
    .sort((a, b) => b.adds + b.dels - (a.adds + a.dels) || a.path.localeCompare(b.path));
}
