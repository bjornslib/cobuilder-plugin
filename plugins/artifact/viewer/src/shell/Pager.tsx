/**
 * The horizontal section pager for the paged levels.
 *
 * A level is four or more long panels. Stacked, they make a column several thousand
 * pixels tall. This file puts one panel on screen at a time and moves the track sideways
 * between them. Each box keeps its own scroll, so a tall panel stays fully readable.
 *
 * The unit is a section. A chapter is the story's unit and is not what this level holds,
 * so nothing here is called one.
 *
 * The stage is the only clip box here. Its outer element hides the boxes past the active
 * one. A box's own content is never clipped, because each box is a scroll container
 * (section 11.3, rules 2 and 3).
 *
 * `withinOf` and `LevelProgress` live beside the pager, because the progress reading
 * and the index it reads are one mechanism.
 */

export { keyPressIsTaken, useSectionPaging } from "./pager/paging";
export { SectionStrip } from "./pager/Strip";
export { SectionStage } from "./pager/Stage";
export { SectionPager } from "./pager/PagerBar";
export { LevelProgress, PROGRESS_PX, withinOf } from "./pager/Progress";
