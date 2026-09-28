/**
 * The account rule above every section, and the one control that crosses to the other
 * account.
 *
 * THE TWO ACCOUNTS MUST BE DISTINGUISHABLE AT A GLANCE. ADR-0029 says a later slice owns
 * the mark that separates what the program intended from what the change did, and this
 * prototype proposes one. THE MARK HERE IS A PROPOSAL AND NOT A DECISION.
 *
 * THE MARK IS A WORD AND A GLYPH, AND NOTHING ELSE. It had three parts and the third was
 * a fill: the shell's own selected-row wash for the program's account and its heading
 * band for the change's. The engineer dropped the fill — "The title and icon are
 * sufficient" — so the mark stands on the two parts that are not colour:
 *
 *   a word, the account's own, in the bar's left field;
 *   a glyph, one per account, beside the word.
 *
 * NOTHING HERE WEARS A FILL ANY MORE, and the word's own ink is the page's own. The
 * change's rule used the heading band's white, which is only readable on the band itself,
 * so the plain ink is what makes the rule legible once the fill goes.
 *
 * The bar also names whose record the reader is in, in the account's own terms: the
 * design's id for the program, and the pull request's number for the change. A reader who
 * opens a deep link lands inside an account, so the bar is the first thing the page says.
 *
 * THE JUMP IS ONE CONTROL ON EACH OF THE THREE SHARED SECTIONS, AND IT IS AN ANCHOR. A
 * press moves the reader to the same section name on the other account. It is a real link
 * with a real address, so it can be copied, sent, opened in a new tab, and read by a
 * screen reader as a link rather than as a button. The engineer asked for exactly this: a
 * direct link between the two views, on the same level, so a reader catches what differs
 * or confirms what the agent stated.
 *
 * The control names the destination rather than the act. "Read the change's Architecture"
 * tells a reader where the press lands, and "Jump" does not.
 */

import { ArrowLeftRight, GitPullRequest, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { ACCOUNT_MARK } from "./accountModel";
import type { AccountId } from "./accountModel";

/**
 * The glyph the mark draws for each account. It is the mark's second part, and the one
 * copy of it lives here: the rule, the rail's group heading, and the top band's mark all
 * read this map, so the three cannot show two different glyphs for one account.
 */
export const ACCOUNT_GLYPH: Record<AccountId, LucideIcon> = {
  program: User,
  change: GitPullRequest,
};

export interface JumpTargetLink {
  href: string;
  /** The account the press lands in. */
  account: AccountId;
  /** The section name on that account, as the reader will see it there. */
  section: string;
}

/**
 * The account rule, and the jump when the section is one both accounts carry.
 *
 * `whose` is the account's own name for itself, and the bar never invents one: the
 * surface above passes the design's id for the program and the pull request's number for
 * the change.
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

      <span className="min-w-0 font-mono text-[12.5px] break-words text-ink">
        {whose}
      </span>

      {/*
        THE LINE THAT STOOD HERE IS GONE, AND THE FIELD THAT HELD IT STAYS AS A SPACER.
        The line told the reader, for each account, whose record they are in. The engineer
        removed both lines. The field keeps its width, so the bar's shape and the jump's
        place at its right end do not move now that the words are gone.
      */}
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
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onGo(jump.href);
          }}
          className={cn(
            "inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line bg-card px-3 font-mono text-[12.5px] font-bold text-ink",
            "transition-colors hover:bg-surface-2",
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
