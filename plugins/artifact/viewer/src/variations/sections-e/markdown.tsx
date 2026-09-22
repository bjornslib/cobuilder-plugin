/**
 * A small markdown reader for the records this shell opens in a Sheet.
 *
 * `adrs.js` carries each decision's full authored record as markdown under `body`,
 * and `entities.epic_design` carries a Gate 4b design the same way. A reader of
 * either one must see a heading as a heading, so the record is parsed rather than
 * dumped as plain text.
 *
 * The reader is the record mosaic's, copied rather than imported, because every
 * directory under `variations/` stays independently removable while the arrangement
 * is under review. It covers the six shapes the corpus uses: headings, paragraphs,
 * list items, fenced code, tables, and inline code and bold. It is not a general
 * markdown engine and it does not try to be one.
 *
 * Section 11.3 rule 3 lives here. Every table and every fenced code block wraps in its
 * own `overflow-x: auto` container, so a wide block keeps its own scroll and its
 * integrity while the pane keeps its own.
 */

import { useMemo } from "react";

import { cn } from "@/lib/utils";

type Block =
  | { kind: "h1" | "h2" | "h3" | "p" | "li" | "pre"; text: string }
  | { kind: "table"; rows: string[][] };

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

function toBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (/^\s*$/.test(line) || /^\s*---+\s*$/.test(line)) {
      index += 1;
      continue;
    }
    if (/^\s*```/.test(line)) {
      const buffer: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index])) {
        buffer.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ kind: "pre", text: buffer.join("\n") });
      continue;
    }
    if (/^\s*\|/.test(line)) {
      const rows: string[][] = [];
      while (index < lines.length && /^\s*\|/.test(lines[index])) {
        if (!isSeparatorRow(lines[index])) rows.push(splitRow(lines[index]));
        index += 1;
      }
      blocks.push({ kind: "table", rows });
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const depth = heading[1].length;
      blocks.push({ kind: depth === 1 ? "h1" : depth === 2 ? "h2" : "h3", text: heading[2] });
      index += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      blocks.push({ kind: "li", text: line.replace(/^\s*[-*]\s+/, "") });
      index += 1;
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      blocks.push({ kind: "li", text: line.replace(/^\s*\d+\.\s+/, "") });
      index += 1;
      continue;
    }
    const buffer: string[] = [line.trim()];
    index += 1;
    while (
      index < lines.length &&
      !/^\s*$/.test(lines[index]) &&
      !/^\s*(#{1,4}\s|[-*]\s|\d+\.\s|```|\||---)/.test(lines[index])
    ) {
      buffer.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ kind: "p", text: buffer.join(" ") });
  }
  return blocks;
}

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let match = pattern.exec(text);
  let tick = 0;
  while (match !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      parts.push(
        <code
          key={`${keyPrefix}-c${tick}`}
          className="rounded bg-surface-3 px-1 py-px font-mono text-[13.5px] break-words text-accent-deep"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(
        <strong key={`${keyPrefix}-b${tick}`} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    }
    last = match.index + token.length;
    tick += 1;
    match = pattern.exec(text);
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function MarkdownBlock({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  const blocks = useMemo(() => toBlocks(markdown), [markdown]);
  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      {blocks.map((block, index) => {
        const key = `block-${index}`;
        if (block.kind === "h1") {
          return (
            <h3 key={key} className="m-0 font-mono text-[19px] font-bold tracking-[-0.01em]">
              {inline(block.text, key)}
            </h3>
          );
        }
        if (block.kind === "h2") {
          return (
            <h4
              key={key}
              className="mt-2 mb-0 border-b border-line-soft pb-1 font-mono text-[16px] font-bold text-accent-deep"
            >
              {inline(block.text, key)}
            </h4>
          );
        }
        if (block.kind === "h3") {
          return (
            <h5 key={key} className="m-0 font-mono text-[15px] font-bold text-ink-mid">
              {inline(block.text, key)}
            </h5>
          );
        }
        if (block.kind === "li") {
          return (
            <p
              key={key}
              className="m-0 flex min-w-0 gap-2.5 font-serif text-[16px] leading-[1.6] text-ink-mid"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-faint" aria-hidden="true" />
              <span className="min-w-0">{inline(block.text, key)}</span>
            </p>
          );
        }
        if (block.kind === "pre") {
          return (
            <div key={key} className="min-w-0 overflow-x-auto">
              <pre className="m-0 rounded-lg border border-line bg-surface-2 p-3 font-mono text-[13px] leading-[1.5] text-ink-mid">
                <code>{block.text}</code>
              </pre>
            </div>
          );
        }
        if (block.kind === "table") {
          const [head, ...body] = block.rows;
          return (
            <div key={key} className="min-w-0 overflow-x-auto">
              <table className="w-full border-collapse font-serif text-[15px]">
                <thead>
                  <tr>
                    {(head ?? []).map((cell, cellIndex) => (
                      <th
                        key={`${key}-h${cellIndex}`}
                        className="border-b border-line px-2 py-1.5 text-left font-mono text-[12px] tracking-[0.05em] text-ink-dim uppercase"
                      >
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, rowIndex) => (
                    <tr key={`${key}-r${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${key}-r${rowIndex}-c${cellIndex}`}
                          className="border-b border-line-soft px-2 py-1.5 align-top text-ink-mid"
                        >
                          {inline(cell, `${key}-r${rowIndex}-c${cellIndex}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={key} className="m-0 font-serif text-[16px] leading-[1.65] break-words text-ink-mid">
            {inline(block.text, key)}
          </p>
        );
      })}
    </div>
  );
}
