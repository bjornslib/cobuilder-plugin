import type { PullRequest } from "@/data/types";

import { ChangePaged } from "./ChangePaged";
import { LevelHeading } from "./LevelHeading";
import { LevelMotion } from "./levelMotion";
import { CARD_TEXT_CLASS, ChangeNotice, RedirectNote, WarnCard } from "./notes";
import { WorkContent } from "./WorkContent";
import type { ShellView } from "./view";

function UnknownText({ v }: { v: ShellView }) {
  return (
    <p className={CARD_TEXT_CLASS}>
      The route asks for work item{" "}
      <code className="font-mono text-[13px]">{v.route.workId ?? "(none)"}</code>.
      The index resolved {v.works.size} designs and {v.allPullRequests.length} pull
      requests, and neither source carries that id. Pick one in the work-item
      switcher above.
    </p>
  );
}

function UnknownId({ v }: { v: ShellView }) {
  return (
    <div className="min-w-0 px-6 py-6">
      <WarnCard title="The route names an id the bundle lacks">
        <UnknownText v={v} />
      </WarnCard>
    </div>
  );
}

/*
 * The heading names the pull request, not the work item. There is no work item, so the
 * design's name has nothing to say here. A paged level keeps its heading `sr-only` and
 * moves focus onto it, so a screen reader hears the pull request it landed on. The
 * number is `worklessPr.id`, which `changePr` equals for this route.
 */
function WorklessHeading({ v, pr }: { v: ShellView; pr: PullRequest }) {
  return <LevelHeading section={v.section} work={null} gates={null} paged={v.paged} title={`Pull request ${pr.id}`} />;
}

function WorklessChange({ v, pr }: { v: ShellView; pr: PullRequest }) {
  return (
    <LevelMotion motionKey={`${pr.id}/${v.section}/${v.route.subId ?? ""}`} reduce={v.reduce} paged={v.paged}>
      <RedirectNote from={v.redirectedFrom} section={v.section} reason="this pull request carries no such section." />
      <ChangeNotice notice={v.changeNotice} />
      <WorklessHeading v={v} pr={pr} />
      <ChangePaged v={v} carried={null} />
    </LevelMotion>
  );
}

/*
 * The workless change is not the unknown-id error. An id no design carries may still
 * name a pull request. `model.worklessPullRequest` answered above, so this branch states
 * that pull request's change account, and only an id neither source holds reaches the
 * error.
 *
 * The account is the change's own and nothing else. A pull request with no design has no
 * branch, no epic figure, and no supersedes list, so the top bar shows no branch. The
 * rail's two groups read a work item and are absent too. The section strip and the two
 * pager arrows carry the account's four rows, so a reader still reaches all four.
 *
 * `changePr` equals `worklessPr.id` here. The derivation above fixes it to the work
 * segment's own pull request, so the heading and the rows read one number and cannot
 * disagree. This branch needs no guard on `changePr`.
 */
function WorklessContent({ v }: { v: ShellView }) {
  if (v.worklessPr === null) return <UnknownId v={v} />;
  return <WorklessChange v={v} pr={v.worklessPr} />;
}

/*
 * The bare route holds nothing behind the drawer, per ADR-0034. The drawer is the board,
 * and it opens itself on this route, so the landing is an empty pane. A reader who
 * closes the drawer sees the empty pane and the top bar's Work icon, which is the one
 * way back in that the shell keeps.
 */
export function PaneContent({ v }: { v: ShellView }) {
  if (v.board) return null;
  if (v.work === null) return <WorklessContent v={v} />;
  return <WorkContent v={v} work={v.work} />;
}
