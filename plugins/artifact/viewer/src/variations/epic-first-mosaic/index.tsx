/**
 * Variation B — "Epic-first mosaic".
 *
 * The Work board, arranged around the work rather than around the lenses. The Build
 * region is the anchor: every epic for the active design, with its slices nested and
 * selectable. The lens tiles arrange beside it and follow whatever is selected, so a
 * reader navigates work and the records follow the selection.
 *
 * What this file owns:
 *
 *   - the two loads, and the loading and error states for both
 *   - the theme, light by default, with a switcher carrying a lucide icon
 *   - the lane tabs, and the design rail they narrow
 *   - the selection, and the one place a `ScopeData` is built
 *
 * The theme is set on this variation's own root element, not on `<html>`. The house
 * stylesheet's dark rules are attribute selectors, so they apply to any subtree that
 * carries `data-theme="dark"`. That keeps this variation's switch local: another
 * surface in the same application can hold a different theme at the same time.
 */

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import {
  ChevronRight,
  Compass,
  Database,
  Gavel,
  GitPullRequest,
  Layers,
  ListChecks,
  Moon,
  ScrollText,
  ShieldCheck,
  Split,
  Sun,
  Target,
  Undo2,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  designRows,
  entitiesOf,
  joinsOf,
  loadIndex,
} from "@/data/bundle";
import type { RecordIndex } from "@/data/types";

import { Chip, Stat, TextButton } from "./atoms";
import { BuildRegion, DesignRail } from "./BuildRegion";
import {
  diagramLevels,
  epicDetail,
  groupDocsByFeature,
  groupSlicesByEpic,
  loadDesigns,
  planSlugs,
  programDesignFor,
  recordSlots,
  supersedeLink,
  type DesignRecords,
} from "./data";
import { LensTiles, StateLegends } from "./LensTiles";
import type { Theme } from "./Mermaid";
import {
  designScope,
  detailFor,
  scopeLabel,
  type Scope,
  type ScopeData,
  type SliceRow,
} from "./scope";
import { DONE_STATES, LANES, STAGE_GLOSS, STAGE_TONE, laneRowsOf } from "./states";

/**
 * The design this branch belongs to: `design/cobuilder-viewer/work-prototype`.
 * The board opens on work in progress rather than on whatever sorts first. When the
 * id is absent from the index the board falls back to the first design it loaded.
 */
const DEFAULT_DESIGN = "cobuilder-viewer";

/**
 * The two aliases the house stylesheet's dark block leaves behind.
 *
 * `:root` aliases `--background` to `--ground` and `--foreground` to `--ink`, and the
 * `[data-theme="dark"]` block redefines `--ground` and `--ink` without restating
 * those two aliases. An element that carries `data-theme="dark"` therefore keeps the
 * light `--background` and `--foreground` it inherited, and `bg-background` paints
 * light. This variation may not edit `src/index.css`, so it restates the two aliases
 * on its own root, where the dark block's own ground and ink resolve instead.
 *
 * In the light theme the same declaration resolves to the same values `:root` already
 * holds, so it is applied in both themes rather than branched.
 */
const THEME_ALIASES = {
  "--background": "var(--ground)",
  "--foreground": "var(--ink)",
} as CSSProperties;

type Load =
  | { state: "loading" }
  | { state: "ready"; index: RecordIndex }
  | { state: "failed"; message: string };

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/* --------------------------------------------------------------- chrome */

/**
 * The lane tabs. The lanes are tabs, not a filter row: a lane is the page's subject,
 * and the design rail under it is what the lane narrows.
 *
 * This renders the tab list alone. It must sit inside the one `Tabs` root in
 * `EpicFirstMosaic`, so every trigger's `aria-controls` reaches the one content pane.
 */
