import { LayoutGrid, Moon, Sun, type LucideIcon } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import type { Theme } from "../DiagramTiles";

export const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const ICON_BUTTON_CLASS = cn(
  "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface text-ink-mid",
  "transition-colors duration-150 ease-house hover:bg-surface-2 hover:text-foreground",
  FOCUS_RING,
);

const SKIP_CLASS = cn(
  "sr-only rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[12.5px] text-primary",
  "focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[var(--layer-panel)]",
);

interface IconButtonProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  children?: never;
}

function IconButton({ label, icon: Icon, onClick }: IconButtonProps) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={ICON_BUTTON_CLASS}>
      <Icon className="size-[18px]" aria-hidden="true" />
    </button>
  );
}

export function SkipLink({ paneId }: { paneId: string }) {
  return (
    <a href={`#${paneId}`} className={SKIP_CLASS}>
      Skip to the scroll pane
    </a>
  );
}

/*
 * Below 768 px the rail is a drawer and this is the one control that reaches it,
 * per section 9.3. From 768 px up the rail is on screen, and the sidebar's own
 * edge handle and `Cmd` or `Ctrl` plus `B` collapse it.
 *
 * `variant="ghost"` is not decoration. The Button default hovers to
 * `hover:bg-primary/80`, a deep teal, which breaks the rule that no hover may fill
 * with the heading colour. Ghost hovers to `--muted`, a light tint, and an icon
 * button is standard, not filled, in M3.
 */
export function MobileTrigger() {
  return <SidebarTrigger variant="ghost" className="size-11 shrink-0 cursor-pointer md:hidden" />;
}

/*
 * The Work board's own icon, per ADR-0034: the one control that opens the drawer
 * from any level. `aria-haspopup="dialog"` is what the drawer is, and the pressed
 * state carries the open state, so a screen reader reads it on the icon itself.
 */
export function WorkBoardButton({ onOpenWork }: { onOpenWork: () => void }) {
  return (
    <button type="button" onClick={onOpenWork} aria-label="Work board" aria-haspopup="dialog" title="Work board" className={ICON_BUTTON_CLASS}>
      <LayoutGrid className="size-[18px]" aria-hidden="true" />
    </button>
  );
}

export function ThemeToggle({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const light = theme === "light";
  const label = light ? "Switch to the dark theme" : "Switch to the light theme";
  return (
    <div className="ml-auto flex shrink-0 items-center gap-2">
      <IconButton label={label} icon={light ? Moon : Sun} onClick={onToggleTheme} />
    </div>
  );
}
