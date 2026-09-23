/**
 * The Build level's sections: the epic runs, the slices, and the rubrics.
 *
 * This module is the level's entry point, so `panels/` reads as one file per level. It
 * names three sections and assembles nothing. The epic run and the slice disclosure are
 * defined in `../sections.tsx`, which the port's file map keeps as its own file, and the
 * rubrics panel is defined there too. One definition serves both paths, so a change to a
 * section reaches the level and the file that holds it at once.
 *
 * The epics sub-view pages one run of epics per section, and the run's cut is
 * `epicGroups` in `../model`. The rubrics sub-view is not paged: one panel, its own
 * scroll, because the rail's Rubrics entry is a sub-view of Build rather than a section
 * of the track.
 */

export { EpicGroupSection, RubricsSection, UnresolvedSlicesSection } from "../sections";
