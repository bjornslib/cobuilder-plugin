import { JUMP_ATTR, panelId } from "../jump";

/**
 * The three heading levels, taken from the approved architecture concept.
 *
 * `docs/plans/cobuilder-viewer/design-concepts/architecture.html` ends with a style
 * block that gives every heading a background, and it says why: the page title and
 * the panel titles take a solid deep-teal band with white text, and a sub-heading
 * takes a lighter tinted bar. The three levels then stay apart instead of becoming
 * one wall of teal.
 *
 * Two rules come with the levels, and both are the engineer's.
 *
 *   A panel heading is inset inside its own card. A band that ran to the card's
 *   edge would read as the card's lid rather than as a heading, and the card's own
 *   padding is what keeps the two apart. So the band carries a margin, and the
 *   card keeps its border and its radius around it.
 *
 *   NO HOVER, FOCUS, SELECTED, OR ACTIVE STATE FILLS WITH `--band`. A control that
 *   turns the heading colour on hover reads as a heading. Hover stays in the light
 *   tint family, which is `--surface-2`, `--surface-3`, `--accent-wash`, and
 *   `--tint`. A control that already sits on a band takes a `--band-ink` ring and
 *   brightens rather than taking a fill, because a white wash over the band mixes
 *   straight back to a colour close to the band itself.
 *
 * The radii are the concept's own numbers, written as literals on purpose: 16 px
 * for the section banner, 10 px for a panel heading, 6 px for a sub-heading bar.
 * They do not follow `--radius`, because the three have to stay apart at every
 * radius setting.
 */
export const BAND_SECTION = "rounded-[16px] bg-band text-band-ink";

export const BAND_PANEL = "rounded-[10px] bg-band text-band-ink";

/** The level-three bar. `inline-block`, so the bar hugs the text and not the row. */
export const TINT_BAR = "inline-block rounded-[6px] bg-tint px-2.5 py-0.5 text-tint-ink";

/** The focus ring for a control that sits on a band. The teal ring is 1.4 to 1 there. */
export const BAND_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-band-ink";

/**
 * The two attributes that make a panel a jump target.
 *
 * The id addresses it, and `JUMP_ATTR` carries its heading, so the section-link bar
 * reads one link per panel without holding a list of its own. The return type names
 * the literal key, so the spread below type-checks.
 */
export function jumpTarget(title: string): { id: string; "data-shell-panel": string } {
  return { id: panelId(title), [JUMP_ATTR]: title };
}
