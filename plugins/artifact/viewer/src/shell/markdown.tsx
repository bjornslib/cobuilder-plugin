/**
 * A small markdown reader for the records this shell opens in a Sheet.
 *
 * `adrs.js` carries each decision's full authored record as markdown under `body`,
 * and `entities.epic_design` carries a Gate 4b design the same way. A reader of
 * either one must see a heading as a heading, so the record is parsed rather than
 * dumped as plain text.
 *
 * The reader is the record mosaic's, and the copy is now the shipped one. The prototype
 * at `src/variations/sections-e/markdown.tsx` held the same text while the arrangement
 * was under review. The prototypes were removed on 2026-10-08, so this is the only copy. It covers the six shapes the corpus uses: headings, paragraphs,
 * list items, fenced code, tables, and inline code and bold. It is not a general
 * markdown engine and it does not try to be one.
 *
 * Section 11.3 rule 3 lives here. Every table and every fenced code block wraps in its
 * own `overflow-x: auto` container, so a wide block keeps its own scroll and its
 * integrity while the pane keeps its own.
 */

import { useMemo } from "react";

import { cn } from "@/lib/utils";

import { BlockView } from "./markdown/blocks";
import { toBlocks } from "./markdown/parse";

interface MarkdownProps {
  markdown: string;
  className?: string;
}

export function MarkdownBlock({ markdown, className }: MarkdownProps) {
  const blocks = useMemo(() => toBlocks(markdown), [markdown]);
  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      {blocks.map((block, index) => (
        <BlockView key={`block-${index}`} block={block} id={`block-${index}`} />
      ))}
    </div>
  );
}
