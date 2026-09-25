/**
 * One work item, read through a rail grouped in three parts, with two accounts behind it.
 *
 * THE SHAPE. Three regions. A top band that names the work item, the change, the account
 * the reader is in, and the address on screen. A rail down the left edge with the
 * engineer's three groups. A scroll box beside it holding the one section the reader's
 * address opens.
 *
 * THE ENGINEER'S OWN WORDS FOR THIS SURFACE:
 *
 *   "group items under 'Build', 'Review' and 'Deploy'. Build would contain: Intent,
 *    Problem & Solution, Architecture, Epics, Rubrics. Review: The same except
 *    Epics+Rubrics + File Diffs."
 *
 * So the rail holds three groups and the middle one repeats the first one's three names.
 * The names repeat because the accounts differ: Build reads the program's account and
 * Review reads the change's. `./accountModel` builds the rows, `./AccountRail` draws them,
 * `./AccountMark` states which account a reader is in and carries the jump between them.
 *
 * THE DEFAULT WORK ITEM IS `cobuilder-implement`, AND ITS CHANGE IS PULL REQUEST 11.
 * `dev.tsx` states why that pair, and it takes a different work id or pull request from the
 * query string. The address wins over the query string: a reader who follows a deep link
 * lands on the section that address names.
 *
 * THE ADDRESS IS THE ROUTE. `@/shell/model` holds the shell's own parser and builder, and
 * this surface calls them. A press writes the hash and nothing else. No second router, no
 * second address scheme, and every row's address can be copied, sent, and opened.
 *
 * THE GROUPING IS DECIDED. The engineer specified the three groups and this file renders
 * them as the navigation, not as a candidate. What stays open is the mark that separates
 * the two accounts, and only that. `./AccountMark` says so where the mark lives.
 *
 * THE SHIPPED RAIL IS NOT MOVED BY THIS FILE. `src/shell/Rail.tsx` keeps its own six flat
 * entries, because a grouped shipped rail would carry the change's account in its Review
 * group and the shipped shell does not render that account yet. The grouping lands with
 * the model rather than ahead of it. Nothing in the shipped graph imports this file, so
 * the shipped viewer's bytes do not move.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Database, GitPullRequest, Moon, Sun, TriangleAlert } from "lucide-react";

import { Chip, Missing, Panel } from "@/shell/atoms";
import type { Theme } from "@/shell/DiagramTiles";
import { PullRequestsSection, ShippedSection } from "@/shell/panels";
import { RecordSheet } from "@/shell/Sheet";
import type { SheetSubject } from "@/shell/Sheet";
import { gatesOf, levelsOf as programLevelsOf } from "@/shell/model";
import { entitiesOf, loadDesigns, loadIndex } from "@/data/bundle";
import type { PullRequest } from "@/data/types";
import { buildWorkItems } from "@/data/works";
import type { WorkItem } from "@/data/works";
import type { AdrRecords } from "@/data/adrs";

import { AccountRail } from "./AccountRail";
import { AccountRule } from "./AccountMark";
import { ChangeBody } from "./accountChange";
import {
  ACCOUNT_MARK,
  CHANGE_LEVEL_KEY,
  changeHref,
  changeLevelsOf,
  diffCountOf,
  liveRow,
  programHref,
  railGroups,
} from "./accountModel";
import type { AccountId, LiveRow, RailRow } from "./accountModel";
import { ProgramBody } from "./accountProgram";
import {
  entryOf,
  loadAdrs,
  loadDiff,
  loadDiagrams,
  loadManifest,
  loadStory,
  type Level,
  type Manifest,
  type Story,
  type StoryEntry,
} from "./model";

/** The work item this prototype opens on. `dev.tsx` passes another when asked. */
export const DEFAULT_WORK = "cobuilder-implement";

type Loaded = {
  state: "ready";
  story: Story;
  manifest: Manifest;
  adrs: AdrRecords;
  works: Map<string, WorkItem>;
  allPullRequests: PullRequest[];
};

type Load = { state: "loading" } | Loaded | { state: "failed"; message: string };

/** The change's own two reads: its diagrams and its diff, both keyed on its number. */
type ChangeRead = {
  pr: number;
  diagrams: Record<string, string>;
  diff: Record<string, string> | null;
  diffError: string | null;
};

