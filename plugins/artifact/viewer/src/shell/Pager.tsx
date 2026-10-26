/**
 * The horizontal section pager for the paged levels.
 *
 * A level is four or more long panels. Stacked, they make a column several thousand
 * pixels tall, so a reader scrolls past three panels to reach the fourth. This file puts
 * one panel on screen at a time and moves the track sideways between them. Each box keeps
 * its own scroll, so a panel taller than the stage stays fully readable.
 *
 * THE UNIT IS A SECTION. The engineer named it: next and previous on each page, and
 * the section headings which scroll right and left to each. A chapter is the story's
 * unit and is not what this level holds, so nothing here is called one.
 *
 * ONE INDEX DRIVES ALL THREE PIECES. `SectionStrip` shows it, `SectionStage` moves to
 * it, and `SectionPager` steps it. `useSectionPaging` holds it.
 *
 * THE STAGE IS THE ONLY CLIP BOX IN THIS FILE. Its outer element hides the track, and
 * the boxes past the active one are the overflow it hides. A box's own content is
 * never clipped, because each box is a scroll container. That is section 11.3's rules
 * 2 and 3 applied to a pager: nothing that holds content hides its overflow.
 *
 * THIS FILE IS THE PORTED PROTOTYPE at `src/variations/sections-e/Pager.tsx`, plus
 * `withinOf` and `LevelProgress`. The program design places the level's own progress
 * reading in this file, beside the pager that produces the index it reads, because the
 * two are one mechanism. The prototype kept it in its root component, and the port moved
 * it here with the code unchanged.
 */

export { keyPressIsTaken, useSectionPaging } from "./pager/paging";
export { SectionStrip } from "./pager/Strip";
export { SectionStage } from "./pager/Stage";
export { SectionPager } from "./pager/PagerBar";
export { LevelProgress, PROGRESS_PX, withinOf } from "./pager/Progress";
