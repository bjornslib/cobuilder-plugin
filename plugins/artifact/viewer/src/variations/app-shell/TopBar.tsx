/**
 * The top bar. It never scrolls and it never moves.
 *
 * Three controls and one status, held on one line at every width, per
 * interaction-design section 2.1. The work-item switcher rewrites the route and
 * keeps the section where the new work item can fill it.
 *
 * The bar renders from the route before the index resolves, so the work item's name
 * is present at first paint and the switcher's list fills in behind it. That is the
 * loading state of section 3.2: a skeleton the width of a design name.
 */

import { useEffect, useRef, useState } from "react";

import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown, Layers, Moon, Search, Sun } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

import { STATE_GLOSS } from "./gloss";
import type { SwitcherDesign, SwitcherEpic } from "./model";
import { Chip, StateBadge, toneForStage } from "./atoms";
import type { Theme } from "./Diagram";

export interface TopBarProps {
  workId: string | null;
  workName: string | null;
  stage: string | null;
  supersededBy: string | null;
  ready: boolean;
  designs: SwitcherDesign[];
  epics: SwitcherEpic[];
  onChooseWork: (id: string) => void;
  onChooseEpic: (design: string, epicId: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
  /** The id of the scroll pane, so the skip link and the switcher can reach it. */
  paneId: string;
  nameId: string;
}

function IconButton({
  label,
  icon: Icon,
  onClick,
  children,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  children?: never;
}) {
  void children;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface text-ink-mid",
        "transition-colors duration-150 ease-house hover:bg-surface-2 hover:text-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      )}
    >
      <Icon className="size-[18px]" aria-hidden="true" />
    </button>
  );
}

export function TopBar({
  workId,
  workName,
  stage,
  supersededBy,
  ready,
  designs,
  epics,
  onChooseWork,
  onChooseEpic,
  theme,
  onToggleTheme,
  paneId,
  nameId,
}: TopBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const nameRef = useRef<HTMLSpanElement>(null);

  /* A work-item change moves focus to the bar's work-item name, per section 8.4. */
  useEffect(() => {
    if (workId) nameRef.current?.focus();
  }, [workId]);

  const needle = query.trim().toLowerCase();
  const shownDesigns = needle
    ? designs.filter((d) => d.id.toLowerCase().includes(needle))
    : designs;
  const shownEpics = needle
    ? epics.filter(
        (e) => e.id.toLowerCase().includes(needle) || e.epicId.toLowerCase().includes(needle),
      )
    : epics.slice(0, 8);

  return (
    <header
      className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-2"
      style={{ zIndex: "var(--layer-fixed)" }}
    >
      <a
        href={`#${paneId}`}
        className={cn(
          "sr-only rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[12.5px] text-primary",
          "focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[var(--layer-panel)]",
        )}
      >
        Skip to the scroll pane
      </a>

      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            className={cn(
              "group flex min-h-11 min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-left",
              "transition-colors duration-150 ease-house hover:bg-surface-2",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            )}
            aria-label="Change work item"
          >
            <Layers className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
            <span className="flex min-w-0 flex-col">
              <span className="font-mono text-[11.5px] tracking-[0.08em] text-ink-faint uppercase">
                Work item
              </span>
              <span
                id={nameId}
                ref={nameRef}
                tabIndex={-1}
                className="max-w-[38ch] truncate font-mono text-[15px] font-bold outline-none"
              >
                {workName ?? (ready ? "No work item" : "reading index.json…")}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-ink-faint transition-transform duration-150 ease-house",
                open && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={6}
            style={{ zIndex: "var(--layer-panel)" }}
            className="w-[420px] max-w-[92vw] rounded-xl border border-line bg-card p-0 shadow-frame outline-none"
          >
            <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2">
              <Search className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter by design id or epic id"
                aria-label="Filter the work item list"
                className="min-h-9 w-full bg-transparent font-mono text-[13px] text-foreground outline-none placeholder:text-ink-faint"
              />
            </div>

            <div className="max-h-[62vh] overflow-auto px-2 py-2">
              <p className="m-0 px-2 pt-1 pb-1.5 font-mono text-[12px] tracking-[0.08em] text-ink-faint uppercase">
                Designs
              </p>
              {shownDesigns.length === 0 ? (
                <p className="m-0 px-2 py-2 font-mono text-[12.5px] text-ink-dim">
                  The bundle holds no design with that id.
                </p>
              ) : null}
              {shownDesigns.map((design) => {
                const current = design.id === workId;
                return (
                  <button
                    key={design.id}
                    type="button"
                    aria-current={current ? "true" : undefined}
                    onClick={() => {
                      onChooseWork(design.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left",
                      "transition-colors duration-150 ease-house hover:bg-surface-2",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      current && "bg-accent-wash",
                    )}
                  >
                    <Check
                      className={cn(
                        "size-4 shrink-0",
                        current ? "text-accent-deep" : "text-transparent",
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-[13.5px]">
                      {design.id}
                    </span>
                    <span className="shrink-0 font-mono text-[12px] text-ink-faint">
                      {design.epicCount} {design.epicCount === 1 ? "epic" : "epics"}
                    </span>
                    <Chip tone={toneForStage(design.stage)} title={STATE_GLOSS[design.stage]}>
                      {design.stage}
                    </Chip>
                  </button>
                );
              })}

              <p className="m-0 mt-2 border-t border-line-soft px-2 pt-2.5 pb-1.5 font-mono text-[12px] tracking-[0.08em] text-ink-faint uppercase">
                Epics {needle ? "" : "(first 8)"}
              </p>
              {shownEpics.length === 0 ? (
                <p className="m-0 px-2 py-2 font-mono text-[12.5px] text-ink-dim">
                  No epic matches. Clear the filter to see the whole list.
                </p>
              ) : null}
              {shownEpics.map((epic) => (
                <button
                  key={epic.id}
                  type="button"
                  onClick={() => {
                    onChooseEpic(epic.design, epic.epicId);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left",
                    "transition-colors duration-150 ease-house hover:bg-surface-2",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  )}
                >
                  <span className="w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate font-mono text-[13.5px]">
                    {epic.id}
                  </span>
                  <Chip>{epic.state}</Chip>
                </button>
              ))}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      <div className="flex min-w-0 items-center gap-2">
        {stage ? (
          <StateBadge
            word={stage}
            tone={toneForStage(stage)}
            gloss={STATE_GLOSS[stage] ?? "A stage outside the recorded vocabulary."}
          />
        ) : (
          <StateBadge word="unknown" tone="neutral" gloss="The index has not resolved." />
        )}
        {supersededBy ? (
          <Chip tone="warn" title="A later design closed this one.">
            superseded by {supersededBy}
          </Chip>
        ) : null}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <IconButton
          label={theme === "light" ? "Switch to the dark theme" : "Switch to the light theme"}
          icon={theme === "light" ? Moon : Sun}
          onClick={onToggleTheme}
        />
      </div>
    </header>
  );
}
