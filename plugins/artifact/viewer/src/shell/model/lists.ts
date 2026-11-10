import type { EpicEntity } from "@/data/types";
import type { WorkItem } from "@/data/works";

export interface SwitcherDesign {
  id: string;
  name: string;
  stage: string;
  epicCount: number;
}

export interface SwitcherEpic {
  id: string;
  design: string;
  epicId: string;
  state: string;
}

function designOf(work: WorkItem): SwitcherDesign {
  return {
    id: work.id,
    name: work.design.name,
    stage: work.design.stage,
    epicCount: work.epics.length,
  };
}

function epicsOf(work: WorkItem): SwitcherEpic[] {
  return work.epics.map((epic) => ({
    id: epic.id,
    design: epic.design,
    epicId: epic.epic_id,
    state: work.epicState(epic),
  }));
}

export function switcherList(works: Map<string, WorkItem>) {
  const all = [...works.values()];
  const designs = all.map(designOf).sort((a, b) => a.id.localeCompare(b.id));
  return { designs, epics: all.flatMap(epicsOf) };
}

/**
 * How many epics one section of the paged Build level holds.
 *
 * One section is one screen. The box is about 530 px and a collapsed epic row about
 * 50 px, so six rows fill a box and a seventh would make the reader scroll before they
 * had read anything. Thirty-six epics give exactly six sections, and no plausible work
 * gives more, so the level's spine stays short.
 */
const EPICS_PER_SECTION = 6;

/**
 * The epics, cut into the sections the Build level pages.
 *
 * The cut follows the delivery order, as a deliberate second choice. The seam a reader
 * would want is the epic's state, and this corpus carries none: all eighteen of this
 * work's epics read `no-pull-request` in the join and `planned` in the entity, all name
 * the same branch, and none names a pull request. One state over eighteen epics is not
 * a spine. A cut of the delivery order keeps the sequence a reader follows and invents
 * no grouping the bundle does not hold.
 *
 * The panel that renders one group states the same thing in its own lead.
 */
export function epicGroups(work: WorkItem): EpicEntity[][] {
  const groups: EpicEntity[][] = [];
  for (let start = 0; start < work.epics.length; start += EPICS_PER_SECTION) {
    groups.push(work.epics.slice(start, start + EPICS_PER_SECTION));
  }
  return groups;
}
