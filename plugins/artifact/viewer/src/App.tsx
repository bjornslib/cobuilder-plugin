import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Database } from "lucide-react";

import { WorkBoard } from "@/components/work/WorkBoard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  BUNDLE_MOUNT,
  designRows,
  entitiesOf,
  joinsOf,
  loadIndex,
} from "@/data/bundle";
import type { DesignRow, RecordIndex } from "@/data/types";

type Load =
  | { state: "loading" }
  | { state: "ready"; index: RecordIndex }
  | { state: "failed"; message: string };

function CorpusLine({ index }: { index: RecordIndex }) {
  const entities = entitiesOf(index);
  const items: Array<[number, string]> = [
    [entities.design.length, "designs"],
    [entities.epic.length, "epics"],
    [entities.adr.length, "decisions"],
    [entities.pull_request.length, "pull requests"],
  ];
  return (
    <div className="text-right font-mono text-[10.5px] leading-[1.7] text-ink-dim">
      <div>
        {items.map(([count, label], i) => (
          <span key={label}>
            {i > 0 ? <span className="text-ink-faint"> · </span> : null}
            <b className="text-[13px] font-bold text-foreground tabular-nums">
              {count}
            </b>{" "}
            {label}
          </span>
        ))}
      </div>
      <div className="text-ink-faint">
        read from <code>{`.cobuilder-architect/self/data/index.json`}</code>,
        schema {index.schema_version}, git{" "}
        {index.sources.git_head.slice(0, 7)}
      </div>
    </div>
  );
}

function DataPathNote() {
  return (
    <Collapsible className="rounded-lg border border-line-soft bg-surface-2">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="group h-auto w-full justify-start gap-2 px-3.5 py-2 font-mono text-[11px] font-bold text-ink-mid"
        >
          <ChevronRight className="size-3.5 text-ink-faint transition-transform duration-200 ease-house group-data-[state=open]:rotate-90" />
          <Database className="size-3.5 text-ink-faint" />
          How this application reaches the bundle
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3.5 pt-1 pb-3.5">
        <p className="max-w-[80ch] font-serif text-[13.5px] leading-[1.5] text-ink-mid">
          The dev server mounts the bundle root at{" "}
          <code className="font-mono text-[11.5px]">{BUNDLE_MOUNT}</code>, so this
          page reads <code className="font-mono text-[11.5px]">/bundle/data/index.json</code>{" "}
          straight off disk. No regeneration step sits between the corpus and the
          board.
        </p>
        <p className="mt-2 max-w-[80ch] font-serif text-[13.5px] leading-[1.5] text-ink-mid">
          A published Artifact cannot fetch, because ADR-0001 gives it a policy that
          blocks every outbound request. That build inlines the same data as{" "}
          <code className="font-mono text-[11.5px]">window.INDEX</code> instead, and{" "}
          <code className="font-mono text-[11.5px]">loadIndex</code> prefers the
          global when one exists. Both readers meet at one function, so a surface
          never asks which one ran.
        </p>
        <p className="mt-2 max-w-[80ch] font-serif text-[13.5px] leading-[1.5] text-ink-mid">
          The other bundle records have the same shape. This scaffold wires none of
          them yet, and the mapping is written down in{" "}
          <code className="font-mono text-[11.5px]">src/data/bundle.ts</code>.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function App() {
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    let live = true;
    loadIndex()
      .then((index) => {
        if (live) setLoad({ state: "ready", index });
      })
      .catch((error: unknown) => {
        if (live) {
          setLoad({
            state: "failed",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      live = false;
    };
  }, []);

  const rows: DesignRow[] = useMemo(() => {
    if (load.state !== "ready") return [];
    const entities = entitiesOf(load.index);
    return designRows(
      entities.design,
      entities.epic,
      entities.slice,
      joinsOf(load.index),
    );
  }, [load]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        <header className="flex flex-wrap items-end gap-x-6 gap-y-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h1 className="m-0 font-mono text-[22px] font-bold tracking-[-0.03em]">
              CoBuilder viewer{" "}
              <span className="text-ink-faint">&middot;</span> Work
            </h1>
            <p className="mt-1 max-w-[62ch] font-serif text-[15.5px] leading-[1.45] text-ink-mid">
              Every design in this repository's own record index, on one board. Pick a
              lane to narrow the board.
            </p>
          </div>
          <div className="ml-auto">
            {load.state === "ready" ? (
              <CorpusLine index={load.index} />
            ) : (
              <Badge variant="outline" className="font-mono text-[10.5px]">
                {load.state === "loading" ? "reading index.json" : "index unreadable"}
              </Badge>
            )}
          </div>
        </header>

        <div className="px-5 pb-3">
          <DataPathNote />
        </div>

        <Separator className="bg-line" />

        <main className="min-h-0 flex-1">
          {load.state === "ready" ? (
            <WorkBoard rows={rows} />
          ) : (
            <div className="px-5 py-6">
              {load.state === "loading" ? (
                <p className="font-serif text-[14px] text-ink-dim">
                  Reading the record index.
                </p>
              ) : (
                <div className="max-w-[80ch] rounded-lg border border-dashed border-warn bg-warn-wash px-4 py-3">
                  <p className="m-0 font-mono text-[11px] font-bold tracking-[0.08em] text-warn uppercase">
                    The record index did not load
                  </p>
                  <p className="mt-1.5 mb-0 font-serif text-[14px] leading-[1.5] text-ink-mid">
                    {load.message}
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}
