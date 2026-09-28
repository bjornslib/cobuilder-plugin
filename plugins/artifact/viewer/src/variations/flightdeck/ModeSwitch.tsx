/**
 * The one control that moves the surface between its two modes.
 *
 * ONE SURFACE, TWO POSITIONS, ONE PRESS. The control owns no content: it reports the
 * mode it was given and asks for the mode a press names. The surface above it holds the
 * reader's state, so a press swaps the body and changes nothing else — no navigation, no
 * reload, and no second page.
 *
 * A TWO-POSITION SEGMENTED CONTROL, NOT A DROPDOWN. A reader has to be able to see that
 * a second mode exists, and a closed select hides exactly that. Both positions are on
 * screen, the live one is marked, and the second one carries a `design` marker so nobody
 * presses it expecting built behaviour.
 *
 * `aria-current` marks the live position, because the two are peers rather than a
 * checked pair. `aria-pressed` would say the control toggles itself.
 */

import { cn } from "@/lib/utils";
import { BAND_FOCUS } from "@/shell/atoms";

export type Mode = "single" | "multi";

const POSITIONS: Array<{ id: Mode; label: string; note: string }> = [
  {
    id: "single",
    label: "One pull request",
    note: "Narration, diagrams, scene art, audio, diff, and the intent and assessment sheet.",
  },
  {
    id: "multi",
    label: "Many pull requests",
    note: "The select-and-recommend path. Drawn as a design, not built.",
  },
];

export function ModeSwitch({
  mode,
  onMode,
}: {
  mode: Mode;
  onMode: (mode: Mode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="FlightDeck mode"
      className="flex min-w-0 items-center gap-1 rounded-full border border-line bg-surface/95 p-1"
    >
      {POSITIONS.map((position) => {
        const on = position.id === mode;
        return (
          <button
            key={position.id}
            type="button"
            title={position.note}
            aria-current={on ? "true" : undefined}
            onClick={() => onMode(position.id)}
            className={cn(
              "inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-full border px-3 font-mono text-[12.5px] whitespace-nowrap transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              on
                ? cn("border-transparent bg-band font-bold text-band-ink", BAND_FOCUS)
                : "border-line text-ink-mid hover:border-primary/40 hover:text-ink",
            )}
          >
            {position.label}
            {position.id === "multi" ? (
              <span
                className={cn(
                  "rounded-full border px-1.5 py-px text-[10.5px] font-bold tracking-[0.06em] uppercase",
                  on
                    ? "border-transparent text-band-ink"
                    : "border-dashed border-line text-ink-faint",
                )}
              >
                design
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
