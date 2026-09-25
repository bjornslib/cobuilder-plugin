/**
 * One work item, read through a rail grouped in three parts.
 *
 * THE GROUPS ARE THE ENGINEER'S. Build holds Intent, Problem & Solution, Architecture,
 * Epics, and Rubrics, all read from the program's account. Review holds Intent, Problem &
 * Solution, Architecture, and File Diffs, all read from the change's account. Deploy
 * holds the shipped shell's own two delivery entries, and the engineer named that group
 * without naming its items.
 *
 * THE RAIL SHOWS WHICH ACCOUNT EACH GROUP READS. Because Intent, Problem & Solution, and
 * Architecture appear twice, a reader who cannot tell the groups apart cannot tell the
 * accounts apart. Each group header carries the account's word, and each row carries the
 * same word in its own meta slot, so the account travels with the row and not only with
 * the heading above it.
 *
 * WHERE THE CONVENTIONS COME FROM. `src/shell/Rail.tsx` is the shipped rail and
 * `./LevelRail.tsx` is the reviewed prototype's. This file takes from both:
 *
 *   The width. The shell sets its sidebar to fifteen and a half rem, so a rail renders
 *   two hundred and forty-eight pixels. This rail is that wide.
 *
 *   The row frame. The same utilities in the same order, including the two-pixel focus
 *   ring and the fifteen-hundredth-of-a-second colour transition.
 *
 *   The current row. The shipped rail's own four, and the address match that decides it.
 *
 *   The group label. Mono, twelve pixels, bold, wide tracking, faint, uppercase. The
 *   shipped rail folds a labelled group and this rail does not: the three groups are the
 *   engineer's decided shape, and folding one would hide the shape being read.
 *
 *   The arrow-key walk. The two key names, the one guard, a position read at the press,
 *   and a press that moves nothing at either end.
 *
 * WHAT THIS RAIL LEAVES OUT. The sidebar's own collapse, its icon mode, its mobile
 * drawer, and its open and close shortcut all belong to the shell's `SidebarProvider`.
 * This prototype is one page, so the rail is fixed and always expanded.
 */

import { useEffect, useRef } from "react";

import {
  ClipboardCheck,
  FileText,
  GitPullRequest,
  ListTree,
  Network,
  PackageCheck,
  Target,
  TriangleAlert,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { keyPressIsTaken } from "@/shell/Pager";

import { ACCOUNT_MARK } from "./accountModel";
import type { AccountId, GroupKey, RailGroup, RailRow } from "./accountModel";

/**
 * One icon per row key, and one per group.
 *
 * The icon is decoration and it carries no order, exactly as the shipped rail's map does
 * not. The two icons that a shipped surface already owns are reused rather than replaced:
 * the triangle for the problem and solution section, and the network for the architecture
 * one.
 */
const ROW_ICON: Record<string, LucideIcon> = {
  "program-intent": Target,
  "program-problem-and-solution": TriangleAlert,
  "program-architecture": Network,
  "program-epics": ListTree,
  "program-rubrics": ClipboardCheck,
  "change-intent": Target,
  "change-problem-and-solution": TriangleAlert,
  "change-architecture": Network,
  "change-file-diffs": FileText,
  "delivery-shipped": PackageCheck,
  "delivery-pull-requests": GitPullRequest,
};

const GROUP_ICON: Record<GroupKey, LucideIcon> = {
  build: Target,
  review: GitPullRequest,
  deploy: PackageCheck,
};

/**
 * The frame every row shares.
 *
 * It is the shipped rail's own frame with the collapsed-size rules removed, because this
 * rail never collapses. `outline-solid` is not decoration: the two-pixel outline reads its
 * style from a variable a sidebar sets to none, and this line sets it back for the case
 * where this rail is ever rendered inside one.
 */
const ROW_FRAME = cn(
  "flex min-h-9 w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left",
  "font-mono text-[13px] leading-[1.3]",
  "transition-colors duration-150 ease-house",
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
);

/**
 * How a group's own account is drawn on the header and on its rows.
 *
 * THE PROPOSED ACCOUNT MARK. ADR-0029 leaves the mark between the two accounts to a later
 * slice, and this prototype proposes one so the engineer can judge it. Three things carry
 * it, and each is independent of the other two, so no reader depends on colour alone:
 *
 *   a word, the account's own, on the group header and on every row's meta slot;
 *   a glyph, one per account, on the group header;
 *   a fill, the shell's own selected-row wash for the program's account, the shell's own
 *     heading band for the change's, and the neutral surface for the delivery record.
 *
 * The delivery account is neutral on purpose. It is neither of the two accounts the
 * engineer is comparing, so it must not wear either of their fills.
 */
const ACCOUNT_FILL: Record<AccountId, string> = {
  program: "border-primary/50 bg-accent-wash text-accent-deep",
  change: "border-transparent bg-band text-band-ink",
  delivery: "border-line bg-surface-2 text-ink-mid",
};

const ACCOUNT_GLYPH: Record<AccountId, LucideIcon> = {
  program: User,
  change: GitPullRequest,
  delivery: PackageCheck,
};

/**
 * The rail's rows, walked with the up and down arrows.
 *
 * The walk steps every row the rail renders, in the order it renders them, and it crosses
 * a group boundary as one step. At either end the press moves nothing. The current row
 * follows the walk, because the row that reads current is the row whose address is the
 * reader's.
 *
 * The position is read at the press rather than at the last render, as the shipped walk
 * reads its own address at the press. The pager's guard applies here too: a press inside a
 * field and a press with a modifier stay with whoever owns them.
 */
function useRailArrowKeys({
  rows,
  onGo,
}: {
  rows: RailRow[];
  onGo: (href: string) => void;
}): void {
  const at = useRef<RailRow[]>(rows);
  at.current = rows;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (keyPressIsTaken(event)) return;
      const here = window.location.hash;
      const position = at.current.findIndex((row) => row.href === here);
      if (position < 0) return;
      const wanted = position + (event.key === "ArrowDown" ? 1 : -1);
      if (wanted < 0 || wanted >= at.current.length) return;
      event.preventDefault();
      onGo(at.current[wanted].href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onGo]);
}

