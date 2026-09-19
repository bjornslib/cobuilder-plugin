/**
 * A small markdown reader for the authored documents this board shows.
 *
 * The documents are real: `epic_design.body_md` comes from
 * `docs/plans/<slug>/epic-<id>-design.md`, and `pr_draft` comes from
 * `docs/architecture/designs/<name>/pr-draft.md`. They carry headings, paragraphs,
 * bullet lists, numbered lists, fenced code, and pipe tables. This reader covers
 * exactly those, and nothing else.
 *
 * It builds React elements from parsed lines and never sets inner HTML. The text is
 * this repository's own authored prose, and a reader that injects it would still be
 * the wrong shape.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "para"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "numbers"; items: string[] }
  | { kind: "code"; lines: string[] }
  | { kind: "table"; head: string[]; rows: string[][] };

const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBER = /^\s*\d+\.\s+(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_RULE = /^\s*\|[\s:|-]+\|\s*$/;

function splitRow(line: string): string[] {
  const match = TABLE_ROW.exec(line);
  if (!match) return [];
  return match[1].split("|").map((cell) => cell.trim());
}

function parse(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    if (line.trimStart().startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trimStart().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ kind: "code", lines: code });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        text: heading[2].trim(),
      });
      index += 1;
      continue;
    }

    if (TABLE_ROW.test(line)) {
      const head = splitRow(line);
      const rows: string[][] = [];
      index += 1;
      while (index < lines.length && TABLE_ROW.test(lines[index])) {
        if (!TABLE_RULE.test(lines[index])) rows.push(splitRow(lines[index]));
        index += 1;
      }
      blocks.push({ kind: "table", head, rows });
      continue;
    }

    if (BULLET.test(line)) {
      const items: string[] = [];
      while (index < lines.length && BULLET.test(lines[index])) {
        items.push(BULLET.exec(lines[index])![1]);
        index += 1;
      }
      blocks.push({ kind: "bullets", items });
      continue;
    }

    if (NUMBER.test(line)) {
      const items: string[] = [];
      while (index < lines.length && NUMBER.test(lines[index])) {
        items.push(NUMBER.exec(lines[index])![1]);
        index += 1;
      }
      blocks.push({ kind: "numbers", items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !HEADING.test(lines[index]) &&
      !TABLE_ROW.test(lines[index]) &&
      !BULLET.test(lines[index]) &&
      !NUMBER.test(lines[index]) &&
      !lines[index].trimStart().startsWith("```")
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ kind: "para", text: paragraph.join(" ") });
  }

  return blocks;
}

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`)/g;

/** Bold and code spans only. The documents use little else. */
function inline(text: string, key: string): ReactNode[] {
  const parts = text.split(INLINE);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={`${key}-${i}`} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={`${key}-${i}`}
          className="rounded border border-line-soft bg-surface-2 px-1 py-px font-mono text-[14px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={`${key}-${i}`}>{part}</span>;
  });
}

function headingClass(level: number): string {
  if (level <= 1) {
    return "mt-0 mb-2.5 font-mono text-[18px] font-bold tracking-[-0.01em] text-foreground";
  }
  if (level === 2) {
    return "mt-5 mb-2 font-mono text-[15px] font-bold tracking-[0.02em] text-foreground";
  }
  return "mt-4 mb-1.5 font-mono text-[13px] font-bold tracking-[0.06em] text-ink-dim uppercase";
}

export function Markdown({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  const blocks = parse(source);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {blocks.map((block, bi) => {
        const key = `b${bi}`;
        if (block.kind === "heading") {
          const Tag = (`h${Math.min(block.level + 2, 6)}`) as "h3";
          return (
            <Tag key={key} className={headingClass(block.level)}>
              {inline(block.text, key)}
            </Tag>
          );
        }
        if (block.kind === "para") {
          return (
            <p
              key={key}
              className="m-0 font-serif text-[16px] leading-[1.6] text-foreground"
            >
              {inline(block.text, key)}
            </p>
          );
        }
        if (block.kind === "bullets" || block.kind === "numbers") {
          return (
            <ul key={key} className="m-0 flex list-none flex-col gap-2 p-0">
              {block.items.map((item, ii) => (
                <li key={`${key}-${ii}`} className="flex items-start gap-2.5">
                  {block.kind === "numbers" ? (
                    <span className="mt-0.5 font-mono text-[12.5px] text-ink-faint tabular-nums">
                      {ii + 1}.
                    </span>
                  ) : (
                    <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-ink-faint" />
                  )}
                  <span className="font-serif text-[16px] leading-[1.55] text-foreground">
                    {inline(item, `${key}-${ii}`)}
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.kind === "code") {
          return (
            <pre
              key={key}
              className="m-0 overflow-x-auto rounded-lg border border-line-soft bg-surface-2 px-3.5 py-3 font-mono text-[13px] leading-[1.6] text-ink-mid"
            >
              {block.lines.join("\n")}
            </pre>
          );
        }
        return (
          <div key={key} className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {block.head.map((cell, ci) => (
                    <th
                      key={`${key}-h${ci}`}
                      className="border-b border-line bg-surface-2 px-2.5 py-1.5 font-mono text-[12px] font-bold tracking-[0.04em] text-ink-dim uppercase"
                    >
                      {inline(cell, `${key}-h${ci}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr key={`${key}-r${ri}`} className="align-top">
                    {row.map((cell, ci) => (
                      <td
                        key={`${key}-r${ri}c${ci}`}
                        className="border-b border-line-soft px-2.5 py-2 font-serif text-[15px] leading-[1.5] text-foreground"
                      >
                        {inline(cell, `${key}-r${ri}c${ci}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
