---
title: "Collaborative Presentation Rules"
status: active
type: reference
---

# Collaborative presentation rules

Some outputs require human reaction. Examples include an approval gate, an
architecture decision record, a choice between technical options, or a status
readout. For those outputs, build a self-contained HTML page.

A direct answer, a small factual correction, or standard command output belongs
in chat. Do not build an HTML page for one-sentence actions.

---

## 1. Source of record rule

The markdown or JSON file on disk remains the permanent source of record. The
HTML page is a visual presentation of that file. It is never a replacement.

Always write or update the underlying file first. Build the HTML page from that
file second. Both files must exist after this procedure runs. Never allow an
HTML page to become the only record of a decision.

## 2. Theme tokens rule

Define the complete light palette as CSS variables on bare `:root`.

Redefine those variables under `@media (prefers-color-scheme: dark)` guarded as
`:root:not([data-theme="light"])`.

Redefine those variables again under `:root[data-theme="dark"]` for an explicit
toggle.

Never define a color variable solely inside a media query or `[data-theme]`
block. Assign `body` background from a theme token, not the browser default.

## 3. Self-contained rule

Every page must exist as one self-contained file. Do not make external network
requests except to Google Fonts.

Inline all scripts, stylesheets, and SVG icons. A published Claude Artifact
blocks external network calls.

## 4. Visual identity per purpose rule

Do not reuse a single template for all pages. An approval gate, a design choice,
and a status document serve different functions.

Select typography, color palettes, and container layouts that match the specific
reader task.

## 5. Decision placement rule

The decision belongs at the bottom of the page. It must be the most prominent
element.

State the decision as the exact question the reader must answer. Do not end the
page with a generic summary or footer.

## 6. Wide content scrolling rule

Wrap wide tables, long code blocks, and diagrams in dedicated containers with
`overflow-x: auto`.

The main page body must never scroll horizontally.

## 7. Real content rule

Every quote, code snippet, number, and file path must come from actual project
work.

Do not use placeholder text, lorem ipsum, or TBD labels. Complete all sections
before presenting the page.

## 8. The honesty rule

Include a dedicated visible section for open questions and unverified items.

Carry forward every deviation from procedure, every unverified claim, and every
stale data source. Never hide uncertainties in footnotes or remove them to
simplify layouts.

## 9. Relationship to architecture review reports

The architecture skill in `architect` governs the Technical and
Founder HTML reports in `docs/architecture/review/`. Those reports use distinct
scoring bars and severity badges.

This skill does not alter or replace architecture review reports. Do not route
architecture review reports through this skill. Do not route gates or design
decisions through architecture review templates.

---

## Output locations

Write presentation pages to `<bundle-dir>/pages/<slug>.html` (for example,
`.cobuilder-architect/self/pages/<slug>.html`) in the repository. Select a
slug that identifies the decision, such as `gate1-cobuilder-family.html`.

Publish the page as a Claude Artifact when external sharing helps the user.
Re-exporting an existing file path updates the existing artifact URL.
