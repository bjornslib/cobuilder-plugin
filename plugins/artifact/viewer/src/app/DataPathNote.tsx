import { ChevronRight, Database } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BUNDLE_DATA_URL, BUNDLE_MOUNT } from "@/data/bundle";

const TRIGGER_CLASS =
  "group h-auto w-full justify-start gap-2 px-3.5 py-2 font-mono text-[11px] font-bold text-ink-mid";
const NOTE_FIRST = "max-w-[80ch] font-serif text-[13.5px] leading-[1.5] text-ink-mid";
const NOTE_NEXT = "mt-2 max-w-[80ch] font-serif text-[13.5px] leading-[1.5] text-ink-mid";

function Code({ children }: { children: ReactNode }) {
  return <code className="font-mono text-[11.5px]">{children}</code>;
}

function TriggerBody() {
  return (
    <>
      <ChevronRight className="size-3.5 text-ink-faint transition-transform duration-200 ease-house group-data-[state=open]:rotate-90" />
      <Database className="size-3.5 text-ink-faint" />
      How this application reaches the bundle
    </>
  );
}

function NoteTrigger() {
  return (
    <CollapsibleTrigger asChild>
      <Button variant="ghost" className={TRIGGER_CLASS}>
        <TriggerBody />
      </Button>
    </CollapsibleTrigger>
  );
}

function NoteReach() {
  return (
    <p className={NOTE_FIRST}>
      The bundle root sits at{" "}
      <Code>{BUNDLE_MOUNT}</Code>, so this
      page reads <Code>{BUNDLE_DATA_URL}index.json</Code>{" "}
      straight off disk. No regeneration step sits between the corpus and the
      board.
    </p>
  );
}

function NoteBuild() {
  return (
    <p className={NOTE_NEXT}>
      A published Artifact cannot fetch, because ADR-0001 gives it a policy that
      blocks every outbound request. That build inlines the same data as{" "}
      <Code>window.INDEX</Code> instead, and{" "}
      <Code>loadIndex</Code> prefers the
      global when one exists. Both readers meet at one function, so a surface
      never asks which one ran.
    </p>
  );
}

function NoteShape() {
  return (
    <p className={NOTE_NEXT}>
      The other bundle records have the same shape. This scaffold wires none of
      them yet, and the mapping is written down in{" "}
      <Code>src/data/bundle.ts</Code>.
    </p>
  );
}

function DataPathNote() {
  return (
    <Collapsible className="rounded-lg border border-line-soft bg-surface-2">
      <NoteTrigger />
      <CollapsibleContent className="px-3.5 pt-1 pb-3.5">
        <NoteReach />
        <NoteBuild />
        <NoteShape />
      </CollapsibleContent>
    </Collapsible>
  );
}

export function DataPathStrip() {
  return (
    <div className="px-5 pb-3">
      <DataPathNote />
    </div>
  );
}
