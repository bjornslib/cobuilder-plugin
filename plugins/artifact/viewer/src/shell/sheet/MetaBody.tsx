import { KeyValue } from "../atoms";
import { MarkdownBlock } from "../markdown";

interface MetaBodyProps {
  leadLabel: string;
  leadValue: string;
  doc: { feature_slug: string; body_md: string };
}

function MetaFacts({ leadLabel, leadValue, doc }: MetaBodyProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-5 gap-y-2">
      <KeyValue label={leadLabel} value={leadValue} />
      <KeyValue label="plan" value={doc.feature_slug} />
      <KeyValue label="characters" value={doc.body_md.length.toLocaleString()} />
    </div>
  );
}

export function MetaBody(props: MetaBodyProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <MetaFacts {...props} />
      <div className="min-w-0 rounded-lg border border-line bg-surface-2/40 p-3.5">
        <MarkdownBlock markdown={props.doc.body_md} />
      </div>
    </div>
  );
}
