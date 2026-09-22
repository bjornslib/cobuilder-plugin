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
 * The Sheet names no source. It used to close every body with a line saying which file
 * the record came from, and the engineer removed every one of those lines from the
 * shell. A reader who opens a decision record wants the record, not the path it was
 * read from.
 *
 * The Sheet carries no pull request block either. It used to open with one, saying
 * which pull request reached the decision, naming its title, and counting the epics on
 * the join's path. The engineer removed it: the work item's own state already says
 * whether the work reached a pull request, so the decision did not need to say it a
 * second time.
 *
 * This file is presentational. It decides no verdict, computes no join, and reads no
 * file. Its caller holds the subject.
 */

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";
import { AlertOctagon, ListChecks, ScrollText } from "lucide-react";
import { useReducedMotion } from "motion/react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ContextEntity, EpicDesignEntity, EpicEntity } from "@/data/types";
import { cn } from "@/lib/utils";

import type { AdrRecord } from "./records";
import {
  Box,
  Chip,
  KeyValue,
  Missing,
  SHEET_HEADING_ATTR,
  StateBadge,
  SubHead,
  TextList,
  toneForStage,
} from "./atoms";
import { MarkdownBlock } from "./markdown";

/** Everything a Sheet can show. One member per record kind. */
export type SheetSubject =
  | {
      kind: "adr";
      /** The decision's own record, or undefined when the bundle lacked it. */
      record: AdrRecord | undefined;
      /** The row the index holds, which is the only source for the title fallback. */
      title: string;
      state: string;
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

/* --------------------------------------------------------------- jumplinks */

/**
 * The Sheet's own scroll container, held as the element the reader works on.
 *
 * IT ARRIVES AFTER THE FIRST RENDER, which is why this is a callback ref and not a
 * lookup by id. The Sheet is a portal that Radix mounts when a subject opens, so an
 * effect that ran on the open would find nothing and never look again. A ref callback
 * puts the element into state the moment it exists, and the reader below re-runs on it.
 *
 * The row lives above the container rather than inside it, so it stays put while the
 * record scrolls under it, and no sticky offset is needed when a link lands a heading.
 */

/** One link in the row. */
interface SheetHeading {
  id: string;
  label: string;
}

/** The id a heading's own words become, so the link and the heading cannot drift. */
function headingId(label: string): string {
  return `sheet-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

/**
 * The headings the record rendered, in document order.
 *
 * THE RECORD DECIDES THE LIST. `Box` and `SubHead` mark the parts they render, and this
 * reads the marks the way the pane's link bar reads panels, so a record with different
 * parts gets its own row with no code change and no list to keep in step.
 *
 * A heading's label is its first element child's text, which is where both atoms put
 * the words they render. Reading the whole element would swallow `SubHead`'s count.
 *
 * The id is assigned here when the heading lacks one, because the reader is the only
 * place that knows the label and the DOM is its own to address. Setting an attribute
 * fires no child-list mutation, so the observer below cannot loop on itself.
 */
function useSheetHeadings(scroll: HTMLElement | null, keys: readonly unknown[]): SheetHeading[] {
  const [headings, setHeadings] = useState<SheetHeading[]>([]);
  const signature = keys.join("|");

  useEffect(() => {
    if (scroll === null) {
      setHeadings((current) => (current.length === 0 ? current : []));
      return;
    }

    const read = () => {
      const found = Array.from(scroll.querySelectorAll<HTMLElement>(`[${SHEET_HEADING_ATTR}]`)).map(
        (element) => {
          const label = (element.firstElementChild?.textContent ?? "").trim();
          if (element.id === "") element.id = headingId(label);
          return { id: element.id, label };
        },
      );
      setHeadings((current) =>
        current.length === found.length &&
        current.every((entry, index) => entry.id === found[index].id && entry.label === found[index].label)
          ? current
          : found,
      );
    };

    read();
    const observer = new MutationObserver(read);
    observer.observe(scroll, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [scroll, signature]);

  return headings;
}

/**
 * The row itself.
 *
 * A `nav` of anchors, like the pane's link bar, so a link is focusable and
 * right-clickable. The press is intercepted, because the record scrolls inside its own
 * container and a hash write would move the document instead.
 *
 * The row scrolls sideways when it overflows, so a record with many parts keeps every
 * link reachable rather than clipping the last one.
 */
function SheetJumpLinks({
  headings,
  scroll,
}: {
  headings: SheetHeading[];
  scroll: HTMLElement | null;
}) {
  const reduce = useReducedMotion() ?? false;

  const jump = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      event.preventDefault();
      const target = document.getElementById(id);
      if (!scroll || !target) return;
      const delta = target.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
      scroll.scrollTo({
        top: scroll.scrollTop + delta,
        /* The reader's horizontal offset is theirs and it stays. */
        left: scroll.scrollLeft,
        behavior: reduce ? "instant" : "smooth",
      });
      /* The heading keeps focus, so a keyboard reader lands where the pointer did. */
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    },
    [reduce, scroll],
  );

  if (headings.length === 0) return null;

  return (
    <nav
      aria-label="Parts of this record"
      className="flex min-w-0 shrink-0 items-center gap-1 overflow-x-auto overscroll-x-contain border-b border-line bg-surface px-4 py-1.5"
    >
      {headings.map((heading) => (
        <a
          key={heading.id}
          href={`#${heading.id}`}
          onClick={(event) => jump(event, heading.id)}
          className={cn(
            "inline-flex min-h-8 shrink-0 cursor-pointer items-center rounded-md border border-transparent px-2.5 font-mono text-[12.5px] whitespace-nowrap text-ink-dim",
            "transition-colors duration-150 ease-house hover:bg-surface-2 hover:text-foreground",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          )}
        >
          {heading.label}
        </a>
      ))}
    </nav>
  );
}

