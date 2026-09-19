import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { STAGE_GLOSS, isKnownStage } from "@/data/bundle";
import { cn } from "@/lib/utils";

/**
 * The stage colours follow the prototype's `.badge.st-*` rules.
 *
 * A stage with no rule falls back to the plain badge, so an unknown stage from a
 * newer index reads as itself and never as an error.
 */
const STAGE_CLASS: Record<string, string> = {
  review: "border-primary bg-accent-wash text-accent-deep",
  approved: "border-good bg-good-wash text-good",
  implemented: "border-good bg-good-wash text-good",
  backlog: "border-warn bg-warn-wash text-warn",
  decided: "border-warn bg-warn-wash text-warn",
  superseded: "border-dashed text-ink-faint",
};

export function StageBadge({
  stage,
  className,
}: {
  stage: string;
  className?: string;
}) {
  const gloss = isKnownStage(stage) ? STAGE_GLOSS[stage] : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/*
         * `data-slot` is set twice on purpose. Radix `Slot` hands the trigger's
         * own `data-slot="tooltip-trigger"` down to the child, and `Badge` spreads
         * its remaining props after its own `data-slot="badge"`. Without this line
         * the badge reports itself as a tooltip trigger, and the hook a shadcn
         * selector looks for on a badge is gone.
         */}
        <Badge
          data-slot="badge"
          variant="outline"
          className={cn(
            "font-mono text-[9.5px] tracking-[0.06em] uppercase",
            STAGE_CLASS[stage],
            className,
          )}
        >
          {stage}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 font-serif text-[13px] leading-snug">
        {gloss ?? `Stage "${stage}" is newer than this scaffold knows.`}
      </TooltipContent>
    </Tooltip>
  );
}
