import { createContext, useCallback, useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";

import type { CopyNotice } from "./shape";

const HOLD_ACK_MS = 1800;

export interface CopyPrompt {
  notice: CopyNotice | null;
  copy: (prompt: string) => Promise<void>;
  dismiss: () => void;
}

export const CopyPromptContext = createContext<(prompt: string) => void>(() => undefined);

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function useHold(set: Dispatch<SetStateAction<CopyNotice | null>>) {
  const timer = useRef(0);
  const stop = useCallback(() => window.clearTimeout(timer.current), []);
  const start = useCallback(() => {
    stop();
    timer.current = window.setTimeout(() => set(null), HOLD_ACK_MS);
  }, [stop, set]);
  useEffect(() => stop, [stop]);
  return { start, stop };
}

function useEscape(active: boolean, dismiss: () => void): void {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && dismiss();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, dismiss]);
}

function useCopy(set: Dispatch<SetStateAction<CopyNotice | null>>, origin: RefObject<HTMLElement | null>) {
  const hold = useHold(set);
  return useCallback(async (prompt: string) => {
    origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    hold.stop();
    const written = await writeClipboard(prompt);
    set(written ? { kind: "copied" } : { kind: "failed", prompt });
    if (written) hold.start();
  }, [hold, set, origin]);
}

export function useCopyPrompt(): CopyPrompt {
  const [notice, setNotice] = useState<CopyNotice | null>(null);
  const origin = useRef<HTMLElement | null>(null);
  const copy = useCopy(setNotice, origin);
  const dismiss = useCallback(() => {
    setNotice(null);
    origin.current?.focus();
  }, []);
  useEscape(notice?.kind === "failed", dismiss);
  return { notice, copy, dismiss };
}