export function RecordSheet({ subject, onOpenChange }: RecordSheetProps) {
  /*
   * The scroll container as state, because the portal mounts it after the first render.
   * The row re-reads when another record opens, which is the only other time it changes.
   */
  const [scroll, setScroll] = useState<HTMLDivElement | null>(null);
  const attachScroll = useCallback((element: HTMLDivElement | null) => setScroll(element), []);
  const headings = useSheetHeadings(scroll, [
    subject?.kind ?? "",
    subject === null ? "" : titleOf(subject),
  ]);

  return (
    <Sheet open={subject !== null} onOpenChange={onOpenChange}>
      {subject === null ? null : (
        <SheetContent
          side="right"
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
            style={{ position: "relative" }}
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

          <SheetJumpLinks headings={headings} scroll={scroll} />

          {/* The Sheet owns its own scroll on both axes, so a wide block stays intact. */}
          <div ref={attachScroll} className="min-h-0 min-w-0 flex-1 overflow-auto px-4 py-4">
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
    return "The whole decision record, with every field the bundle keeps for it.";
  }
  if (subject.kind === "boundary") {
    return `A boundary rule the context ${subject.context} declares, with every field the record carries.`;
  }
  return `The Gate 4b technical solution design for epic ${subject.epic.epic_id}.`;
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
      <Missing>
        The whole record is absent, so only the decision&apos;s title and its state are
        available.
      </Missing>
    );
  }

  const alternatives = record.alternatives ?? [];
  const forces = record.forces ?? [];
  const history = record.history ?? [];
  const delivers = record.delivers;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {record.problem ? (
        <Box label="Problem" tone="problem" anchor>
          {record.problem}
        </Box>
      ) : null}

      {record.decision ? (
        <Box label="Decision" tone="solution" anchor>
          {record.decision}
        </Box>
      ) : null}

      {record.maps_to?.rule ? (
        <Box label="The rule this decision enforces" anchor>
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
        <Missing>
          This decision states no enforceable rule, so only the title is available.
        </Missing>
      )}

      {alts(alternatives)}

      {forces.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-2">
          <SubHead count={forces.length} anchor>
            Forces
          </SubHead>
          <TextList items={forces} />
        </div>
      ) : null}

      {delivers ? (
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
          <Box label="Capability" anchor>
            {delivers.capability}
          </Box>
          <Box label="Benefit" tone="solution" anchor>
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
          <SubHead anchor>Full record</SubHead>
          <div className="min-w-0 rounded-lg border border-line bg-surface-2/40 p-3.5">
            <MarkdownBlock markdown={record.body} />
          </div>
        </div>
      ) : (
        <Missing>This decision carries no authored body.</Missing>
      )}

      <div className="flex min-w-0 flex-col gap-2">
        <SubHead count={history.length} anchor>
        History
      </SubHead>
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
                    {entry.source}
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
          <Missing>This decision records no state change.</Missing>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-baseline gap-x-5 gap-y-2 border-t border-line-soft pt-3">
        {record.source_pr !== undefined && record.source_pr !== null ? (
          <KeyValue label="source PR" value={record.source_pr} />
        ) : null}
        {record.approved_by ? <KeyValue label="approved by" value={record.approved_by} /> : null}
        <KeyValue label="id" value={subject.record?.id ?? subject.title} />
      </div>
    </div>
  );
}

function alts(alternatives: AdrRecord["alternatives"]): ReactNode {
  if (!alternatives || alternatives.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead count={alternatives.length} anchor>
        Rejected alternatives
      </SubHead>
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
          <Missing>
            No further field is recorded on this rule, beyond the target and the reason
            above.
          </Missing>
        )}
      </div>
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
        <KeyValue label="plan" value={subject.doc.feature_slug} />
        <KeyValue label="characters" value={subject.doc.body_md.length.toLocaleString()} />
      </div>

      <div className="min-w-0 rounded-lg border border-line bg-surface-2/40 p-3.5">
        <MarkdownBlock markdown={subject.doc.body_md} />
      </div>
    </div>
  );
}
