import { Copy } from "lucide-react";
import { useContext } from "react";

import { cn } from "@/lib/utils";

import { CopyPromptContext, type CopyPrompt } from "./useCopyPrompt";
import type { AddressNotice } from "./shape";

const BUTTON_CLASS = cn(
  "relative z-10 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-faint pointer-coarse:size-11",
  "hover:bg-surface-2 hover:text-ink active:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);
const NOTICE_CLASS = "pointer-events-auto m-0 flex max-w-[60ch] flex-col gap-1.5 rounded-md px-3 py-1.5 font-mono text-[12.5px] shadow-raise";
const CLOSE_CLASS = cn(
  "inline-flex h-7 cursor-pointer items-center self-start rounded-md border border-current px-2 font-bold active:translate-y-px",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

export function CopyButton({ name, prompt }: { name: string; prompt: string | null }) {
  const copy = useContext(CopyPromptContext);
  if (prompt === null) return null;
  return (
    <button type="button" aria-label={`Copy the start prompt for ${name}`} onClick={() => copy(prompt)} className={BUTTON_CLASS}>
      <Copy size={14} aria-hidden="true" />
    </button>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return <button type="button" onClick={onClose} className={CLOSE_CLASS}>Close</button>;
}

function CopyResult({ copy }: { copy: CopyPrompt }) {
  const { notice, dismiss } = copy;
  if (notice === null) return null;
  if (notice.kind === "copied") return <p className={cn(NOTICE_CLASS, "bg-good-wash text-good")}>Prompt copied</p>;
  return (
    <div className={cn(NOTICE_CLASS, "border border-destructive bg-danger-wash text-destructive")}>
      <span>Copy failed</span>
      <code className="select-text break-all font-mono text-ink">{notice.prompt}</code>
      <CloseButton onClose={dismiss} />
    </div>
  );
}

function AddressMessage({ notice, onClose }: { notice: AddressNotice | null; onClose: () => void }) {
  if (notice === null) return null;
  return (
    <div className={cn(NOTICE_CLASS, "border border-line bg-surface text-ink-mid")}>
      <span>The record index holds no program named “{notice.value}”. This is the program board.</span>
      <CloseButton onClose={onClose} />
    </div>
  );
}

interface BoardNoticesProps {
  copy: CopyPrompt;
  address: AddressNotice | null;
  onCloseAddress: () => void;
}

export function BoardNotices({ copy, address, onCloseAddress }: BoardNoticesProps) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="pointer-events-none absolute top-14 right-4 z-30 flex flex-col items-end gap-2">
      <AddressMessage notice={address} onClose={onCloseAddress} />
      <CopyResult copy={copy} />
    </div>
  );
}
