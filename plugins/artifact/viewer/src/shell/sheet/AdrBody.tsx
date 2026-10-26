import { Missing } from "../atoms";
import { AdrFooter, FullRecord, History } from "./adrRecord";
import { DecisionBox, Delivers, Forces, ProblemBox, RuleBox, alts } from "./adrParts";
import type { AdrRecord } from "../records";
import type { SubjectOf } from "./subject";

function AbsentRecord() {
  return (
    <Missing>
      The whole record is absent, so only the decision&apos;s title and its state are
      available.
    </Missing>
  );
}

function AdrTop({ record }: { record: AdrRecord }) {
  return (
    <>
      <ProblemBox record={record} />
      <DecisionBox record={record} />
      <RuleBox record={record} />
      {alts(record.alternatives ?? [])}
    </>
  );
}

function AdrBottom({ record, title }: { record: AdrRecord; title: string }) {
  return (
    <>
      <Forces forces={record.forces ?? []} />
      <Delivers delivers={record.delivers} />
      <FullRecord body={record.body} />
      <History history={record.history ?? []} />
      <AdrFooter record={record} title={title} />
    </>
  );
}

export function AdrBody({ subject }: { subject: SubjectOf<"adr"> }) {
  const record = subject.record;
  if (!record) return <AbsentRecord />;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <AdrTop record={record} />
      <AdrBottom record={record} title={subject.title} />
    </div>
  );
}
