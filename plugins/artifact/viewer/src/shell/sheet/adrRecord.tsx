import { KeyValue, Missing, StateBadge, SubHead, toneForStage } from "../atoms";
import { MarkdownBlock } from "../markdown";
import type { AdrHistoryEntry, AdrRecord } from "../records";

export function FullRecord({ body }: { body: string | undefined }) {
  if (!body) return <Missing>This decision carries no authored body.</Missing>;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead anchor>Full record</SubHead>
      <div className="min-w-0 rounded-lg border border-line bg-surface-2/40 p-3.5">
        <MarkdownBlock markdown={body} />
      </div>
    </div>
  );
}

function EntryLine({ text, className }: { text: string | undefined; className: string }) {
  if (!text) return null;
  return <span className={className}>{text}</span>;
}

function HistoryEntry({ entry }: { entry: AdrHistoryEntry }) {
  return (
    <li className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-line-soft bg-surface-2/50 px-3 py-2">
      <StateBadge word={entry.state} tone={toneForStage(entry.state)} />
      <span className="font-mono text-[13px] text-ink-mid">{entry.date}</span>
      <EntryLine text={entry.by} className="font-mono text-[12.5px] text-ink-faint" />
      <EntryLine text={entry.source} className="min-w-0 font-mono text-[12.5px] break-words text-ink-faint" />
      <EntryLine text={entry.note} className="w-full min-w-0 font-serif text-[15.5px] leading-[1.5] text-ink-dim" />
    </li>
  );
}

function HistoryList({ history }: { history: AdrHistoryEntry[] }) {
  if (history.length === 0) return <Missing>This decision records no state change.</Missing>;
  return (
    <ul className="m-0 flex min-w-0 list-none flex-col gap-1.5 p-0">
      {history.map((entry, index) => (
        <HistoryEntry key={`${entry.state}-${entry.date}-${index}`} entry={entry} />
      ))}
    </ul>
  );
}

export function History({ history }: { history: AdrHistoryEntry[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead count={history.length} anchor>
        History
      </SubHead>
      <HistoryList history={history} />
    </div>
  );
}

export function AdrFooter({ record, title }: { record: AdrRecord; title: string }) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-5 gap-y-2 border-t border-line-soft pt-3">
      {record.source_pr !== undefined && record.source_pr !== null ? (
        <KeyValue label="source PR" value={record.source_pr} />
      ) : null}
      {record.approved_by ? <KeyValue label="approved by" value={record.approved_by} /> : null}
      <KeyValue label="id" value={record.id ?? title} />
    </div>
  );
}
