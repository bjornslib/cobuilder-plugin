/**
 * The record Sheet.
 *
 * Deep content does not belong in the scroll pane. An ADR carries fourteen fields,
 * including a full authored markdown body, a Gate 4b design carries six kilobytes of
 * prose, and a boundary rule carries a detail map whose keys differ by rule kind.
 * Stacking any of those inside a panel buries the panel's own subject. So the panel
 * shows the one line that matters and offers a control, and the whole record opens
 * here, in a Sheet over the pane.
 *
 * Two consequences are deliberate.
 *
 *   - The pane does not move when a Sheet opens, so a reader keeps their place in the
 *     work while they read the record.
 *   - The Sheet owns its own scroll on both axes, so a wide table in an ADR body keeps
 *     its integrity without the pane growing a second scrollbar.
 *
 * This file is presentational. It decides no verdict, computes no join, and reads no
 * file. Its caller holds the subject.
 */

import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";
import { AlertOctagon, ExternalLink, GitPullRequest, ListChecks, ScrollText } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ContextEntity, EpicDesignEntity, EpicEntity } from "@/data/types";

import type { DecisionCarrier } from "./model";
import type { AdrRecord } from "./records";
import { Box, Chip, KeyValue, Missing, SourceLine, StateBadge, SubHead, TextList, toneForStage } from "./atoms";
import { MarkdownBlock } from "./markdown";

/** Everything a Sheet can show. One member per record kind. */
export type SheetSubject =
  | {
      kind: "adr";
      /** The decision's own record from `adrs.js`, or undefined when the file lacked it. */
      record: AdrRecord | undefined;
      /** The row `entities.adr` holds, which is the only source for the title fallback. */
      title: string;
      state: string;
      /** The pull request this decision reached, from `joins.adr_to_pull_request`. */
      carrier: DecisionCarrier | undefined;
    }
  | {
      kind: "boundary";
      id: string;
      kindLabel: string;
      target: string;
      context: string;
      contextEntity: ContextEntity | undefined;
      detail: Record<string, unknown>;
    }
  | {
      kind: "epic-design";
      doc: EpicDesignEntity;
      epic: EpicEntity;
      /** How the epic design resolved: by the epic's id, or by the planning slug. */
      via: "id" | "plan slug";
      /** The ADR that introduced this record, when one names it. */
      adrRef: string | null;
    };

export interface RecordSheetProps {
  subject: SheetSubject | null;
  onOpenChange: (open: boolean) => void;
}

const ICON: Record<SheetSubject["kind"], LucideIcon> = {
  adr: ScrollText,
  boundary: AlertOctagon,
  "epic-design": ListChecks,
};

/** One scalar as text. Objects and nulls fall through to the caller's list reader. */
function scalar(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

/** One value as a list of lines. An entry that is not a string is shown as JSON. */
function lines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => scalar(entry) ?? JSON.stringify(entry))
    .filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

/** The detail map of a boundary rule, minus the two keys the caller already showed. */
function detailEntries(detail: Record<string, unknown>): Array<{ key: string; value: unknown }> {
  return Object.entries(detail)
    .filter(([key]) => key !== "target" && key !== "why")
    .map(([key, value]) => ({ key, value }));
}

