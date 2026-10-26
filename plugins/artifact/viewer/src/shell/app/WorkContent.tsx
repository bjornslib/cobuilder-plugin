import { PanelActionContext } from "../atoms";
import { PlanSection, PullRequestsSection, RubricsSection, ShippedSection } from "../panels";
import type { WorkItem } from "../model";
import { ProgressBand } from "./progressBand";
import { ChangePaged } from "./ChangePaged";
import { LevelHeading } from "./LevelHeading";
import { LevelMotion } from "./levelMotion";
import { workInShort } from "./levelParts";
import { ChangeNotice, RedirectNote } from "./notes";
import { PagedLevel } from "./PagedLevel";
import { epicStartIndex, pagedSections, type PagedArgs, type PagedLevelKey } from "./pagedSections";
import type { ShellView } from "./view";

interface WorkProps {
  v: ShellView;
  work: WorkItem;
}

function programArgs(v: ShellView, work: WorkItem, section: PagedLevelKey): PagedArgs {
  const { pagedLevel, adrs, theme, openSheet, unresolvedSlices, focusEpic } = v;
  return { section, work, levelState: pagedLevel, adrs, theme, openSheet, unresolvedSlices, focusEpic };
}

function ProgramPaged({ v, work, section }: WorkProps & { section: PagedLevelKey }) {
  return (
    <PagedLevel
      inShort={workInShort(work, section)}
      targets={v.jumpTargets}
      routeKey={v.routeKey}
      carried={v.carriedHere}
      start={epicStartIndex(work, v.focusEpic)}
      sections={pagedSections(programArgs(v, work, section))}
    />
  );
}

/*
 * THE PAGED LEVELS LAY THEIR SECTIONS ON A TRACK. Intent, Problem and
 * solution, Architecture, and Build's epics each hand the pane's
 * remaining height to the track instead of spending it on a column.
 * The order of the array is the order Next walks, and its length is
 * the count the strip and the pager bar read, so nothing here can
 * drift. `start` answers a route that names one section's record,
 * which today means an epic deep link.
 *
 * THE CHANGE'S FOUR ROWS USE THE SAME TRACK. One element per panel, so
 * the strip's links and the boxes' count come from one list.
 */
function PagedWork({ v, work }: WorkProps) {
  if (!v.paged) return null;
  if (v.programKey === null) return <ChangePaged v={v} carried={v.carriedHere} />;
  return <ProgramPaged v={v} work={work} section={v.programKey} />;
}

function RubricsBlock({ v, work }: WorkProps) {
  if (v.section !== "build" || v.route.sub !== "rubrics") return null;
  return <RubricsSection work={work} gated={v.gates?.rubrics ?? false} openSheet={v.openSheet} focus={v.route.subId} />;
}

function PlanBlock({ v, work }: WorkProps) {
  if (v.section !== "build" || v.route.sub !== "plan") return null;
  return <PlanSection work={work} focus={v.route.subId} />;
}

function PullRequestsBlock({ v, work }: WorkProps) {
  if (v.section !== "pull-requests" || v.changeAccount) return null;
  return <PullRequestsSection work={work} focusPr={v.changePr} allPullRequests={v.allPullRequests} onOpenPr={v.openPr} />;
}

function ShippedBlock({ v, work }: WorkProps) {
  return v.section === "shipped" ? <ShippedSection work={work} /> : null;
}

function SectionBlocks({ v, work }: WorkProps) {
  return (
    <>
      <RubricsBlock v={v} work={work} />
      <PlanBlock v={v} work={work} />
      <PullRequestsBlock v={v} work={work} />
      <ShippedBlock v={v} work={work} />
    </>
  );
}

function WorkLevel({ v, work }: WorkProps) {
  return (
    <>
      <PanelActionContext.Provider value={v.panelAction}>
        <PagedWork v={v} work={work} />
      </PanelActionContext.Provider>
      <SectionBlocks v={v} work={work} />
    </>
  );
}

/*
 * THE PAGED LEVEL HAS NO VISIBLE BAND. The section strip right below
 * says the section's own name, so a banner with the same words 105 px
 * higher is a repeat of the strip. The heading stays in the flow as
 * `sr-only`: section 8.4 moves focus to it when the level changes, and
 * the document still needs its one `h1`. A screen reader therefore
 * still hears the level name, and no reader loses the text.
 */
function WorkHeading({ v, work }: WorkProps) {
  const title = v.changeAccount ? `Pull request ${v.changePr}` : undefined;
  return <LevelHeading section={v.section} work={work} gates={v.gates} paged={v.paged} title={title} />;
}

function WorkMotion({ v, work }: WorkProps) {
  return (
    <LevelMotion motionKey={`${work.id}/${v.section}/${v.route.subId ?? ""}`} reduce={v.reduce} paged={v.paged}>
      <RedirectNote from={v.redirectedFrom} section={v.section} reason="this work cannot fill it." />
      <ChangeNotice notice={v.changeNotice} />
      <WorkHeading v={v} work={work} />
      <WorkLevel v={v} work={work} />
    </LevelMotion>
  );
}

export function WorkContent({ v, work }: WorkProps) {
  return (
    <>
      <ProgressBand v={v} />
      <WorkMotion v={v} work={work} />
    </>
  );
}
