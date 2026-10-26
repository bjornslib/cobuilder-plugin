import type { ReactNode } from "react";

import { Boxes } from "lucide-react";

import type { DesignAlternative } from "@/data/bundle";
import type { ContextEntity, DistrictEntity } from "@/data/types";

import { Chip, Missing, Panel } from "../../atoms";
import type { WorkItem } from "../../model";

/**
 * Districts and alternatives considered, merged.
 *
 * The engineer asked to see how the two could merge, and the merge only works at a
 * tighter density. Measured before this change: the reach panel was 440 px and the nine
 * alternatives were 1183 px, so a merge that kept both shapes would have been 1623 px,
 * or three pages of this stage, which is worse than two sections. So the reach loses its
 * two sub-heading rules and its gaps and becomes one strip of chips, and each
 * alternative loses its card padding and sets its two parts on one flowing line.
 *
 * THE REACH STRIP CARRIES PLAIN LABELS, NOT SUB-HEADINGS. `SubHead` draws a tinted bar
 * with a rule under it, which is what made the old panel tall. The two labels here are
 * the shell's 12 px mono label, the same one the top line uses for `branch` and `epics`.
 * Their counts are gone with the sub-headings: the chips are the count.
 *
 * THE ALTERNATIVE ROWS FLOW. The option keeps its semibold weight and the reason keeps
 * the dim ink, and the two share one line that wraps, so a row costs a line or two
 * instead of a padded card.
 */
export function DistrictsAndAlternativesSection({ work }: { work: WorkItem }) {
  const alternatives = work.record?.intent?.alternatives ?? [];
  const absent = work.contexts.length + work.districts.length + alternatives.length === 0;
  return (
    <Panel title="Districts and alternatives considered" icon={Boxes} absent={absent} count={alternatives.length}
      lead="The location of each decision in the code, and the rejected options.">
      <ReachStrip work={work} />
      <Alternatives alternatives={alternatives} />
    </Panel>
  );
}

function ReachStrip({ work }: { work: WorkItem }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5">
      {/* The reach: one strip, two labels, their chips, and the uncovered line. */}
      <ReachGroup label="contexts" empty="No linked decision names a context." chips={contextChips(work.contexts)} />
      <ReachGroup label="districts" empty="No linked decision names a district." chips={districtChips(work.districts)} />
      <UncoveredLine work={work} />
    </div>
  );
}

const REACH_LABEL_CLASS = "shrink-0 font-mono text-[12px] tracking-[0.05em] text-ink-faint uppercase";

function ReachGroup({ label, empty, chips }: { label: string; empty: string; chips: ReactNode[] }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span className={REACH_LABEL_CLASS}>{label}</span>
      {chips.length > 0 ? chips : <span className="font-mono text-[12px] text-ink-faint">{empty}</span>}
    </span>
  );
}

function contextChips(contexts: ContextEntity[]): ReactNode[] {
  return contexts.map((context) => (
    <Chip key={context.id} tone="accent" title={context.path}>
      {context.id}
    </Chip>
  ));
}

function districtChips(districts: DistrictEntity[]): ReactNode[] {
  return districts.map((district) => <Chip key={district.id}>{district.label}</Chip>);
}

function UncoveredLine({ work }: { work: WorkItem }) {
  return work.districtsUncovered.length > 0 ? (
    <span className="min-w-0 font-mono text-[12px] text-ink-faint">
      {work.districtsUncovered.map((district) => district.label).join(", ")} carries no
      verifying context.
    </span>
  ) : null;
}

function Alternatives({ alternatives }: { alternatives: DesignAlternative[] }) {
  if (alternatives.length === 0) return <Missing>No alternative is recorded.</Missing>;
  return (
    <div className="mt-3 flex min-w-0 flex-col gap-1.5">
      {alternatives.map((alt, index) => (
        <AlternativeRow key={`${index}-${alt.option.slice(0, 20)}`} alt={alt} />
      ))}
    </div>
  );
}

function AlternativeRow({ alt }: { alt: DesignAlternative }) {
  return (
    <div className="min-w-0 rounded-lg border border-dashed border-line bg-surface-2/40 px-3 py-2">
      <p className="m-0 min-w-0 font-serif text-[15.5px] leading-[1.45] text-ink-dim">
        <span className="font-semibold text-foreground">{alt.option}</span>{" "}
        rejected because {alt.rejected_because}
      </p>
    </div>
  );
}
