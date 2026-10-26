import { useEffect, useRef, type CSSProperties, type MouseEvent, type ReactNode, type RefObject } from "react";

import { createPortal } from "react-dom";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

import { DialogBody } from "./DialogBody";
import type { Drawn } from "./drawn";
import { useFitScale } from "./useFitScale";
import { ZoomControls, useZoom, type Zoom } from "./Zoom";

const BACKDROP_STYLE: CSSProperties = { zIndex: "var(--layer-panel)" };
const MODAL_STYLE: CSSProperties = { zIndex: "var(--layer-modal)" };
const DIALOG_CLASS =
  "fixed top-1/2 left-1/2 flex h-[85vh] w-[92vw] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-frame";
const HEADER_CLASS =
  "flex min-w-0 shrink-0 items-center gap-3 border-b border-line-soft bg-surface-2 px-4 py-2";
const CLOSE_CLASS = cn(
  "ml-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface text-ink-mid",
  "transition-colors duration-150 ease-house hover:bg-surface-3",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

/* Escape closes, and focus starts on the control that closes it. */
function useDialogKeys(onClose: () => void) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return closeRef;
}

/* The backdrop is the target only when the press missed the dialog. */
function closeOnBackdrop(event: MouseEvent<HTMLDivElement>, onClose: () => void): void {
  if (event.target === event.currentTarget) onClose();
}

function Backdrop({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div
      role="presentation"
      style={BACKDROP_STYLE}
      className="fixed inset-0 bg-black/10 backdrop-blur-xs"
      onMouseDown={(event) => closeOnBackdrop(event, onClose)}
    >
      {children}
    </div>
  );
}

function DialogBox({ label, level, children }: { label: string; level: string; children: ReactNode }) {
  return (
    <div
      role="dialog" aria-modal="true"
      aria-label={`${label} drawing, level ${level}`}
      style={MODAL_STYLE}
      className={DIALOG_CLASS}
    >
      {children}
    </div>
  );
}

function CloseButton({ closeRef, onClose }: { closeRef: HeaderProps["closeRef"]; onClose: () => void }) {
  return (
    <button ref={closeRef} type="button" onClick={onClose} aria-label="Close the drawing" className={CLOSE_CLASS}>
      <X className="size-4" aria-hidden="true" />
    </button>
  );
}

interface FrameProps {
  label: string;
  level: string;
  onClose: () => void;
  children: ReactNode;
}

function DialogFrame({ label, level, onClose, children }: FrameProps) {
  return (
    <Backdrop onClose={onClose}>
      <DialogBox label={label} level={level}>
        {children}
      </DialogBox>
    </Backdrop>
  );
}

interface HeaderProps {
  label: string;
  level: string;
  zoom: Zoom;
  closeRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

function DialogHeader({ label, level, zoom, closeRef, onClose }: HeaderProps) {
  return (
    <header className={HEADER_CLASS}>
      <span className="font-mono text-[12px] tracking-[0.05em] text-ink-dim uppercase">{label}</span>
      <span className="min-w-0 font-mono text-[12px] text-ink-faint">level {level}</span>
      <span className="ml-auto flex min-w-0 items-center gap-1.5">
        <ZoomControls zoom={zoom} />
        <CloseButton closeRef={closeRef} onClose={onClose} />
      </span>
    </header>
  );
}

export interface DialogProps {
  level: string;
  label: string;
  drawn: Drawn;
  source: string;
  onClose: () => void;
}

function DialogShell(props: DialogProps) {
  const { level, label, drawn, source, onClose } = props;
  const closeRef = useDialogKeys(onClose);
  const zoom = useZoom();
  const fit = useFitScale<HTMLDivElement, HTMLDivElement>(drawn.state === "ready" ? drawn.svg : "", 1);
  return (
    <DialogFrame label={label} level={level} onClose={onClose}>
      <DialogHeader label={label} level={level} zoom={zoom} closeRef={closeRef} onClose={onClose} />
      <DialogBody drawn={drawn} level={level} source={source} scale={fit.scale * zoom.factor} bodyRef={fit.boxRef} drawingRef={fit.drawingRef} />
    </DialogFrame>
  );
}

/**
 * One drawing, whole, over the shell.
 *
 * A modal dialog and not a popover. A thumbnail cannot anchor a drawing that needs a
 * thousand pixels, and a popover anchored to a 380 px tile would overflow the viewport
 * before the drawing was legible.
 *
 * The pattern is the record Sheet's: a portal to `document.body`, Escape closes, the
 * backdrop closes, and the close button is 44 px. The two z-indexes come from the layer
 * scale in `src/index.css`, which lives on the root so portalled content can read it.
 * The backdrop carries no blur, because this shell already recorded what two
 * `backdrop-filter` layers do to each other in Chrome.
 *
 * A level whose render failed shows its source here instead. That is the offline
 * fallback, and the only place the source survives.
 */
export function DiagramDialog(props: DialogProps) {
  return createPortal(<DialogShell {...props} />, document.body);
}
