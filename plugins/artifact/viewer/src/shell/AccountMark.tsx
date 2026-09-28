/**
 * The account rule above every section, and the one control that crosses to the other
 * account.
 *
 * TWO ACCOUNTS, ONE MARK EACH. A work item and the pull request its own epics carry are
 * two accounts of one surface, per ADR-0029. The work's own records are the program's
 * account, and the pull request is the change's. The two accounts repeat three section
 * names, so a reader who cannot tell the accounts apart cannot tell the sections apart
 * either. The rule is what tells them apart: it stands above the section the reader is on
 * and names that section's own account.
 *
 * THE MARK IS A WORD AND A GLYPH, AND NOTHING ELSE. It had three parts and the third was
 * a fill: the shell's own selected-row wash for the program's account and its heading band
 * for the change's. The engineer dropped the fill, because a filled heading reads as
 * something selected. So the two parts that remain are the account's word and the account's
 * glyph, and neither one is a colour. `ACCOUNT_MARK` holds the word and the glyph map
 * holds the glyph, so the rule and every other reader of the mark cannot show two different
 * marks for one account.
 *
 *   Program stands by a person, and Change stands by a pull request.
 *
 * THE JUMP IS ONE ANCHOR ON EVERY SECTION BOTH ACCOUNTS CARRY, AND IT APPEARS NOWHERE ELSE.
 * A press moves the reader to the same section name on the other account. It is a real link
 * with a real address rather than a script, so it copies and reads as a link: a reader can
 * send it, open it in a new tab, and hear it announced as a link.
 *
 * THE CONTROL NAMES THE DESTINATION RATHER THAN THE ACT. `Read the change's Architecture`
 * tells the reader where the press lands, and `Jump` does not.
 *
 * ABSENCE IS A STATE, AND NOT A GAP. A section one account carries alone has no counterpart,
 * so `jump` is null there and the rule states that fact on the bar instead of drawing a
 * control that leads nowhere. The change's File Diffs row, and the program's Epics and
 * Rubrics rows, are the three that carry no shared section name.
 *
 * THIS FILE HOLDS NO DATA OF ITS OWN. It reads the account's two parts from the maps below
 * and renders what the shell hands it. The shell resolves the account, whose record it is,
 * the section's own name, and the address across, because those come from the rail and the
 * route rather than from the mark.
 */

import { ArrowLeftRight, GitPullRequest, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import type { AccountId } from "./model";

/** The mark's first part, as the account names itself. */
export interface AccountMark {
  word: string;
}

/**
 * The word a reader sees on every section of this account.
 *
 * ADR-0029 fixes both words. `Program` stands by a person, and `Change` stands by a pull
 * request. One copy of the two words lives here, so the rule and every other reader of the
 * mark cannot show two different words for one account.
 */
export const ACCOUNT_MARK: Record<AccountId, AccountMark> = {
  program: { word: "Program" },
  change: { word: "Change" },
};

/**
 * The glyph the mark draws for each account. It is the mark's second part.
 *
 * ADR-0029 fixes what each glyph stands for: a person for the program and a pull request
 * for the change. One copy of the map exists, so every reader of the mark draws the same
 * glyph for one account.
 */
export const ACCOUNT_GLYPH: Record<AccountId, LucideIcon> = {
  program: User,
  change: GitPullRequest,
};

/** The other account's address for one shared section name, and where it lands. */
export interface JumpTargetLink {
  /** The other account's own builder, so the jump invents no address scheme. */
  href: string;
  /** The account the press lands in. */
  account: AccountId;
  /** The section name on that account, as the reader will see it there. */
  section: string;
}

/**
 * The account rule, and the jump when the section is one both accounts carry.
 *
 * `whose` is the account's own name for the record the reader is in: the design's id for
 * the program, and the pull request's number for the change. The rule never invents one,
 * because the shell resolves it from the rail's row and the route.
 *
 * `onGo` is the shell's own move. The anchor carries a real address, so a press with a
 * modifier key is left to the browser and the reader may open the other account in a new
 * tab. A plain press runs the shell's move instead, so the page is not reloaded.
 */
export function AccountRule({
  account,
  whose,
  section,
  jump,
  onGo,
}: {
  account: AccountId;
  /** Whose record this is, in the account's own words. */
  whose: string;
  /** The section's name, as the rail lists it. */
  section: string;
  /** The other account's address for this same section name, or null when it has none. */
  jump: JumpTargetLink | null;
  /** The shell's own move. A press runs it rather than reloading the page. */
  onGo: (href: string) => void;
}) {
  const mark = ACCOUNT_MARK[account];
  const Glyph = ACCOUNT_GLYPH[account];

  return (
    <div className="mb-5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line px-4 py-2.5">
      <span className="flex min-w-0 items-center gap-2 text-ink">
        <Glyph className="size-4 shrink-0" aria-hidden="true" />
        <span className="font-mono text-[12.5px] font-bold tracking-[0.08em] uppercase">
          {mark.word} account
        </span>
      </span>

      <span className="min-w-0 font-mono text-[12.5px] break-words text-ink">{whose}</span>

      {/* The field keeps the bar's shape, so the control's place at its right end holds. */}
      <span className="min-w-0 flex-1" />

      {jump === null ? (
        <span className="font-mono text-[12px] text-ink-dim">
          {section} exists on this account alone
        </span>
      ) : (
        <a
          href={jump.href}
          title={`${jump.href} — the same section on the other account`}
          onClick={(event) => {
            /* A press with a modifier belongs to the browser, so a new tab still opens. */
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onGo(jump.href);
          }}
          className={cn(
            "inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line px-3 font-mono text-[12.5px] font-bold text-ink",
            "transition-colors duration-150 ease-house hover:bg-surface-2",
            "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
          )}
        >
          <ArrowLeftRight className="size-3.5 shrink-0" aria-hidden="true" />
          {`Read the ${ACCOUNT_MARK[jump.account].word.toLowerCase()}'s ${jump.section}`}
        </a>
      )}
    </div>
  );
}