export function RecordSheet({ subject, onOpenChange }: RecordSheetProps) {
  return (
    <Sheet open={subject !== null} onOpenChange={onOpenChange}>
      {subject === null ? null : (
        <SheetContent
          side="right"
          style={{ zIndex: "var(--layer-modal)" }}
          /*
           * The width override carries the same `data-[side=right]` variant the registry
           * item uses. Without the matching variant the registry's `w-3/4` wins on
           * specificity, and the Sheet renders 384 px wide, which is too narrow to read
           * an ADR's body in.
           */
          className="flex flex-col gap-0 p-0 data-[side=right]:w-[min(60rem,94vw)] data-[side=right]:sm:max-w-[min(60rem,94vw)]"
          aria-label="A record from the bundle"
        >
          {/*
            The Sheet is a modal surface, so it takes layer 4 from section 11.1. The
            overlay carries the same layer, one below the content it dims.
          */}
          <SheetHeader
            className="shrink-0 gap-1.5 border-b border-line bg-surface-2 p-4 pr-14"
            style={{ position: "relative", zIndex: "var(--layer-modal)" }}
          >
            <span className="flex flex-wrap items-center gap-2">
              <RecordIcon kind={subject.kind} />
              <SheetTitle className="min-w-0 font-mono text-[17px] font-bold tracking-[-0.01em]">
                {titleOf(subject)}
              </SheetTitle>
            </span>
            <SheetDescription className="font-serif text-[15.5px] leading-[1.5] text-ink-dim">
              {descriptionOf(subject)}
            </SheetDescription>
            <span className="flex flex-wrap items-center gap-2">
              {badgesOf(subject)}
            </span>
          </SheetHeader>

          {/* The Sheet owns its own scroll on both axes, so a wide block stays intact. */}
          <div className="min-h-0 min-w-0 flex-1 overflow-auto px-4 py-4">
            <SheetBody subject={subject} />
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}

function RecordIcon({ kind }: { kind: SheetSubject["kind"] }) {
  const Icon = ICON[kind];
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-accent-deep">
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

function titleOf(subject: SheetSubject): string {
  if (subject.kind === "adr") return subject.record?.title ?? subject.title;
  if (subject.kind === "boundary") return subject.target;
  return subject.doc.title;
}

function descriptionOf(subject: SheetSubject): string {
  if (subject.kind === "adr") {
    return "The whole decision record, as adrs.js writes it. The index carries three of these fields.";
  }
  if (subject.kind === "boundary") {
    return `A boundary rule the context ${subject.context} declares, with every field the record carries.`;
  }
  return `The Gate 4b technical solution design for epic ${subject.epic.epic_id}, resolved by ${subject.via}.`;
}

function badgesOf(subject: SheetSubject): ReactNode {
  if (subject.kind === "adr") {
    const record = subject.record;
    return (
      <>
        <StateBadge
          word={subject.state}
          tone={toneForStage(subject.state)}
          gloss="The decision's own state field."
        />
        <Chip>{subject.kind}</Chip>
        {record?.provenance ? <Chip>provenance: {record.provenance}</Chip> : null}
        {record?.maps_to?.unanchored ? (
          <Chip tone="warn" dashed title="No module anchors this rule. It is recorded, not enforced.">
            unanchored
          </Chip>
        ) : null}
      </>
    );
  }
  if (subject.kind === "boundary") {
    return (
      <>
        <Chip tone="warn">{subject.kindLabel}</Chip>
        <Chip title={subject.contextEntity?.path ?? "The index holds no context row."}>
          {subject.context}
        </Chip>
      </>
    );
  }
  return (
    <>
      <Chip>{subject.doc.feature_slug}</Chip>
      <Chip>{subject.epic.epic_id}</Chip>
      {subject.adrRef ? <Chip tone="accent">{subject.adrRef}</Chip> : null}
    </>
  );
}

function SheetBody({ subject }: { subject: SheetSubject }) {
  if (subject.kind === "adr") return <AdrBody subject={subject} />;
  if (subject.kind === "boundary") return <BoundaryBody subject={subject} />;
  return <EpicDesignBody subject={subject} />;
}

/* --------------------------------------------------------------------- adr */

function AdrBody({
  subject,
}: {
  subject: Extract<SheetSubject, { kind: "adr" }>;
}) {
  const record = subject.record;
  if (!record) {
    return (
      <Missing detail="adrs.js carries no entry for this id. The panel above read the title and the state from entities.adr in data/index.json.">
        The whole record is absent, so only the index's three fields are available.
      </Missing>
    );
  }

  const alternatives = record.alternatives ?? [];
  const forces = record.forces ?? [];
  const history = record.history ?? [];
  const delivers = record.delivers;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* The carrying pull request, beside the decision. Section 3.3. */}
      <SheetPanel
        title="The pull request that carried this decision"
        icon={GitPullRequest}
        tone={subject.carrier ? "accent" : "neutral"}
      >
        {subject.carrier ? (
          <div className="flex min-w-0 flex-col gap-2">
            <span className="flex flex-wrap items-center gap-2">
              <Chip tone="accent">
                <GitPullRequest className="size-3.5" aria-hidden="true" />
                PR {subject.carrier.pr}
              </Chip>
              <Chip title="The join that reached it, and the epics it walked.">
                via {subject.carrier.via}
              </Chip>
              {subject.carrier.onThisWork ? (
                <Chip tone="good">one of this work's own epics carries it</Chip>
              ) : (
                <Chip dashed className="text-ink-faint">
                  no epic of this work carries it
                </Chip>
              )}
            </span>
            {subject.carrier.entity ? (
              <p className="m-0 min-w-0 font-serif text-[16px] leading-[1.5] text-foreground">
                {subject.carrier.entity.title}
              </p>
            ) : (
              <Missing detail="entities.pull_request holds no row for this id.">
                The index carries no pull request row for {subject.carrier.pr}.
              </Missing>
            )}
            {subject.carrier.path.length > 0 ? (
              <SourceLine>
                joins.adr_to_pull_request walked {subject.carrier.path.length} epics:{" "}
                {subject.carrier.path.slice(0, 8).join(", ")}
                {subject.carrier.path.length > 8
                  ? `, and ${subject.carrier.path.length - 8} more`
                  : ""}
                .
              </SourceLine>
            ) : (
              <SourceLine>
                The join reached this pull request directly, with no epic on the path.
              </SourceLine>
            )}
          </div>
        ) : (
          <Missing detail="joins.adr_to_pull_request holds no entry for this decision, so no pull request carried it.">
            This decision reaches no pull request in this bundle.
          </Missing>
        )}
      </SheetPanel>

      {record.problem ? (
        <Box label="Problem" tone="problem">
          {record.problem}
        </Box>
      ) : null}

      {record.decision ? (
        <Box label="Decision" tone="solution">
          {record.decision}
        </Box>
      ) : null}

      {record.maps_to?.rule ? (
        <Box label="The rule this decision enforces">
          {record.maps_to.rule}
          <span className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
            {record.maps_to.context ? <Chip tone="accent">context {record.maps_to.context}</Chip> : null}
            {record.maps_to.district ? <Chip>district {record.maps_to.district}</Chip> : null}
            {(record.maps_to.modules ?? []).map((module) => (
              <Chip key={module} className="text-ink-faint">
                {module}
              </Chip>
            ))}
          </span>
        </Box>
      ) : (
        <Missing detail="adrs.js carries no maps_to.rule for this decision, so only the title is available.">
          This decision states no enforceable rule.
        </Missing>
      )}

      {alts(alternatives)}

      {forces.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-2">
          <SubHead count={forces.length}>Forces</SubHead>
          <TextList items={forces} />
        </div>
      ) : null}

      {delivers ? (
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
          <Box label="Capability">{delivers.capability}</Box>
          <Box label="Benefit" tone="solution">
            {delivers.benefit}
            {delivers.beneficiary.length > 0 ? (
              <span className="mt-2 flex flex-wrap items-center gap-1.5">
                {delivers.beneficiary.map((who) => (
                  <Chip key={who}>{who}</Chip>
                ))}
              </span>
            ) : null}
          </Box>
        </div>
      ) : null}

      {record.body ? (
        <div className="flex min-w-0 flex-col gap-2">
          <SubHead>Full record</SubHead>
          <div className="min-w-0 rounded-lg border border-line bg-surface-2/40 p-3.5">
            <MarkdownBlock markdown={record.body} />
          </div>
        </div>
      ) : (
        <Missing detail="adrs.js carries no body for this decision.">
          This decision carries no authored body.
        </Missing>
      )}

      <div className="flex min-w-0 flex-col gap-2">
        <SubHead count={history.length}>History</SubHead>
        {history.length > 0 ? (
          <ul className="m-0 flex min-w-0 list-none flex-col gap-1.5 p-0">
            {history.map((entry, index) => (
              <li
                key={`${entry.state}-${entry.date}-${index}`}
                className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-line-soft bg-surface-2/50 px-3 py-2"
              >
                <StateBadge word={entry.state} tone={toneForStage(entry.state)} />
                <span className="font-mono text-[13px] text-ink-mid">{entry.date}</span>
                {entry.by ? (
                  <span className="font-mono text-[12.5px] text-ink-faint">{entry.by}</span>
                ) : null}
                {entry.source ? (
                  <span className="min-w-0 font-mono text-[12.5px] break-words text-ink-faint">
                    read from {entry.source}
                  </span>
                ) : null}
                {entry.note ? (
                  <span className="w-full min-w-0 font-serif text-[15.5px] leading-[1.5] text-ink-dim">
                    {entry.note}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <Missing detail="No history array in this decision's record.">
            This decision records no state change.
          </Missing>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-baseline gap-x-5 gap-y-2 border-t border-line-soft pt-3">
        {record.source_pr !== undefined && record.source_pr !== null ? (
          <KeyValue label="source_pr" value={record.source_pr} />
        ) : null}
        {record.approved_by ? <KeyValue label="approved_by" value={record.approved_by} /> : null}
        <KeyValue label="id" value={subject.record?.id ?? subject.title} />
      </div>

      <SourceLine>
        read from <code>data/adrs.js</code>, one entry per decision. The carrying pull
        request comes from <code>joins.adr_to_pull_request</code>.
      </SourceLine>
    </div>
  );
}

function alts(alternatives: AdrRecord["alternatives"]): ReactNode {
  if (!alternatives || alternatives.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead count={alternatives.length}>Rejected alternatives</SubHead>
      <div className="flex min-w-0 flex-col gap-2">
        {alternatives.map((option, index) => (
          <div
            key={`alt-${index}`}
            className="min-w-0 rounded-lg border border-dashed border-line bg-surface-2/50 px-3.5 py-3"
          >
            <div className="min-w-0 font-serif text-[16.5px] leading-[1.55] font-semibold text-foreground">
              {option.option}
            </div>
            <p className="mt-1 mb-0 min-w-0 font-serif text-[15.5px] leading-[1.55] text-ink-dim">
              rejected because {option.rejected_because}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- boundary */

function BoundaryBody({
  subject,
}: {
  subject: Extract<SheetSubject, { kind: "boundary" }>;
}) {
  const entries = detailEntries(subject.detail);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Box label="The rule" tone="problem">
        {subject.kindLabel} · {subject.target}
      </Box>

      {typeof subject.detail.why === "string" ? (
        <Box label="Why" tone="note">
          {subject.detail.why}
        </Box>
      ) : null}

      <div className="flex min-w-0 flex-col gap-2">
        <SubHead count={entries.length}>Every other field on this rule</SubHead>
        {entries.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-2.5">
            {entries.map(({ key, value }) => {
              const one = scalar(value);
              const many = lines(value);
              return (
                <div
                  key={key}
                  className="min-w-0 rounded-lg border border-line-soft bg-surface-2/50 px-3 py-2"
                >
                  <div className="font-mono text-[12px] font-bold tracking-[0.06em] text-ink-faint uppercase">
                    {key}
                  </div>
                  {one !== null ? (
                    <p className="mt-1 mb-0 min-w-0 font-serif text-[15.5px] leading-[1.6] break-words text-ink-mid">
                      {one}
                    </p>
                  ) : many.length > 0 ? (
                    <div className="mt-1.5">
                      <TextList items={many} />
                    </div>
                  ) : (
                    <p className="mt-1 mb-0 font-mono text-[13px] break-words text-ink-dim">
                      {JSON.stringify(value)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <Missing detail="This rule carries only a target and a why, and both are shown above.">
            No further field is recorded on this rule.
          </Missing>
        )}
      </div>

      <SourceLine>
        read from <code>entities.boundary_rule[].detail</code> in{" "}
        <code>data/index.json</code>, filtered to the contexts a linked decision names.
      </SourceLine>
    </div>
  );
}

/* ------------------------------------------------------------- epic design */

function EpicDesignBody({
  subject,
}: {
  subject: Extract<SheetSubject, { kind: "epic-design" }>;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-5 gap-y-2">
        <KeyValue label="epic" value={subject.doc.epic_id} />
        <KeyValue label="feature_slug" value={subject.doc.feature_slug} />
        <KeyValue label="resolved by" value={subject.via} />
        <KeyValue label="characters" value={subject.doc.body_md.length.toLocaleString()} />
      </div>

      {subject.adrRef ? (
        <Box label="The decision this design answers" tone="note">
          {subject.adrRef}
        </Box>
      ) : null}

      <div className="min-w-0 rounded-lg border border-line bg-surface-2/40 p-3.5">
        <MarkdownBlock markdown={subject.doc.body_md} />
      </div>

      <SourceLine>
        read from <code>entities.epic_design</code> in <code>data/index.json</code>. The
        document is the Gate 4b technical solution design the build loop wrote.
      </SourceLine>
    </div>
  );
}

/** A titled block inside the Sheet. The Sheet's body is not a pane panel. */
function SheetPanel({
  title,
  icon: Icon,
  tone = "neutral",
  children,
}: {
  title: string;
  icon?: LucideIcon;
  tone?: "neutral" | "accent";
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-xl border bg-card",
        tone === "accent" ? "border-primary/60" : "border-line",
      )}
      aria-label={title}
    >
      <header className="flex min-w-0 items-center gap-2.5 border-b border-line-soft bg-surface-2 px-3.5 py-2">
        {Icon ? <Icon className="size-4 shrink-0 text-ink-faint" aria-hidden="true" /> : null}
        <h3 className="m-0 min-w-0 font-mono text-[13px] font-bold tracking-[0.04em] uppercase">
          {title}
        </h3>
        <ExternalLink className="ml-auto size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
      </header>
      <div className="min-w-0 px-3.5 py-3">{children}</div>
    </section>
  );
}
