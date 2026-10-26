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
 * ONE SECTION IS ONE SCREEN. The box is about 530 px and a collapsed epic row about
 * 50 px, so six rows fill a box and the seventh would make the reader scroll before
 * they had read anything. The same number keeps the level's spine short: thirty-six
 * epics would give exactly six sections, and no plausible work gives more than six.
 */
const EPICS_PER_SECTION = 6;

/**
 * The epics, cut into the sections the Build level pages.
 *
 * THE CUT FOLLOWS THE DELIVERY ORDER, and that is a deliberate second choice. The seam
 * a reader would want is the epic's state, and this corpus does not carry one: all
 * eighteen of this work's epics read `no-pull-request` in the join and `planned` in the
 * entity, all eighteen name the same branch, none names a pull request, and the design
 * records no slices and no epic solution designs. One state over eighteen epics is not
 * a spine. The epic order is the delivery order, so a cut of it keeps the sequence a
 * reader follows and invents no grouping the bundle does not hold.
 *
 * The panel that renders one group states the same thing to the reader, in its own lead.
 */
export function epicGroups(work: WorkItem): EpicEntity[][] {
  const groups: EpicEntity[][] = [];
  for (let start = 0; start < work.epics.length; start += EPICS_PER_SECTION) {
    groups.push(work.epics.slice(start, start + EPICS_PER_SECTION));
  }
  return groups;
}