export default function Accounts({
  workId = DEFAULT_WORK,
  pr,
}: {
  workId?: string;
  /** The change to read, or nothing to take the first pull request the work's epics carry. */
  pr?: number;
}) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [hash, setHash] = useState(() => window.location.hash);
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
  );
  const [artMode, setArtMode] = useState<"image" | "diagram">("image");
  const [diffFile, setDiffFile] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetSubject | null>(null);
  const [failedArt, setFailedArt] = useState<string | null>(null);
  const [audioFailed, setAudioFailed] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  /*
    One read of the bundle's shared records. The reviewed prototype reads five files; the
    program's account needs the record index and the design records as well, so this read is
    six. None of the six depends on which pull request is live, so this effect runs once.
  */
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [story, manifest, adrs, index, designs] = await Promise.all([
          loadStory(),
          loadManifest(),
          loadAdrs(),
          loadIndex(),
          loadDesigns(),
        ]);
        if (!live) return;
        setLoad({
          state: "ready",
          story,
          manifest,
          adrs,
          works: buildWorkItems(index, designs),
          allPullRequests: entitiesOf(index).pull_request,
        });
      } catch (error: unknown) {
        if (live) {
          setLoad({
            state: "failed",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  /* The address is the reader's position. A press writes it, and nothing else does. */
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((href: string) => {
    if (window.location.hash === href) return;
    window.location.hash = href;
  }, []);

  const work: WorkItem | null = load.state === "ready" ? (load.works.get(workId) ?? null) : null;

  /*
    THE CHANGE IS ALWAYS ONE THIS WORK'S OWN EPICS CARRY.

    `joins.epic_to_pull_request` answers which pull requests belong to the work, and this
    reads that answer rather than trusting the query string. A requested number outside the
    set falls back to the first one inside it, because the whole point of this surface is
    that the two accounts belong to one work item. A query string that named a stranger's
    pull request would put two unrelated records side by side and the comparison would be a
    lie. A work whose epics carry no pull request has no change at all, and the Review group
    states that absence in place.
  */
  const ownPrs = useMemo(() => (work === null ? [] : work.pullRequests.map((p) => p.id)), [work]);
  const changePr: number | null = useMemo(() => {
    if (ownPrs.length === 0) return null;
    if (pr !== undefined && ownPrs.includes(pr)) return pr;
    return ownPrs[0];
  }, [ownPrs, pr]);

  /* The change's own two reads, keyed on its number. */
  const [change, setChange] = useState<ChangeRead | null>(null);
  useEffect(() => {
    if (changePr === null) {
      setChange(null);
      return;
    }
    let live = true;
    (async () => {
      const [diagrams, diff] = await Promise.all([
        loadDiagrams(changePr).catch(() => ({}) as Record<string, string>),
        loadDiff(changePr).then(
          (value) => ({ diff: value as Record<string, string> | null, error: null as string | null }),
          (error: unknown) => ({
            diff: null as Record<string, string> | null,
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
      ]);
      if (!live) return;
      setChange({ pr: changePr, diagrams, diff: diff.diff, diffError: diff.error });
    })();
    return () => {
      live = false;
    };
  }, [changePr]);

  const diagrams = load.state === "ready" && change !== null && change.pr === changePr ? change.diagrams : {};

  const entry: StoryEntry | null =
    load.state === "ready" && changePr !== null ? entryOf(load.story, changePr) : null;

  const changeLevels: Level[] = useMemo(
    () =>
      load.state !== "ready" || entry === null
        ? []
        : changeLevelsOf(entry, load.story, load.manifest, diagrams),
    [load, entry, diagrams],
  );

  const programLevelStates = useMemo(() => (work === null ? null : programLevelsOf(work)), [work]);
  const gates = useMemo(() => (work === null ? null : gatesOf(work)), [work]);

  const groups = useMemo(
    () =>
      railGroups({
        work,
        gates,
        levels: programLevelStates,
        entry,
        changeLevels,
        diffFiles: change === null ? null : diffCountOf(change.diff),
      }),
    [work, gates, programLevelStates, entry, changeLevels, change],
  );

  const live: LiveRow | null = useMemo(() => liveRow(groups), [groups, hash]);

  /*
    A route that names no row opens the first row. The bare `#/` is the shell's board, and
    this prototype has no board, so it lands on the program's Intent rather than on an
    empty page. The landing is stated on screen while it happens rather than silently.
  */
  const firstHref = groups[0]?.rows[0]?.href ?? null;
  useEffect(() => {
    if (firstHref === null) return;
    if (live !== null) return;
    go(firstHref);
  }, [firstHref, live, go]);

  /* A new section starts at its own top. */
  useEffect(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = 0;
  }, [hash]);

  const current: RailRow | null = live?.row ?? null;
  const changeSection = current?.body.kind === "change" ? current.body.section : null;
  const liveLevel: Level | null =
    changeSection === null
      ? null
      : (changeLevels.find((level) => level.key === CHANGE_LEVEL_KEY[changeSection]) ?? null);

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-ground text-ink">
      <header className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface-2 px-6 py-3">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="font-mono text-[17px] font-bold tracking-[-0.01em] text-ink">
            FlightDeck
          </span>
          <span className="font-mono text-[12.5px] text-ink-faint">
            one work item, two accounts
          </span>
        </span>

        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <Chip tone="accent" icon={Database}>
            {workId}
          </Chip>
          {work ? <Chip>stage {work.design.stage}</Chip> : null}
          <Chip icon={GitPullRequest}>{entry === null ? "no change" : `PR ${entry.pr}`}</Chip>
          {current === null ? null : (
            <Chip tone={current.account === "change" ? "accent" : "neutral"}>
              {ACCOUNT_MARK[current.account].word} account
            </Chip>
          )}
        </span>

        <span className="ml-auto flex min-w-0 items-center gap-2">
          <a
            href="?surface=single"
            className="inline-flex min-h-9 items-center rounded-full border border-line bg-card px-3 font-mono text-[12px] text-ink-mid hover:bg-surface-3"
          >
            the reviewed one-pull-request prototype
          </a>
          <a
            href="?surface=accounts"
            className="inline-flex min-h-9 items-center rounded-full border border-line bg-card px-3 font-mono text-[12px] text-ink-mid hover:bg-surface-3"
          >
            reload this prototype
          </a>
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Use the light theme" : "Use the dark theme"}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-line bg-card text-ink-mid hover:bg-surface-3"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </span>
      </header>

      {/*
        The address on screen, in full and in mono. A reader judging the navigation has to
        see where a press lands, and this line is the address itself rather than a summary
        of it.
      */}
      <p className="m-0 flex min-w-0 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-surface px-6 py-1.5 font-mono text-[12px]">
        <span className="font-bold tracking-[0.08em] text-ink-faint uppercase">address</span>
        <span className="min-w-0 break-all text-accent-deep">{hash || "#/"}</span>
        <span className="min-w-0 text-ink-faint">
          {current === null ? "no row opens this address yet" : current.label}
        </span>
      </p>

      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <AccountRail groups={groups} onGo={go} />

        <div
          ref={boxRef}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-ground px-6 py-5"
        >
          {load.state === "loading" ? (
            <Panel title="Reading the bundle" icon={Database} lead="Two accounts, read once.">
              <p className="m-0 font-mono text-[13px] text-ink-dim">
                Reading `index.json`, `designs.js`, `story.js`, `manifest.js`, `diagrams.js`,
                and the change&apos;s diff from the bundle the dev server mounts at
                `/bundle/`…
              </p>
            </Panel>
          ) : load.state === "failed" ? (
            <Panel title="The bundle could not be read" icon={TriangleAlert} tone="warn" absent>
              <Missing>{load.message}</Missing>
            </Panel>
          ) : work === null ? (
            <Panel title="No such work item" icon={TriangleAlert} tone="warn" absent>
              <Missing>
                The index resolved no design whose id is {workId}. It carries fifteen designs,
                and `cobuilder-implement` is the one this prototype opens on.
              </Missing>
            </Panel>
          ) : current === null ? (
            <Panel title="No section at this address" icon={TriangleAlert} tone="warn" absent>
              <Missing>
                The address {hash || "#/"} names no row of this rail, and the prototype is
                moving to {firstHref ?? "#/"}.
              </Missing>
            </Panel>
          ) : (
            <>
              <h1 className="m-0 mb-1 font-mono text-[20px] font-bold tracking-[-0.01em] text-ink">
                {current.label}
              </h1>

              <AccountRule
                account={current.account}
                whose={whoseOf(current.account, workId, entry)}
                section={current.label}
                jump={jumpOf(current, workId, entry)}
                onGo={go}
              />

              {current.body.kind === "program" ? (
                <ProgramBody
                  section={current.body.section}
                  work={work}
                  levels={programLevelStates}
                  adrs={load.adrs}
                  theme={theme}
                  gated={gates?.rubrics ?? false}
                  openSheet={setSheet}
                />
              ) : changeSection !== null && entry !== null ? (
                <ChangeBody
                  section={changeSection}
                  entry={entry}
                  levels={changeLevels}
                  level={liveLevel}
                  diff={change?.diff ?? null}
                  diffError={change?.diffError ?? null}
                  theme={theme}
                  artMode={artMode}
                  onArtMode={setArtMode}
                  failedArt={failedArt}
                  onArtFailed={setFailedArt}
                  audioFailed={audioFailed}
                  onAudioFailed={setAudioFailed}
                  diffFile={diffFile}
                  onDiffFile={setDiffFile}
                  adrs={load.adrs}
                  openSheet={setSheet}
                />
              ) : (
                <DeliveryBody
                  row={live as LiveRow}
                  work={work}
                  allPullRequests={load.allPullRequests}
                  onGo={go}
                />
              )}
            </>
          )}
        </div>
      </div>

      {audioFailed === null ? null : (
        <p className="m-0 shrink-0 border-t border-line bg-warn-wash px-6 py-2 font-mono text-[12.5px] text-warn">
          The narration audio at {audioFailed} did not load.
        </p>
      )}

      <RecordSheet
        subject={sheet}
        onOpenChange={(open) => {
          if (!open) setSheet(null);
        }}
      />
    </div>
  );
}

/** Whose record the reader is in, in that account's own terms. */
function whoseOf(account: AccountId, workId: string, entry: StoryEntry | null): string {
  if (account === "program") return workId;
  if (account === "change") return entry === null ? "no pull request" : `pull request ${entry.pr}`;
  return "the work's release record";
}

/**
 * The other account's address for this same section name, or null when this section has no
 * counterpart. Deploy's two rows carry no counterpart, and the rule says so on the bar.
 *
 * The address comes from `./accountModel`'s two builders and never from string surgery, so
 * a change to the route shape reaches the jump and the rail at once.
 */
function jumpOf(
  row: RailRow,
  workId: string,
  entry: StoryEntry | null,
): { href: string; account: AccountId; section: string } | null {
  if (row.shared === null || entry === null) return null;
  if (row.account === "program") {
    return {
      href: changeHref(workId, entry.pr, row.shared),
      account: "change",
      section: row.label,
    };
  }
  return { href: programHref(workId, row.shared), account: "program", section: row.label };
}

/**
 * Deploy, whose two rows are the shipped shell's own delivery entries.
 *
 * The engineer named the group and gave it no items. These two rows are the shell's own,
 * and this body names them as a choice rather than as an instruction.
 */
function DeliveryBody({
  row,
  work,
  allPullRequests,
  onGo,
}: {
  row: LiveRow;
  work: WorkItem;
  allPullRequests: PullRequest[];
  onGo: (href: string) => void;
}) {
  if (row.row.body.kind !== "delivery") return null;

  return (
    <>
      <p className="mb-4 min-w-0 rounded-lg border border-dashed border-line bg-surface-2 px-3.5 py-2 font-mono text-[12.5px] text-ink-dim">
        The engineer named the Deploy group and gave it no items. This row is the shipped
        shell&apos;s own delivery entry, put here as a choice for the engineer to accept or
        replace.
      </p>

      {row.row.body.section === "shipped" ? (
        <ShippedSection work={work} />
      ) : (
        <PullRequestsSection
          work={work}
          focusPr={null}
          allPullRequests={allPullRequests}
          onOpenPr={(n) => onGo(`#/${work.id}/pull-requests/${n}`)}
        />
      )}
    </>
  );
}
