/**
 * The Build level's sections: the epic runs, the slices, and the rubrics.
 *
 * This module names the sections and assembles nothing. The sections are defined in
 * `../sections.tsx`, so one definition serves both paths, and a change to a section
 * reaches the level and the file that holds it at once.
 *
 * The epics sub-view pages one run of epics per section, and the run's cut is
 * `epicGroups` in `../model`. The rubrics sub-view is not paged: one panel, its own
 * scroll, because the rail's Rubrics entry is a sub-view of Build rather than a section
 * of the track.
 */

export {
  EpicGroupSection,
  PlanSection,
  RubricsSection,
  UnresolvedSlicesSection,
} from "../sections";
