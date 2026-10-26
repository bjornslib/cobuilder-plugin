import type { ReactNode } from "react";

import TiltCard from "@/components/smoothui/tilt-card";
import type { BoundaryRule } from "@/data/works";
import { cn } from "@/lib/utils";

import { Chip, TINT_BAR } from "../../atoms";
import { excerpt } from "../../records";

const TILE_CLASS =
  "flex h-full min-w-0 flex-col gap-2 rounded-lg border border-line-soft bg-surface-2/50 px-3.5 py-2.5 transition-colors duration-150 ease-house hover:bg-surface-3";

const WHY_CLASS = "m-0 min-w-0 font-serif text-[15.5px] leading-[1.5] text-ink-dim";

function BoundaryHead({ rule }: { rule: BoundaryRule }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <Chip tone="warn">{rule.kind}</Chip>
      {/* The card's own sub-heading, so it takes the level-three bar. */}
      <span className={cn("min-w-0 font-mono text-[13.5px] break-words", TINT_BAR)}>{rule.target}</span>
    </span>
  );
}

/*
  SIXTEEN SMALL TILES, AND THEY ARE THE ONE BEST FIT FOR A TILT. A reader
  picks one up with the pointer, and the two lines it holds do not need to
  be read in a fixed plane. `glare={false}` is the tilt-without-glare
  variant: the component renders its glare overlay only when `glare` is
  true, so the prop is the whole difference.
*/
export function BoundaryTile({ rule, children }: { rule: BoundaryRule; children: ReactNode }) {
  return (
    <TiltCard className="h-full" glare={false}>
      <div className={TILE_CLASS}>
        <BoundaryHead rule={rule} />
        {rule.why ? <p className={WHY_CLASS}>{excerpt(rule.why, 180)}</p> : null}
        {children}
      </div>
    </TiltCard>
  );
}
