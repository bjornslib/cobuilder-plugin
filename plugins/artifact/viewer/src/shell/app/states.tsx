import { Database, RotateCcw } from "lucide-react";

import { BUNDLE_DATA_URL } from "@/data/bundle";
import { cn } from "@/lib/utils";

import { TopBar } from "../TopBar";
import { ProvidedFrame, Pane } from "./frame";
import { CARD_TEXT_CLASS, WarnCard } from "./notes";
import { failedBarProps } from "./topBarProps";
import type { ShellState } from "./useShellState";

const RETRY_CLASS = cn(
  "mt-3.5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3.5 font-mono text-[12.5px] font-bold text-ink-mid",
  "transition-colors duration-150 ease-house hover:bg-surface-2",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button type="button" onClick={onRetry} className={RETRY_CLASS}>
      <RotateCcw className="size-4" aria-hidden="true" />
      Retry
    </button>
  );
}

function FailureBody({ message, reload }: { message: string; reload: () => void }) {
  return (
    <>
      <p className={CARD_TEXT_CLASS}>{message}</p>
      <p className="mt-2 mb-0 font-mono text-[12.5px] break-all text-ink-dim">
        path read: {BUNDLE_DATA_URL}index.json
      </p>
      <RetryButton onRetry={reload} />
    </>
  );
}

export function FailedShell({ s, message }: { s: ShellState; message: string }) {
  return (
    <ProvidedFrame reduce={s.reduce}>
      <TopBar {...failedBarProps(s)} />
      <Pane>
        <WarnCard title="The record index did not load">
          <FailureBody message={message} reload={s.reload} />
        </WarnCard>
      </Pane>
    </ProvidedFrame>
  );
}

function EmptyHeading() {
  return (
    <p className="m-0 flex items-center gap-2 font-mono text-[12.5px] font-bold tracking-[0.06em] text-ink-dim uppercase">
      <Database className="size-4" aria-hidden="true" />
      The bundle holds no work
    </p>
  );
}

function EmptyText() {
  return (
    <p className={CARD_TEXT_CLASS}>
      The index resolved from{" "}
      <code className="font-mono text-[13px]">{BUNDLE_DATA_URL}index.json</code> and
      lists no design. Write a bundle with{" "}
      <code className="font-mono text-[13px]">/pr:baseline</code>, then reload this
      page.
    </p>
  );
}

function EmptyCard() {
  return (
    <div className="max-w-[80ch] rounded-xl border border-dashed border-line bg-surface-2 px-4 py-3.5">
      <EmptyHeading />
      <EmptyText />
    </div>
  );
}

export function EmptyShell({ reduce }: { reduce: boolean }) {
  return (
    <ProvidedFrame reduce={reduce}>
      <Pane>
        <EmptyCard />
      </Pane>
    </ProvidedFrame>
  );
}
