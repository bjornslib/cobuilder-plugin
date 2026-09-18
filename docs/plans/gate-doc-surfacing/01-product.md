# Product: Gate doc surfacing

## Problem
A reviewer opens the bundle viewer to check on a build's progress and finds
the Gate Rail's approval checkmarks, but not the document behind each gate.
Gate 3's program design and Gate 4b's epic designs stay invisible, so the
reviewer has to leave the viewer and read raw files, or wait for someone to
publish a one-off copy elsewhere.

## Success metric
A reviewer clicks a Gate Rail card or an epic's design chip in the Builds
view and reads that gate's document without leaving the viewer. Measured by:
this feature's own dogfood run against the `gate-doc-surfacing` design's own
build shows Gate 3 and Gate 4b content in the running viewer.

## Announcement — the blog post before the feature
The Builds view now shows what a gate actually decided, not just that it was
approved. Click any Gate Rail card to read that gate's document inline. An
epic with an approved technical design carries a small chip that opens the
same reading view, scoped to that epic. Nothing to configure — the next
bundle rebuild picks up any gate doc already on disk.

## Screens
- `mockups/gate-sheet.html` — the read-only sheet showing a gate document's
  content, modeled on the existing ADR sheet.
