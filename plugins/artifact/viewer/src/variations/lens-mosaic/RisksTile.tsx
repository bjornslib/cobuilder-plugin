/**
 * The Risks and verdict lens. A standard tile carrying the real assessment.
 *
 * Every value here is read from `assessment.json`. The verdict, its findings, the
 * risk tier, the stage, and the two cost paragraphs are all authored record. Nothing
 * is derived and no severity is guessed: where the record holds no severity, the
 * finding card says so rather than filling in "medium".
 */

import { AlertTriangle, CheckCircle2, Gavel, ShieldAlert, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  AbsentLine,
  Chip,
  ContentCard,
  Disclosure,
  EmptyLensBody,
  LensTile,
  LoadingLine,
  Prose,
  ProseBox,
  ScrollList,
  SectionLabel,
} from "./primitives";
import { absenceNote, risksStatus } from "./lenses";
import type { Assessment, DesignRecord, Finding, RecordsLoad } from "./records";

const VERDICT: Record<string, { tone: string; gloss: string; icon: typeof CheckCircle2 }> = {
  proceed: {
    tone: "border-good bg-good-wash text-good",
    gloss: "The design is sound. The build can start.",
    icon: CheckCircle2,
  },
  concerns: {
    tone: "border-warn bg-warn-wash text-warn",
    gloss:
      "The design is sound, and something it accepts costs more than it should. The concern is named in the findings.",
    icon: AlertTriangle,
  },
  rework: {
    tone: "border-destructive bg-danger-wash text-destructive",
    gloss: "The design needs changes before a build starts.",
    icon: XCircle,
  },
};

const SEVERITY_TONE: Record<string, "warn" | "plain" | "muted"> = {
  high: "warn",
  medium: "plain",
  low: "muted",
};

/** The assessment stage, in the words this repository already uses for it. */
const STAGE_GLOSS: Record<string, string> = {
  design:
    "Written before the code exists, so its findings are predictions rather than observations.",
  retrospective:
    "Written after the design shipped, so its findings are observations or drift reports.",
};

export function RisksTile({
  record,
  load,
  designId,
}: {
  record: DesignRecord | null;
  load: RecordsLoad;
  designId: string;
}) {
  const status = risksStatus(record, designId);
  const assessment: Assessment | undefined = record?.assessment;
  const absent = load.state === "ready" && !status.present;
  const findings = assessment?.findings ?? [];
  const verdict = assessment?.verdict ?? null;

  const sub =
    load.state === "loading"
      ? "reading assessment.json"
      : load.state === "failed"
        ? "the authored records did not load"
        : absent
          ? "no assessment"
          : `${findings.length} ${findings.length === 1 ? "finding" : "findings"} · verdict ${verdict ?? "not recorded"}`;

  return (
    <LensTile
      icon={Gavel}
      title="Risks and verdict"
      sub={sub}
      muted={absent || load.state === "failed"}
    >
      {load.state === "loading" ? (
        <LoadingLine>Reading the assessment for {designId}.</LoadingLine>
      ) : null}

      {load.state === "failed" ? (
        <LoadingLine>
          The authored records did not load, so this lens cannot read the assessment.
        </LoadingLine>
      ) : null}

      {absent ? (
        <EmptyLensBody
          file={`docs/architecture/designs/${designId}/assessment.json`}
          what={status.missing}
          note={absenceNote(record)}
        />
      ) : null}

      {load.state === "ready" && status.present ? (
        <div className="flex flex-col gap-3.5">
          <VerdictBanner verdict={verdict} />

          <div className="flex flex-wrap gap-1.5">
            {assessment?.risk_tier ? (
              <Chip tone="warn" title="assessment.json: risk_tier">
                risk tier {assessment.risk_tier}
              </Chip>
            ) : null}
            {assessment?.stage ? (
              <Chip
                tone="accent"
                title={STAGE_GLOSS[assessment.stage] ?? "assessment.json: stage"}
              >
                {assessment.stage} stage
              </Chip>
            ) : null}
            {assessment?.captured ?? assessment?.assessed ? (
              <Chip tone="muted">
                assessed {assessment.captured ?? assessment.assessed}
              </Chip>
            ) : null}
          </div>

          {assessment?.summary ? (
            <ProseBox title="Summary" source="assessment.json">
              <Prose>{assessment.summary}</Prose>
            </ProseBox>
          ) : null}

          {findings.length > 0 ? (
            <div>
              <SectionLabel count={findings.length}>Findings</SectionLabel>
              <ScrollList
                label="Findings"
                count={findings.length}
                maxClass="max-h-[52vh]"
              >
                <div className="flex flex-col gap-2">
                  {findings.map((finding, index) => (
                    <FindingCard key={finding.id ?? index} finding={finding} />
                  ))}
                </div>
              </ScrollList>
            </div>
          ) : null}

          {assessment?.drift?.length ? (
            <div>
              <SectionLabel count={assessment.drift.length}>
                Drift reports
              </SectionLabel>
              <div className="flex flex-col gap-2">
                {assessment.drift.map((entry, index) => (
                  <DriftCard key={index} entry={entry} />
                ))}
              </div>
            </div>
          ) : null}

          {assessment?.boundary_checks?.length ? (
            <Disclosure
              label="Boundary checks the assessment ran"
              count={assessment.boundary_checks.length}
            >
              <div className="flex flex-col gap-2">
                {assessment.boundary_checks.map((entry, index) => (
                  <BoundaryCard key={index} entry={entry} />
                ))}
              </div>
            </Disclosure>
          ) : null}

          {assessment?.constraint_introduced ? (
            <Disclosure label="Constraint this design introduces">
              <ProseBox title="Constraint" source="assessment.json">
                <Prose>{assessment.constraint_introduced}</Prose>
              </ProseBox>
            </Disclosure>
          ) : null}

          {assessment?.regret_risk ? (
            <Disclosure label="Regret risk if this ships as written">
              <ProseBox title="Regret risk" source="assessment.json">
                <Prose>{assessment.regret_risk}</Prose>
              </ProseBox>
            </Disclosure>
          ) : null}

          <p className="m-0 font-mono text-[12px] text-ink-faint">
            read from docs/architecture/designs/{designId}/assessment.json
          </p>
        </div>
      ) : null}
    </LensTile>
  );
}