function LaneTabs({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-5 pt-3">
      <TabsList variant="line" className="!h-auto flex-wrap justify-start gap-1 p-0">
        <TabsTrigger
          value="all"
          className="!h-10 cursor-pointer gap-2 px-3 font-mono text-[13.5px]"
        >
          All
          <span className="font-mono text-[12px] text-ink-faint tabular-nums">
            {total}
          </span>
        </TabsTrigger>
        {LANES.map((entry) => (
          <TabsTrigger
            key={entry.key}
            value={entry.key}
            className="!h-10 cursor-pointer gap-2 px-3 font-mono text-[13.5px]"
          >
            {entry.label}
            <span className="font-mono text-[12px] text-ink-faint tabular-nums">
              {counts[entry.key] ?? 0}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      <p className="m-0 ml-auto max-w-[62ch] font-mono text-[12px] leading-[1.6] text-ink-faint">
        A lane is a stage rule, and the index records no lane. Superseded designs belong
        to no lane and stay under All.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ the board */

function Board({
  index,
  records,
  recordsError,
  scope,
  onSelect,
  theme,
}: {
  index: RecordIndex;
  records: DesignRecords | null;
  recordsError: string | null;
  scope: Scope;
  onSelect: (scope: Scope) => void;
  theme: Theme;
}) {
  const entities = useMemo(() => entitiesOf(index), [index]);
  const joins = useMemo(() => joinsOf(index), [index]);
  const rows = useMemo(
    () => designRows(entities.design, entities.epic, entities.slice, joins),
    [entities, joins],
  );

  const data: ScopeData | null = useMemo(() => {
    if (rows.length === 0) return null;
    const design =
      entities.design.find((candidate) => candidate.id === scope.designId) ??
      entities.design[0];
    const row = rows.find((candidate) => candidate.design.id === design.id) ?? rows[0];

    const plan = planSlugs(entities, joins).get(design.id) ?? {
      slug: design.id,
      via: "design" as const,
    };
    const slicesByEpic = groupSlicesByEpic(entities.slice, joins);
    const docsByFeature = groupDocsByFeature(entities.epic_design);
    const pullRequestById = new Map(
      entities.pull_request.map((pr) => [pr.id, pr] as const),
    );
    const adrById = new Map(entities.adr.map((adr) => [adr.id, adr] as const));

    const planRows = new Map(
      (records?.[design.id]?.goal.epics ?? []).map((row) => [row.id, row] as const),
    );

    const epics = row.epics.map((epic) =>
      epicDetail(
        epic,
        joins,
        slicesByEpic,
        pullRequestById,
        docsByFeature,
        plan,
        planRows.get(epic.epic_id) ?? null,
      ),
    );

    const mapped = new Set(Object.keys(joins.slice_to_epic));
    const unresolvedIds = [
      ...new Set([
        ...Object.keys(joins.slice_to_epic_unresolved),
        ...entities.slice.filter((slice) => !mapped.has(slice.id)).map((slice) => slice.id),
      ]),
    ];
    const unresolved: SliceRow[] = [];
    for (const id of unresolvedIds) {
      const slice = entities.slice.find((candidate) => candidate.id === id);
      if (!slice) continue;
      unresolved.push({
        slice,
        epic: null,
        unresolvedReason: joins.slice_to_epic_unresolved[id] ?? null,
      });
    }

    const designRecord = records?.[design.id];
    const slots = recordSlots(designRecord);

    return {
      scope,
      index,
      entities,
      joins,
      records,
      recordsError,
      designId: design.id,
      design,
      plan,
      programDesign: programDesignFor(plan, entities.program_design),
      designRecord,
      slots,
      supersede: supersedeLink(design.id, records ?? {}),
      allSlotsPresent: slots.every((slot) => slot.present),
      epics,
      epicById: new Map(epics.map((detail) => [detail.epic.id, detail] as const)),
      doneEpics: epics.filter((detail) => DONE_STATES.has(detail.status)).length,
      slicesByEpic,
      designSlices: row.slices,
      unresolved,
      diagrams: diagramLevels(designRecord),
      gates: joins.feature_gates[plan.slug] ?? [],
      adrById,
      pullRequestById,
      epicDesigns: entities.epic_design,
      pullRequests: row.pullRequests
        .map((id) => pullRequestById.get(id))
        .filter((pr): pr is NonNullable<typeof pr> => pr !== undefined),
    };
  }, [entities, joins, rows, records, recordsError, scope]);

  if (!data) {
    return (
      <p className="px-5 py-6 font-serif text-[16px] text-ink-dim">
        The record index holds no design, so this board has nothing to arrange.
      </p>
    );
  }

  const detail = detailFor(scope, data);
  const scopeText = scopeLabel(scope, detail, data.design.name);

  return (
    <div className="flex flex-col gap-4 px-5 pt-4 pb-10">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <BuildRegion data={data} onSelect={onSelect} />
        <aside className="min-w-0">
          <div className="mb-3 flex items-center gap-2.5">
            <Target className="size-4 shrink-0 text-ink-faint" />
            <h2 className="m-0 font-mono text-[15px] font-bold tracking-[0.04em] uppercase">
              The lenses
            </h2>
            <span className="ml-auto font-mono text-[12px] text-ink-faint">
              scoped to {scopeText}
            </span>
          </div>
          <LensTiles
            data={data}
            epic={detail.epic}
            slice={detail.slice}
            scopeText={scopeText}
            theme={theme}
            onSelect={onSelect}
          />
        </aside>
      </div>

      <StateLegends data={data} />

      <Assumptions data={data} />
    </div>
  );
}

/* --------------------------------------------------------- assumptions */

function Assumptions({ data }: { data: ScopeData }) {
  /**
   * How many epic rows resolve to one of the documents the index holds.
   *
   * The index carries its own `design_doc` field, and it compares a design id against
   * a plan slug. For a design whose plan directory carries another slug it finds
   * nothing. This count uses the same join the board uses, so the two agree.
   */
  const resolved = useMemo(() => {
    const plans = planSlugs(data.entities, data.joins);
    const keys = new Set(
      data.entities.epic_design.map((doc) => `${doc.feature_slug}/${doc.epic_id}`),
    );
    return data.entities.epic.filter((epic) => {
      const plan = plans.get(epic.design);
      return plan ? keys.has(`${plan.slug}/${epic.epic_id}`) : false;
    }).length;
  }, [data.entities, data.joins]);

  const indexPathCount = data.entities.epic.filter((epic) => epic.design_doc).length;

  return (
    <Collapsible className="rounded-xl border border-line-soft bg-surface-2">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="group h-auto w-full cursor-pointer justify-start gap-2.5 px-4 py-3 font-mono text-[13.5px] font-bold text-ink-mid"
        >
          <ChevronRight className="size-4 text-ink-faint transition-transform duration-200 ease-house group-data-[state=open]:rotate-90" />
          <Database className="size-4 text-ink-faint" />
          What is real here, what is a prototype rule, and what this variation changed
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pt-1 pb-4">
        <div className="grid gap-3.5 lg:grid-cols-3">
          <div className="rounded-lg border border-line-soft bg-surface px-3.5 py-3">
            <p className="m-0 mb-2 font-mono text-[12px] font-bold tracking-[0.08em] text-good uppercase">
              Real, from the loaded files
            </p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
              <li>
                All {data.entities.design.length} designs, {data.entities.epic.length}{" "}
                epics, {data.entities.slice.length} slices, {data.entities.adr.length}{" "}
                decisions, and {data.entities.pull_request.length} pull requests come from{" "}
                <code className="font-mono text-[13px]">index.json</code>, with every join
                the index holds.
              </li>
              <li>
                Every record slot, every problem and approach statement, every finding,
                every diagram, and both documents come from{" "}
                <code className="font-mono text-[13px]">designs.js</code>, which is the
                bundle&apos;s own projection of each design directory.{" "}
                {data.records === null
                  ? `That file did not load: ${data.recordsError ?? "no reason recorded"}.`
                  : "That file loaded."}
              </li>
              <li>
                An epic&apos;s design document is matched on the epic id and the plan slug.{" "}
                {resolved} of the index&apos;s {data.entities.epic.length} epic rows resolve
                to one of the {data.entities.epic_design.length} documents the index holds.
                The index&apos;s own <code className="font-mono text-[13px]">design_doc</code>{" "}
                field reports {indexPathCount}, because it builds one key from the design id
                and compares it against one built from the plan slug. Those two differ for
                every design whose plan directory carries another name:{" "}
                <span className="font-mono text-[13px]">plugin-split</span> owns{" "}
                <span className="font-mono text-[13px]">docs/plans/cobuilder-family/</span>,
                so its five documents are in the index and absent from that field.
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-dashed border-line bg-surface px-3.5 py-3">
            <p className="m-0 mb-2 font-mono text-[12px] font-bold tracking-[0.08em] text-warn uppercase">
              Prototype rules, marked as such
            </p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
              <li>
                The lane is a stage rule. The index records no lane, so a design sits in a
                lane only because the approved Work prototype says so.
              </li>
              <li>
                The epic vocabulary — planned, in-progress, blocked, in-review, merged,
                superseded — and the slice vocabulary with its red-green-validated ladder
                are both intended states. No row in this index carries one. Every pill that
                shows a real value shows the real value first, and every intended value sits
                in a dashed chip that names itself a prototype.
              </li>
              <li>
                &ldquo;Merged&rdquo; counts an epic whose refined join reads completed or
                merged. The index records no percentage.
              </li>
              <li>
                The plan slug is derived from a design&apos;s slice ids, because the index
                carries no design-to-slug field. It is accepted only when a plan record
                exists under it. This design resolved to{" "}
                <span className="font-mono text-[13px]">{data.plan.slug}</span> by{" "}
                {data.plan.via === "slice" ? "that derivation" : "falling back to its id"}.
              </li>
              <li>
                A slice shows its own plan number, <code className="font-mono text-[13px]">#4</code>.
                The index records no epic-relative number, so this board never draws
                &ldquo;E4.2&rdquo;.
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-line-soft bg-surface px-3.5 py-3">
            <p className="m-0 mb-2 font-mono text-[12px] font-bold tracking-[0.08em] text-accent-deep uppercase">
              Changed from the previous prototype
            </p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
              <li>
                The record chips. The static prototype read them by listing the files in
                each design directory. This board reads{" "}
                <code className="font-mono text-[13px]">designs.js</code>, so a chip reports
                what the bundle actually projected rather than what a directory walk found.
                That removes one prototype assumption.
              </li>
              <li>
                The in-flight count. The static prototype counted epics in state open. This
                board reads the refined join, so an epic reaches a state through the pull
                request that carries it.
              </li>
              <li>
                The theme. The static prototype followed the operating system. This board
                opens light and carries its own switch.
              </li>
            </ul>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* --------------------------------------------------------------- the page */

function LoadingBoard() {
  return (
    <div className="px-5 py-5">
      <p className="m-0 mb-4 font-serif text-[16px] text-ink-dim">
        Reading the record index and the per-design records.
      </p>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <div className="h-44 animate-pulse rounded-2xl border border-line-soft bg-surface-2" />
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-xl border border-line-soft bg-surface-2"
            />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-xl border border-line-soft bg-surface-2"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EpicFirstMosaic() {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [records, setRecords] = useState<DesignRecords | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [theme, setTheme] = useState<Theme>("light");
  const [lane, setLane] = useState("all");
  const [scope, setScope] = useState<Scope>({
    kind: "design",
    designId: DEFAULT_DESIGN,
  });

  useEffect(() => {
    let live = true;
    setLoad({ state: "loading" });
    setRecords(null);
    setRecordsError(null);

    loadIndex()
      .then((index) => {
        if (live) setLoad({ state: "ready", index });
      })
      .catch((error: unknown) => {
        if (live) setLoad({ state: "failed", message: reason(error) });
      });

    loadDesigns()
      .then((loaded) => {
        if (live) {
          setRecords(loaded);
          setRecordsError(null);
        }
      })
      .catch((error: unknown) => {
        if (live) {
          setRecords(null);
          setRecordsError(reason(error));
        }
      });

    return () => {
      live = false;
    };
  }, [attempt]);

  const rows = useMemo(() => {
    if (load.state !== "ready") return [];
    const entities = entitiesOf(load.index);
    return designRows(
      entities.design,
      entities.epic,
      entities.slice,
      joinsOf(load.index),
    );
  }, [load]);

  const laneRows = useMemo(() => laneRowsOf(rows, lane), [lane, rows]);

  const laneIds = laneRows.map((row) => row.design.id).join("|");

  /** A lane change selects that lane's first design when the current one is absent. */
  useEffect(() => {
    if (lane === "all" || laneIds === "") return;
    if (!laneRows.some((row) => row.design.id === scope.designId)) {
      setScope(designScope(laneRows[0].design.id));
    }
    // `laneIds` stands in for `laneRows`, whose identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lane, laneIds]);

  /** Open on a design that exists, when the default one is not in this bundle. */
  useEffect(() => {
    if (load.state !== "ready" || rows.length === 0) return;
    if (!rows.some((row) => row.design.id === scope.designId)) {
      setScope(designScope(rows[0].design.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load.state, rows.length]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const entry of LANES) {
      out[entry.key] = laneRowsOf(rows, entry.key).length;
    }
    return out;
  }, [rows]);

  const superseded = useMemo(
    () => rows.filter((row) => row.design.stage === "superseded"),
    [rows],
  );

  const railRows = useMemo(
    () =>
      laneRows.map((row) => ({
        id: row.design.id,
        name: row.design.name,
        stage: row.design.stage,
        epics: row.epics.length,
        done: row.done,
        supersededBy: records?.[row.design.id]?.goal.superseded_by ?? null,
      })),
    [laneRows, records],
  );

  const laneBlurb = LANES.find((entry) => entry.key === lane)?.blurb ?? null;

  return (
    <div
      data-theme={theme}
      style={THEME_ALIASES}
      className="relative h-full min-h-0 overflow-y-auto bg-background text-foreground"
    >
      <Tabs value={lane} onValueChange={setLane} className="min-h-full gap-0">
        <header className="sticky top-0 z-20 border-b border-line bg-background/95 backdrop-blur">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <p className="m-0 font-mono text-[12px] tracking-[0.08em] text-ink-faint uppercase">
              CoBuilder viewer · Work · variation B
            </p>
            <h1 className="mt-1 mb-0 font-mono text-[26px] leading-[1.1] font-bold tracking-[-0.03em]">
              Epic-first mosaic
            </h1>
            <p className="mt-1.5 mb-0 max-w-[74ch] font-serif text-[16.5px] leading-[1.5] text-ink-mid">
              The work anchors the page. Every epic for the active design sits in the
              Build region with its slices nested under it, and the seven lens tiles
              beside it show whatever is selected.
            </p>
          </div>

          <div className="ml-auto flex flex-col items-end gap-2.5">
            <TextButton
              icon={theme === "light" ? Moon : Sun}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title={
                theme === "light"
                  ? "Switch this variation to the dark theme"
                  : "Switch this variation back to the light theme"
              }
              className="px-3 py-2 text-[13.5px]"
            >
              {theme === "light" ? "Dark theme" : "Light theme"}
            </TextButton>
            {load.state === "ready" ? (
              <div className="text-right">
                <div className="flex items-baseline justify-end gap-3">
                  <Stat value={rows.length} label="designs" />
                  <Stat value={entitiesOf(load.index).epic.length} label="epics" />
                  <Stat value={entitiesOf(load.index).slice.length} label="slices" />
                </div>
                <p className="mt-1.5 mb-0 font-mono text-[11.5px] text-ink-faint">
                  index.json schema {load.index.schema_version} · git{" "}
                  {load.index.sources.git_head.slice(0, 7)}
                  {records === null ? " · designs.js not loaded" : " · designs.js loaded"}
                </p>
              </div>
            ) : (
              <Chip dashed>
                {load.state === "loading" ? "reading the index" : "index unreadable"}
              </Chip>
            )}
          </div>
        </div>

        {load.state === "ready" ? (
          <LaneTabs counts={counts} total={rows.length} />
        ) : null}
      </header>

      {load.state === "failed" ? (
        <div className="px-5 py-6">
          <div className="max-w-[86ch] rounded-xl border border-dashed border-warn bg-warn-wash px-4 py-3.5">
            <p className="m-0 font-mono text-[12.5px] font-bold tracking-[0.08em] text-warn uppercase">
              The record index did not load
            </p>
            <p className="mt-2 mb-0 font-serif text-[16px] leading-[1.55] text-ink-mid">
              {load.message}
            </p>
            <p className="mt-2 mb-0 font-serif text-[16px] leading-[1.55] text-ink-mid">
              This board arranges the repository&apos;s own records, so it has nothing to
              arrange until that file loads.
            </p>
            <div className="mt-3">
              <TextButton icon={Undo2} onClick={() => setAttempt(attempt + 1)}>
                Read it again
              </TextButton>
            </div>
          </div>
        </div>
      ) : null}

      {load.state === "loading" ? <LoadingBoard /> : null}

      {load.state === "ready" ? (
        <div className="flex min-h-0 flex-col">
          <section className="flex flex-col gap-3 px-5 pt-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <Layers className="size-4 shrink-0 text-ink-faint" />
              <h2 className="m-0 font-mono text-[15px] font-bold tracking-[0.04em] uppercase">
                Designs in this lane
              </h2>
              <Chip>{laneRows.length}</Chip>
              {lane === "all" ? (
                <span className="font-mono text-[12px] text-ink-faint">
                  every design in the index
                </span>
              ) : null}
            </div>

            {laneBlurb ? (
              <p className="m-0 max-w-[86ch] font-serif text-[16px] leading-[1.55] text-ink-mid">
                {laneBlurb}
              </p>
            ) : null}

            <DesignRail
              rows={railRows}
              activeId={scope.designId}
              onSelect={(designId) => setScope(designScope(designId))}
            />
          </section>

          <TabsContent value={lane} className="mt-0">
            <Board
              index={load.index}
              records={records}
              recordsError={recordsError}
              scope={scope}
              onSelect={setScope}
              theme={theme}
            />
          </TabsContent>
        </div>
      ) : null}

      {recordsError !== null && load.state === "ready" ? (
        <div className="px-5 pb-6">
          <div className="max-w-[86ch] rounded-xl border border-dashed border-warn bg-warn-wash px-4 py-3.5">
            <p className="m-0 font-mono text-[12.5px] font-bold tracking-[0.08em] text-warn uppercase">
              The per-design records did not load
            </p>
            <p className="mt-2 mb-0 font-serif text-[16px] leading-[1.55] text-ink-mid">
              {recordsError}
            </p>
            <p className="mt-2 mb-0 font-serif text-[16px] leading-[1.55] text-ink-mid">
              The board still arranges the index: every design, epic, slice, decision, and
              pull request. The record tiles report an empty record rather than a guess.
            </p>
            <div className="mt-3">
              <TextButton icon={Undo2} onClick={() => setAttempt(attempt + 1)}>
                Read it again
              </TextButton>
            </div>
          </div>
        </div>
      ) : null}

      {/* The stage rule's own legend, so a lane badge is never a mystery. */}
      <footer className="border-t border-line bg-surface-2 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[12px] tracking-[0.06em] text-ink-faint uppercase">
            stage colours
          </span>
          {Object.entries(STAGE_TONE).map(([stage, tone]) => (
            <Chip key={stage} tone={tone} title={STAGE_GLOSS[stage]}>
              {stage}
            </Chip>
          ))}
          <span className="ml-auto flex flex-wrap items-center gap-3 font-mono text-[12px] text-ink-faint">
            <span className="inline-flex items-center gap-1.5">
              <ScrollText className="size-3.5" /> record
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Compass className="size-3.5" /> intent
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" /> assessment
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Gavel className="size-3.5" /> decisions
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ListChecks className="size-3.5" /> build
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Workflow className="size-3.5" /> diagrams
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GitPullRequest className="size-3.5" /> pull requests
            </span>
          </span>
        </div>
        <p className="mt-3 mb-0 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] text-ink-faint">
          <Split className="size-3.5" />
          {superseded.length} superseded{" "}
          {superseded.length === 1 ? "design sits" : "designs sit"} outside every lane:{" "}
          {superseded
            .map((row) => {
              const by = records?.[row.design.id]?.goal.superseded_by;
              return `${row.design.name}${by ? ` → ${by}` : ""}`;
            })
            .join(", ")}
          . Select one under All to read it as history. This board opens light and
          carries its own theme switch, so the surrounding page is free to differ.
        </p>
      </footer>
      </Tabs>
    </div>
  );
}
