/**
 * `adrs.js` carries each decision's full authored record as markdown under `body`,
 * and `entities.epic_design` carries a Gate 4b design the same way. A reader must
 * see a heading as a heading, so the record is parsed rather than dumped as plain
 * text. It covers the six shapes the corpus uses and is not a general markdown
 * engine.
 *
 * Section 11.3 rule 3 lives here. Every table and every fenced code block wraps in
 * its own `overflow-x: auto` container, so a wide block keeps its own scroll and its
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