function VerdictBanner({ verdict }: { verdict: string | null }) {
  const shape = verdict ? VERDICT[verdict] : null;
  const Icon = shape?.icon ?? ShieldAlert;
  return (
    <div
      className={cn(
        "rounded-lg border px-3.5 py-3",
        shape?.tone ?? "border-dashed border-line bg-surface-2 text-ink-dim",
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
        <div>
          <p className="m-0 font-mono text-[22px] leading-none font-bold">
            {verdict ?? "no verdict"}
          </p>
          <p className="m-0 mt-1.5 max-w-[74ch] font-serif text-[15.5px] leading-[1.5]">
            {shape?.gloss ??
              `The assessment records no verdict this variation knows. It prints the value as the record carries it.`}
          </p>
        </div>
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const severity = finding.severity;
  return (
    <div className="rounded-lg border border-line bg-card px-3.5 py-3">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        {finding.id ? <Chip tone="muted">{finding.id}</Chip> : null}
        {severity ? (
          <Chip tone={SEVERITY_TONE[severity] ?? "plain"}>{severity}</Chip>
        ) : (
          <Chip tone="muted">no severity recorded</Chip>
        )}
        {finding.kind ? <Chip tone="accent">{finding.kind}</Chip> : null}
      </div>
      <p className="m-0 font-mono text-[15.5px] leading-[1.4] font-bold">
        {finding.title ?? "untitled finding"}
      </p>
      {finding.detail ? (
        <div className="mt-1.5">
          <Prose>{finding.detail}</Prose>
        </div>
      ) : null}
      {finding.cites ? (
        <p className="m-0 mt-2 font-mono text-[12px] leading-[1.5] text-ink-faint">
          cites {finding.cites}
        </p>
      ) : null}
    </div>
  );
}

function DriftCard({ entry }: { entry: unknown }) {
  const shaped = entry as { title?: string; detail?: string };
  if (typeof shaped?.title === "string") {
    return (
      <ContentCard label="drift" labelTone="warn" title={shaped.title}>
        {shaped.detail ?? ""}
      </ContentCard>
    );
  }
  return (
    <AbsentLine>
      This drift report is not a shape this prototype prints. The record is at
      assessment.json and it was not changed.
    </AbsentLine>
  );
}

function BoundaryCard({ entry }: { entry: unknown }) {
  if (typeof entry === "string") {
    return <ContentCard label="boundary rule">{entry}</ContentCard>;
  }
  const shaped = entry as { rule?: string; result?: string; note?: string; detail?: string };
  if (typeof shaped?.rule === "string") {
    const holds = shaped.result === "holds" || shaped.result === "pass";
    return (
      <ContentCard
        label={shaped.result ?? "checked"}
        labelTone={holds ? "good" : "warn"}
        title={shaped.rule}
      >
        {shaped.note ?? shaped.detail ?? ""}
      </ContentCard>
    );
  }
  return (
    <AbsentLine>
      This boundary check is not a shape this prototype prints. The record is at
      assessment.json and it was not changed.
    </AbsentLine>
  );
}
