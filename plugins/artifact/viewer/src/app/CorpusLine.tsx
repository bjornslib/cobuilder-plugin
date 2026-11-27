import { entitiesOf } from "@/data/bundle";
import type { RecordIndex } from "@/data/types";

function corpusItems(index: RecordIndex): Array<[number, string]> {
  const entities = entitiesOf(index);
  return [
    [entities.design.length, "designs"],
    [entities.epic.length, "epics"],
    [entities.adr.length, "decisions"],
    [entities.pull_request.length, "pull requests"],
  ];
}

function CorpusItem({ count, label, first }: { count: number; label: string; first: boolean }) {
  return (
    <span>
      {first ? null : <span className="text-ink-faint"> · </span>}
      <b className="text-[13px] font-bold text-foreground tabular-nums">
        {count}
      </b>{" "}
      {label}
    </span>
  );
}

function CorpusCounts({ index }: { index: RecordIndex }) {
  return (
    <div>
      {corpusItems(index).map(([count, label], i) => (
        <CorpusItem key={label} count={count} label={label} first={i === 0} />
      ))}
    </div>
  );
}

export function CorpusLine({ index }: { index: RecordIndex }) {
  return (
    <div className="text-right font-mono text-[10.5px] leading-[1.7] text-ink-dim">
      <CorpusCounts index={index} />
      <div className="text-ink-faint">
        read from <code>{`.cobuilder-architect/self/data/index.json`}</code>,
        schema {index.schema_version}, git{" "}
        {index.sources.git_head.slice(0, 7)}
      </div>
    </div>
  );
}
