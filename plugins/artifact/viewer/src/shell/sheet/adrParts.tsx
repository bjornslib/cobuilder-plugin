import type { ReactNode } from "react";

import { Box, Chip, Missing, SubHead, TextList } from "../atoms";
import type { AdrDelivers, AdrMapsTo, AdrRecord } from "../records";

interface RecordProps {
  record: AdrRecord;
}

export function ProblemBox({ record }: RecordProps) {
  if (!record.problem) return null;
  return (
    <Box label="Problem" tone="problem" anchor>
      {record.problem}
    </Box>
  );
}

export function DecisionBox({ record }: RecordProps) {
  if (!record.decision) return null;
  return (
    <Box label="Decision" tone="solution" anchor>
      {record.decision}
    </Box>
  );
}

function NoRule() {
  return (
    <Missing>
      This decision states no enforceable rule, so only the title is available.
    </Missing>
  );
}

export function RuleBox({ record }: RecordProps) {
  const maps = record.maps_to;
  if (!maps?.rule) return <NoRule />;
  return (
    <Box label="The rule this decision enforces" anchor>
      {maps.rule}
      <RuleChips maps={maps} />
    </Box>
  );
}

function RuleChips({ maps }: { maps: AdrMapsTo }) {
  return (
    <span className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
      {maps.context ? <Chip tone="accent">context {maps.context}</Chip> : null}
      {maps.district ? <Chip>district {maps.district}</Chip> : null}
      {(maps.modules ?? []).map((module) => (
        <Chip key={module} className="text-ink-faint">{module}</Chip>
      ))}
    </span>
  );
}

export function Forces({ forces }: { forces: string[] }) {
  if (forces.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead count={forces.length} anchor>
        Forces
      </SubHead>
      <TextList items={forces} />
    </div>
  );
}

function Beneficiaries({ who }: { who: string[] }) {
  if (who.length === 0) return null;
  return (
    <span className="mt-2 flex flex-wrap items-center gap-1.5">
      {who.map((name) => (
        <Chip key={name}>{name}</Chip>
      ))}
    </span>
  );
}

function BenefitBox({ delivers }: { delivers: AdrDelivers }) {
  return (
    <Box label="Benefit" tone="solution" anchor>
      {delivers.benefit}
      <Beneficiaries who={delivers.beneficiary} />
    </Box>
  );
}

export function Delivers({ delivers }: { delivers: AdrDelivers | null | undefined }) {
  if (!delivers) return null;
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
      <Box label="Capability" anchor>
        {delivers.capability}
      </Box>
      <BenefitBox delivers={delivers} />
    </div>
  );
}

function Alternative({ option }: { option: NonNullable<AdrRecord["alternatives"]>[number] }) {
  return (
    <div className="min-w-0 rounded-lg border border-dashed border-line bg-surface-2/50 px-3.5 py-3">
      <div className="min-w-0 font-serif text-[16.5px] leading-[1.55] font-semibold text-foreground">
        {option.option}
      </div>
      <p className="mt-1 mb-0 min-w-0 font-serif text-[15.5px] leading-[1.55] text-ink-dim">
        rejected because {option.rejected_because}
      </p>
    </div>
  );
}

type Alternatives = NonNullable<AdrRecord["alternatives"]>;

function AlternativeList({ alternatives }: { alternatives: Alternatives }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {alternatives.map((option, index) => (
        <Alternative key={`alt-${index}`} option={option} />
      ))}
    </div>
  );
}

export function alts(alternatives: AdrRecord["alternatives"]): ReactNode {
  if (!alternatives || alternatives.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead count={alternatives.length} anchor>
        Rejected alternatives
      </SubHead>
      <AlternativeList alternatives={alternatives} />
    </div>
  );
}
