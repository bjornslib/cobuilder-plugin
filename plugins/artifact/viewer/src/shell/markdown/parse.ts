type TextKind = "h1" | "h2" | "h3" | "p" | "li" | "pre";

export type Block =
  | { kind: TextKind; text: string }
  | { kind: "table"; rows: string[][] };

interface Scan {
  block: Block | null;
  next: number;
}

type Scanner = (lines: string[], index: number) => Scan | null;

const FENCE = /^\s*```/;
const TABLE_ROW = /^\s*\|/;
const HEADING_KINDS: Array<"h1" | "h2" | "h3"> = ["h1", "h2", "h3", "h3"];
const PARAGRAPH_STOP = /^\s*(#{1,4}\s|[-*]\s|\d+\.\s|```|\||---)/;

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes("-");
}

function scanBlank(lines: string[], index: number): Scan | null {
  const line = lines[index];
  if (!/^\s*$/.test(line) && !/^\s*---+\s*$/.test(line)) return null;
  return { block: null, next: index + 1 };
}

function scanFence(lines: string[], index: number): Scan | null {
  if (!FENCE.test(lines[index])) return null;
  let end = index + 1;
  while (end < lines.length && !FENCE.test(lines[end])) end += 1;
  const text = lines.slice(index + 1, end).join("\n");
  return { block: { kind: "pre", text }, next: end + 1 };
}

function scanTable(lines: string[], index: number): Scan | null {
  if (!TABLE_ROW.test(lines[index])) return null;
  let end = index;
  while (end < lines.length && TABLE_ROW.test(lines[end])) end += 1;
  const rows = lines
    .slice(index, end)
    .filter((line) => !isSeparatorRow(line))
    .map(splitRow);
  return { block: { kind: "table", rows }, next: end };
}

function scanHeading(lines: string[], index: number): Scan | null {
  const heading = /^(#{1,4})\s+(.*)$/.exec(lines[index]);
  if (!heading) return null;
  const kind = HEADING_KINDS[heading[1].length - 1];
  return { block: { kind, text: heading[2] }, next: index + 1 };
}

function listScanner(pattern: RegExp): Scanner {
  return (lines, index) => {
    const line = lines[index];
    if (!pattern.test(line)) return null;
    return { block: { kind: "li", text: line.replace(pattern, "") }, next: index + 1 };
  };
}

function continuesParagraph(line: string): boolean {
  return !/^\s*$/.test(line) && !PARAGRAPH_STOP.test(line);
}

function scanParagraph(lines: string[], index: number): Scan {
  let end = index + 1;
  while (end < lines.length && continuesParagraph(lines[end])) end += 1;
  const text = lines
    .slice(index, end)
    .map((line) => line.trim())
    .join(" ");
  return { block: { kind: "p", text }, next: end };
}

const SCANNERS: Scanner[] = [
  scanBlank,
  scanFence,
  scanTable,
  scanHeading,
  listScanner(/^\s*[-*]\s+/),
  listScanner(/^\s*\d+\.\s+/),
];

function scanAt(lines: string[], index: number): Scan {
  for (const scan of SCANNERS) {
    const hit = scan(lines, index);
    if (hit !== null) return hit;
  }
  return scanParagraph(lines, index);
}

export function toBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const { block, next } = scanAt(lines, index);
    if (block !== null) blocks.push(block);
    index = next;
  }
  return blocks;
}
