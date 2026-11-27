import { inline } from "./inline";
import type { Block } from "./parse";
import { TableBlock } from "./table";

const TEXT_TAGS: Record<"h1" | "h2" | "h3" | "p", { Tag: "h3" | "h4" | "h5" | "p"; className: string }> = {
  h1: { Tag: "h3", className: "m-0 font-mono text-[19px] font-bold tracking-[-0.01em]" },
  h2: {
    Tag: "h4",
    className: "mt-2 mb-0 border-b border-line-soft pb-1 font-mono text-[16px] font-bold text-accent-deep",
  },
  h3: { Tag: "h5", className: "m-0 font-mono text-[15px] font-bold text-ink-mid" },
  p: { Tag: "p", className: "m-0 font-serif text-[16px] leading-[1.65] break-words text-ink-mid" },
};

interface TextProps {
  text: string;
  id: string;
}

function ListItem({ text, id }: TextProps) {
  return (
    <p className="m-0 flex min-w-0 gap-2.5 font-serif text-[16px] leading-[1.6] text-ink-mid">
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-faint" aria-hidden="true" />
      <span className="min-w-0">{inline(text, id)}</span>
    </p>
  );
}

function CodeBlock({ text }: { text: string }) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <pre className="m-0 rounded-lg border border-line bg-surface-2 p-3 font-mono text-[13px] leading-[1.5] text-ink-mid">
        <code>{text}</code>
      </pre>
    </div>
  );
}

export function BlockView({ block, id }: { block: Block; id: string }) {
  if (block.kind === "table") return <TableBlock rows={block.rows} id={id} />;
  if (block.kind === "li") return <ListItem text={block.text} id={id} />;
  if (block.kind === "pre") return <CodeBlock text={block.text} />;
  const { Tag, className } = TEXT_TAGS[block.kind];
  return <Tag className={className}>{inline(block.text, id)}</Tag>;
}
