# Product: Review link

## Problem

A workflow asks the user to approve a document at each gate. The user gets a
short list of bullets and a file path in chat. The viewer can show the same
document with its title, its gate, and its place in the work. But the
workflow opens the viewer only after the user answers, and then it shows the
front page, not the document.

So the user reviews the document in the least helpful place. The viewer is
closed at the one moment it can help.

## Success metric

- At every gate, the user gets one link that opens the document under review.
  The link arrives before the approval question.
- Every link opens a page that works. No link leads to an error page.
- A gate that the user approves on or after 2026-09-28 records its link. A
  check fails when the link is missing.

## Announcement — the blog post before the feature

You approve a plan at each step of a build. Until now you read a summary in
chat and hunted for the file. Now each request for approval comes with a
link. Click it, and the viewer opens on the document itself, under the Build
level of your work.

You read the product plan, the architecture, and the
program design on one page. The link works when you get it, because the
workflow tests it first. The interaction design stays a file for now.

## Screens

- Plan page: one page under the Build level of a piece of work, at
  `#/<work>/build/plan`. It shows the product, architecture, and program
  design documents, each with its gate name. A missing document shows an
  empty state in its place.
