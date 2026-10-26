import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { STAGE_GLOSS, isKnownStage } from "@/data/bundle";
import { cn } from "@/lib/utils";

/**
 * The stage colours follow the prototype's `.badge.st-*` rules. A stage with no rule
 * falls back to the plain badge, so a stage from a newer index never reads as an error.
 */
const STAGE_CLASS: Record<string, string> = {
  review: "border-primary bg-accent-wash text-accent-deep",
  approved: "border-good bg-good-wash text-good",
  implemented: "border-good bg-good-wash text-good",
  backlog: "border-warn bg-warn-wash text-warn",
  decided: "border-warn bg-warn-wash text-warn",
  superseded: "border-dashed text-ink-faint",
};

function badgeClass(stage: string, className?: string): string {
  return cn(
    "font-mono text-[9.5px] tracking-[0.06em] uppercase",
    STAGE_CLASS[stage],
    className,
  );
}

function StageGlossTip({ stage }: { stage: string }) {
  const gloss = isKnownStage(stage) ? STAGE_GLOSS[stage] : null;

  return (
    <TooltipContent className="max-w-64 font-serif text-[13px] leading-snug">
      {gloss ?? `Stage "${stage}" is newer than this scaffold knows.`}
    </TooltipContent>
  );
}

/*
 * `data-slot` is set twice on purpose. Radix `Slot` hands the trigger's own
 * `data-slot="tooltip-trigger"` to the child, and `Badge` spreads its remaining props
 * after its own `data-slot="badge"`. Without the second one, the badge reports itself
 * as a tooltip trigger and loses the hook a shadcn selector looks for.
 */
interface StageBadgeProps {
  stage: string;
  className?: string;
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge data-slot="badge" variant="outline" className={badgeClass(stage, className)}>
          {stage}
        </Badge>
      </TooltipTrigger>
      <StageGlossTip stage={stage} />
    </Tooltip>
  );
}
