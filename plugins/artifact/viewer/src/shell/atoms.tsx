/**
 * The small pieces every panel of this shell is built from.
 *
 * Four rules hold across all of them. They come from the engineer's feedback on the
 * prototype.
 *
 *   1. A clickable thing looks clickable. It carries `cursor-pointer`, a hover fill,
 *      a focus ring, and a lucide icon. Tailwind v4 gives a `<button>` the default
 *      cursor, so every button here names `cursor-pointer` for itself.
 *   2. Type is a reading size. Labels are 12px mono, body prose is 16px serif, and
 *      nothing anywhere is smaller than 12px.
 *   3. No state relies on colour alone. Every badge carries a word and a shape marker,
 *      so the rail and the badges survive greyscale.
 *   4. The shell states absence, and it never states presence. A reader does not need
 *      to be told that a record is there, but does need to be told when it is not.
 *      So one readiness state survives: absent. It reads "not present", and it is the
 *      only state that paints a pill.
 *
 * No component here quotes where a value came from. A panel never prints a field path,
 * a file name, or a join name, because a reader who wants an outcome does not need to
 * know that the field is called `goal.outcome`.
 */

export type { Tone } from "./atoms/tones";
export {
  TONE_MARK,
  TONE_PILL,
  TONE_RULE,
  toneForSeverity,
  toneForStage,
  toneForState,
  toneForVerdict,
} from "./atoms/tones";
export { BAND_FOCUS, BAND_PANEL, BAND_SECTION, TINT_BAR, jumpTarget } from "./atoms/headings";
export { ABSENT_CARD, Chip, NotPresentPill, StateBadge } from "./atoms/chips";
export { Panel } from "./atoms/Panel";
export { PanelActionContext } from "./atoms/panelModel";
export type { PanelAction } from "./atoms/panelModel";
export { Bento, TILE_SPAN, Tile } from "./atoms/bento";
export type { TileSpan } from "./atoms/bento";
export { Box, KeyValue, SHEET_HEADING_ATTR, SubHead, TextList } from "./atoms/blocks";
export { ActionButton } from "./atoms/controls";
export { AbsentLine, AbsentRecordLine, EmptyNote, Field, Missing } from "./atoms/notes";
export { PointCard } from "./atoms/points";
export type { Point } from "./atoms/points";
export { SectionHeading } from "./atoms/SectionHeading";
