---
name: collaborate-with-user
description: Present a gate, decision, review result, or status readout as a self-contained HTML page instead of markdown in chat. Use when a person must read work and react to it -- approve, choose, correct -- not when a direct answer or a one-sentence action will do. Publishes to .lavish/ and, when a URL helps, as a Claude Artifact.
---

# collaborate-with-user

Some output asks a person to react to it. A gate awaiting approval. A design
or an ADR that needs a decision. A set of options to choose between. A
review or audit result. A status readout across many items. For that kind
of output, build an HTML page. Chat markdown and a file path are both worse
for this job: the person must scroll a wall of text, and a link with no
page just points at more markdown.

This skill does not trigger for a direct answer to a direct question, a
small factual correction, a command's ordinary output, or anything the
person can act on in one sentence. Those stay in chat.

## The rule that makes this safe

The markdown or JSON file on disk stays the source of record. The HTML page
is a presentation of that file, never a replacement for it. Write or update
the real file first. Build the page from it second. Both must exist after
this skill runs. A page nobody can grep, diff, or feed to another tool is
worse than a file nobody enjoys reading, so never let the HTML page become
the only copy of a decision.

## Where pages go

Write the page to `.lavish/<slug>.html` in this repo. Pick a slug that names
the decision, not the date or the run: `gate1-cobuilder-family.html`, not
`gate1-2026-08-20.html`.

Publish it with the Artifact tool when a URL helps the person react from
outside this session, for example over Slack or email. Republishing the
same file path keeps the same URL. A page that tracks one evolving
decision must reuse its path across updates, so the person's saved link
keeps working. A page for a new, separate decision takes a new path. Do not
reuse a slug across two unrelated decisions to save a step.

## Composition rules

Follow these even without a worked example in front of you.

**Self-contained.** One file. No external request except Google Fonts. A
published Artifact page blocks every other external host, so inline any
other font, icon, or script instead of linking it.

**Both themes.** Define the full light palette as CSS custom properties on
bare `:root`. Redefine the same properties under `@media
(prefers-color-scheme: dark)`, guarded as `:root:not([data-theme="light"])`.
Redefine them again under `:root[data-theme="dark"]` so an explicit theme
toggle wins in both directions. Never define a color only inside a media
block or a `[data-theme]` block — give it a `:root` definition first. Set
`body`'s background from a token, not from the browser default, because the
page must not borrow the wrong ground color from its host.

**A visual identity per purpose.** Do not reuse one template for every
page. A gate awaiting a decision and a running reference document are two
different kinds of document, built for two different moments, and they
must not look identical. Choose a typography pairing, a palette, and a
layout that fit what this specific page asks the reader to do.

**The decision goes last, and it is the most prominent thing on the page.**
State it as the exact question the person must answer, not as a summary of
the work. Place it at the bottom, after the evidence that lets the person
answer it. A reader who scrolls to the end must land on the question, not
on a footer.

**Wide content scrolls in its own container.** A table, a code block, or a
diagram that is wider than the page gets `overflow-x: auto` on its own
wrapper. The page body itself must never scroll sideways.

**Real content only.** Every figure, quote, and file path on the page comes
from the actual work. Do not write placeholder text, a lorem-ipsum block,
or a "TBD" section, and do not ship the page until every section holds real
content.

**Diagrams, if needed.** Hand-author inline SVG for a diagram. This skill
has no diagramming section beyond that. Do not add a charting library or an
external renderer.

## The honesty rule

Carry forward every open question, every deviation from a specified
procedure, every unverified claim, and every stale or untrusted source the
work turned up. A page that shows only the conclusions is a worse artifact
than the markdown it replaced, because it hides the doubt that the person
most needs to see before they approve, choose, or correct something. Give
these items their own visible section. Do not fold them into a footnote or
drop them because they complicate the layout.

## Relationship to the architecture skill's Report Generation

`skills/architecture/SKILL.md`'s "Report Generation" section already
governs the paired Technical and Founder HTML reports that `/review` and
`/maintenance` produce into `docs/architecture/review/`. That convention
keeps its own templates, severity badges, score bars, and destination. This
skill does not change or govern it. The one rule both share: a
self-contained HTML page with no external dependency beyond fonts. Do not
route a Technical or Founder report through this skill, and do not route a
gate, a design decision, or a status readout through the architecture
templates.

---

Intended owner: this skill ships inside the `artifact` plugin
once the plugin split lands. Until then it lives here.
