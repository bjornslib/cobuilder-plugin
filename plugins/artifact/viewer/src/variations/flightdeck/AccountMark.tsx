/**
 * The account rule above every section, and the one control that crosses to the other
 * account.
 *
 * THE TWO ACCOUNTS MUST BE DISTINGUISHABLE AT A GLANCE. ADR-0029 says a later slice owns
 * the mark that separates what the program intended from what the change did, and this
 * prototype proposes one. THE MARK HERE IS A PROPOSAL AND NOT A DECISION. It carries
 * three things at once, so no reader has to see a colour to know which account they are
 * in:
 *
 *   a word, the account's own, in the bar's left field;
 *   a glyph, one per account, beside the word;
 *   a fill, and it is the shell's own. The program's account wears the selected-row wash
 *     the shell already uses. The change's wears the shell's heading band, which nothing
 *     else on a page can wear, so the change's account is the loud one and the program's
 *     is the quiet one. That order is deliberate: the program's account is the frame a
 *     reader arrives with, and the change's is the thing being read against it.
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

import { ArrowLeftRight, GitPullRequest, PackageCheck, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { ACCOUNT_MARK } from "./accountModel";
import type { AccountId } from "./accountModel";

/**
 * How one account's rule is drawn. The same three parts the rail uses, at page size: the
 * word, the glyph, and the fill. The fills are the shell's own, and the delivery record
 * stays neutral because it is neither of the two accounts being compared.
 */
const RULE_FILL: Record<AccountId, string> = {
  program: "border-primary/50 bg-accent-wash",
  change: "border-transparent bg-band",
  delivery: "border-line bg-surface-2",
};

const RULE_WORD: Record<AccountId, string> = {
  program: "text-accent-deep",
  change: "text-band-ink",
  delivery: "text-ink-mid",
};

const RULE_GLYPH: Record<AccountId, LucideIcon> = {
  program: User,
  change: GitPullRequest,
  delivery: PackageCheck,
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
  const Glyph = RULE_GLYPH[account];

  return (
    <div
      className={cn(
        "mb-5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-2.5",
        RULE_FILL[account],
      )}
    >
      <span className={cn("flex min-w-0 items-center gap-2", RULE_WORD[account])}>
        <Glyph className="size-4 shrink-0" aria-hidden="true" />
        <span className="font-mono text-[12.5px] font-bold tracking-[0.08em] uppercase">
          {mark.word} account
        </span>
      </span>

      <span
        className={cn(
          "min-w-0 font-mono text-[12.5px] break-words",
          RULE_WORD[account],
        )}
      >
        {whose}
      </span>

      <span className={cn("min-w-0 flex-1 font-serif text-[14.5px] leading-[1.5]", RULE_WORD[account])}>
        {mark.lead}
      </span>

      {jump === null ? (
        <span className={cn("font-mono text-[12px]", RULE_WORD[account])}>
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
