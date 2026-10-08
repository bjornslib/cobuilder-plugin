# Product: Level page restructure

## Problem

A level page in the viewer spends its first screen on facts a reader does not
need and gives no high-level view. Above the content sit two full-width bars:
one with the branch, the epic count, and "supersedes nothing", and one that
names the account with a button to the other account. The narrative summary of
a level exists in the record (every PR level and every design level has a short
`narration`), but the work page never shows it, and the PR page shows it as an
unlabelled paragraph. The rail repeats the same three level names in two
groups. Diagnostic lines about missing record fields sit inside the Problem and
Solution boxes, where only an author can act on them.

## Outcome

A reader opens a level and sees, in this order: the work item and its branch in
the top bar, a short "In Short" summary of the level with a Listen control when
audio exists, the level's sections, and the section's own content. One link in
the section heading, "Read in PR 12 ›" or "Read in the work item ›", moves to
the same level in the other account and lands on the section of the same name.
The rail lists each level once. Missing record fields are reported when the
index is built, and the viewer states none of them.

## Success metric

On the real `think-with-ai` bundle, the first screen of a level shows the
summary without scrolling, and a reader reaches the matching section of the
other account in one press. Measured by reading the page in Chrome at
`#/visualisation-decision-memory/intent` and at the PR 12 address.

## Announcement — the blog post before the feature

Every level of a CoBuilder work item now opens with an "In Short" strip: two or
three sentences that say what the level is about, with a button to hear them.
The branch moved into the top bar, and the bars that used to push the content
down are gone. To compare the design with the pull request that built it,
follow the "Read in PR 12" link in the heading. It opens the same section on
the other side. The build now reports records with missing parts, so authors
hear about them where they can fix them.

## Screens

| Screen | Purpose |
|---|---|
| Level page (work item or pull request) | The one screen this plan changes. Chrome: top bar, In Short strip, section tabs, section panel with the account link, single rail. |

The approved prototype is the design: https://claude.ai/artifact/8vkqCoEjZfB5YpfiVcqbd6
