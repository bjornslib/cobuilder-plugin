import { Badge } from "@/components/ui/badge";

import { CorpusLine } from "./CorpusLine";
import type { Load, Waiting } from "./indexLoad";

function AppBlurb() {
  return (
    <p className="mt-1 max-w-[62ch] font-serif text-[15.5px] leading-[1.45] text-ink-mid">
      Every design in this repository's own record index, on one board. Pick a
      lane to narrow the board.
    </p>
  );
}

function AppTitle() {
  return (
    <div className="min-w-0">
      <h1 className="m-0 font-mono text-[22px] font-bold tracking-[-0.03em]">
        CoBuilder viewer{" "}
        <span className="text-ink-faint">&middot;</span> Work
      </h1>
      <AppBlurb />
    </div>
  );
}

function WaitingBadge({ load }: { load: Waiting }) {
  return (
    <Badge variant="outline" className="font-mono text-[10.5px]">
      {load.state === "loading" ? "reading index.json" : "index unreadable"}
    </Badge>
  );
}

function CorpusStatus({ load }: { load: Load }) {
  return load.state === "ready" ? (
    <CorpusLine index={load.index} />
  ) : (
    <WaitingBadge load={load} />
  );
}

export function AppHeader({ load }: { load: Load }) {
  return (
    <header className="flex flex-wrap items-end gap-x-6 gap-y-3 px-5 pt-5 pb-3">
      <AppTitle />
      <div className="ml-auto">
        <CorpusStatus load={load} />
      </div>
    </header>
  );
}