export function AccountRail({
  groups,
  onGo,
}: {
  groups: RailGroup[];
  /** The rail never writes an address itself. The surface above owns the route. */
  onGo: (href: string) => void;
}) {
  const rows = groups.flatMap((group) => group.rows);
  useRailArrowKeys({ rows, onGo });

  const here = window.location.hash;

  return (
    <nav
      aria-label="This work item, grouped in three parts"
      className="flex min-h-0 w-[15.5rem] shrink-0 flex-col gap-2 self-stretch overflow-y-auto border-r border-line bg-surface p-2"
    >
      <span className="px-2.5 pt-1.5 pb-0.5 font-mono text-[12px] font-bold tracking-[0.1em] text-ink-faint uppercase">
        One work item, two accounts
      </span>

      {groups.map((group) => {
        const GroupIcon = GROUP_ICON[group.key];
        const AccountGlyph = ACCOUNT_GLYPH[group.account];
        const mark = ACCOUNT_MARK[group.account];
        return (
          <div key={group.key} className="flex min-w-0 flex-col gap-0.5">
            <div
              className={cn(
                "flex min-h-8 min-w-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5",
                ACCOUNT_FILL[group.account],
              )}
            >
              <GroupIcon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="font-mono text-[12px] font-bold tracking-[0.1em] uppercase">
                {group.label}
              </span>
              <span className="ml-auto flex min-w-0 items-center gap-1">
                <AccountGlyph className="size-3 shrink-0" aria-hidden="true" />
                <span className="font-mono text-[11px] font-bold tracking-[0.06em] uppercase">
                  {mark.word}
                </span>
              </span>
            </div>

            {group.rows.length === 0 ? (
              <p className="m-0 px-2.5 py-1.5 font-mono text-[12px] leading-[1.45] text-ink-faint">
                No pull request this work&apos;s own epics carry, so the change has no
                account to read.
              </p>
            ) : (
              <ul className="m-0 flex min-w-0 list-none flex-col gap-0.5 p-0">
                {group.rows.map((row) => (
                  <li key={row.key} className="min-w-0 list-none">
                    <RailRowButton row={row} here={here} onGo={onGo} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function RailRowButton({
  row,
  here,
  onGo,
}: {
  row: RailRow;
  /** The reader's own address. The row that opens it is the current row. */
  here: string;
  onGo: (href: string) => void;
}) {
  const Icon = ROW_ICON[row.key] ?? Target;
  /*
   * The row the reader arrived on, matched by address. A section-name match would light
   * two rows at once, because both accounts carry the same three section names.
   */
  const current = row.href === here;
  const mark = ACCOUNT_MARK[row.account];
  const name = `${row.label} · the ${mark.word.toLowerCase()} account`;

  return (
    <a
      href={row.href}
      aria-current={current ? "page" : undefined}
      aria-label={`${name} · ${row.count}${row.note ? ` · ${row.note}` : ""}`}
      title={`${name} — ${row.count}${row.note ? ` — ${row.note}` : ""}`}
      onClick={(event) => {
        /* A plain press moves the route; a modified press keeps the browser's own act. */
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onGo(row.href);
      }}
      className={cn(
        ROW_FRAME,
        current
          ? "border-l-2 border-l-primary bg-accent-wash font-bold text-accent-deep"
          : "text-ink-mid hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{row.label}</span>
      {/*
        THE ROW CARRIES NO ACCOUNT CHIP. The group header directly above states the account
        for every row under it, and a chip on the row cost the width the label needs: at
        fifteen and a half rem, "Problem & Solution" truncated to "Problem & So…". The
        account is still spoken on the row, because `name` above puts it in the label and
        the title, so a reader who never sees the group header still hears it.
      */}
      <span
        aria-hidden="true"
        className={cn(
          "shrink-0 font-mono text-[11px] tabular-nums",
          current ? "text-accent-deep" : "text-ink-faint",
        )}
      >
        {row.count.replace(/ .*$/, "")}
      </span>
    </a>
  );
}
