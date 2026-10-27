import { lineAt, projectedText } from "./projection";
import type { SourceFile } from "./ranges";

export interface Declaration {
  at: string;
  text: string;
}

const DEPTH_STEP: Record<string, number> = { "{": 1, "}": -1 };

function firstBraceAt(text: string, start: number): number {
  const found = text.indexOf("{", start);
  return found === -1 ? Infinity : found;
}

function declarationText(text: string, start: number): string {
  const braceAt = firstBraceAt(text, start);
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    depth += DEPTH_STEP[ch] ?? 0;
    if (ch === "}" && depth === 0) return text.slice(start, text[i + 1] === ";" ? i + 2 : i + 1);
    if (ch === ";" && depth === 0 && braceAt > i) return text.slice(start, i + 1);
  }
  return text.slice(start);
}

function declarationPattern(name: string): RegExp {
  return new RegExp(
    `(?:^|\\n)[ \\t]*(?:export\\s+)?(?:declare\\s+)?(?:interface|type)\\s+${name}\\b`,
    "g",
  );
}

function declarationsIn(file: SourceFile, pattern: RegExp): Declaration[] {
  const text = projectedText(file, "withStrings");
  return [...text.matchAll(pattern)].map((match) => {
    const start = match.index + (match[0].startsWith("\n") ? 1 : 0);
    return { at: `${file.path}:${lineAt(text, start)}`, text: declarationText(text, start) };
  });
}

export function declarationsOf(name: string, files: SourceFile[]): Declaration[] {
  const pattern = declarationPattern(name);
  return files.flatMap((file) => declarationsIn(file, pattern));
}
