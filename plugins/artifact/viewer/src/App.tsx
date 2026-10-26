import { useMemo } from "react";

import { WorkBoard } from "@/components/work/WorkBoard";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { DesignRow } from "@/data/types";

import { AppHeader } from "./app/AppHeader";
import { DataPathStrip } from "./app/DataPathNote";
import { rowsOf, useIndexState, type Load } from "./app/indexLoad";
import { Pending } from "./app/Pending";

function AppMain({ load, rows }: { load: Load; rows: DesignRow[] }) {
  return (
    <main className="min-h-0 flex-1">
      {load.state === "ready" ? <WorkBoard rows={rows} /> : <Pending load={load} />}
    </main>
  );
}

function AppFrame({ load }: { load: Load }) {
  const rows = useMemo(() => rowsOf(load), [load]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <AppHeader load={load} />
      <DataPathStrip />
      <Separator className="bg-line" />
      <AppMain load={load} rows={rows} />
    </div>
  );
}

export default function App() {
  const load = useIndexState();

  return (
    <TooltipProvider delayDuration={150}>
      <AppFrame load={load} />
    </TooltipProvider>
  );
}
