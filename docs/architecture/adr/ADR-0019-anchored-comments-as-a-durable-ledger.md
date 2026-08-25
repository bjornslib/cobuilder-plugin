---
# --- doc-gardener required frontmatter ---
title: "ADR-0019 — Anchored comments, kept as a durable ledger"
status: active
type: architecture
last_verified: 2026-08-21
owner: bjornslib
# --- 42010 decision-record index (schema: references/decision-records.md §2) ---
id: ADR-0019
source_pr: 11
name: "Anchored comments, kept as a durable ledger"
state: approved
groups: [viewer, feedback]
approved_by: "bjornslib"
problem: "The viewer is the largest reading surface in the system and carries no way to answer. A person reads a whole pull request and has nowhere to put a reaction the agent will ever see."
decision: "Compute the anchor from the live DOM at annotation time, and append every comment to a durable append-only ledger with a stable id and an open, answered, or resolved state."
alternatives:
  - option: "Write a data-fb attribute into every commentable element at build time"
    rejected_because: "It forces the generator to decide in advance what is commentable, it pollutes the markup, and it cannot express a selection that crosses part of an element."
  - option: "Adopt the lavish CLI"
    rejected_because: "It needs Node 22, npx on every call, a background Express server, and a blocking foreground poll. Against an install surface of /plugin install and nothing else, that is disqualifying."
  - option: "Keep the clipboard hand-off that the viewer already ships"
    rejected_because: "It works and it needs a manual paste every time. It is kept as the fallback, not as the mechanism."
  - option: "Publish the bundle and use the Artifact platform's own comment threads"
    rejected_because: "It is a real answer and it needs no new code, but it makes commenting a deliberate act rather than an available one. Kept as the second transport, not the only one."
  - option: "Delete a comment from the store once it is delivered, as the lavish CLI does"
    rejected_because: "It destroys the only record of what a person said. A read must never delete."
forces:
  - "The viewer already ships a comments drawer with localStorage persistence and a markdown export. It must be upgraded, not replaced."
  - "A comment is the first record that is neither authored in docs/ nor derivable from it. No rebuild can reconstruct one."
  - "view mode serves static files with python3 -m http.server. A write endpoint makes it a small application."
  - "A reaction without its quote forces the agent to reconstruct what it referred to, which is the problem this plugin exists to remove."
  - "The install surface forbids a hook and an MCP server, so a background command is the only wake path available."
related_decisions:
  - { type: depends-on, target: ADR-0018 }
  - { type: is-related-to, target: ADR-0010 }
  - { type: is-related-to, target: ADR-0006 }
related_concerns: [C3, C6]
history:
  - { state: tentative, date: 2026-08-21 }
  - { state: decided, date: 2026-08-21 }
  - { state: approved, date: 2026-08-21 }
maps_to:
  context: cobuilder-packaging
  modules: [viewer/index.html, scripts/migrate_bundle.py]
  rule: "A comment is appended to feedback/threads.ndjson with a stable id and a state, and a read of that ledger never deletes from it."
delivers:
  capability: "A reader points at one paragraph of a generated page and asks a question the agent will find."
  benefit: "The largest reading surface in the system stops being one-directional, and the reaction survives the session that produced it."
  beneficiary: [operator, developer]
related:
  - "docs/plans/cobuilder-family/02b-view-designs.md"
  - "docs/plans/cobuilder-family/02c-record-model.md"
---

# ADR-0019 — Anchored comments, kept as a durable ledger

## Context

Eleven artifacts converge on the viewer, more than on any other surface
except a git diff. A reader can answer a git diff. A reader cannot answer
the viewer.

The viewer is not empty on this point. `viewer/index.html` line 705 already
ships a comments drawer. It takes a comment tagged to a whole level, keeps a
list, persists to `localStorage` under `odyssey-f:<repo>:<pr>`, and offers
**Copy review as markdown**. That is a working clipboard transport, and it
is the thing to upgrade rather than to replace.

Two problems remain. The anchor is a whole level, which is too coarse to
point at a claim. And the clipboard needs a person to paste, so the agent
learns nothing unless somebody carries it across.

The lavish CLI solves the anchoring problem well and the persistence problem
badly. Read from `dist/cli.mjs`, its `selector(el)` walks up to five
ancestors at annotation time, short-circuits on a real `id`, and falls back
to `:nth-of-type`. A text selection captures a real DOM range, with a node
path and a character offset at each end. Its `takeFeedback()` at line 7522
then returns the queued prompts and clears them in the same transaction.
Verified on one machine: all 18 sessions in `~/.lavish-axi/state.json` hold
`prompts: []`. The only lifecycle it ships anywhere belongs to
auto-detected layout warnings, not to anything a person wrote.

## Options considered

1. **A `data-fb` attribute written into the page at build time.** Rejected.
   It forces the generator to decide in advance what is commentable, it
   pollutes the markup, and it cannot express a selection that crosses part
   of an element.

2. **Adopt the lavish CLI.** Rejected. Node 22, `npx` on every call, a
   background Express server on port 4387, a blocking foreground poll, and a
   dependency tree including Express, Excalidraw, Tailwind, and Mermaid. Its
   `share` path uploads to a third-party host. The install surface forbids
   all of it.

3. **Keep the clipboard hand-off.** Kept as the fallback, not as the
   mechanism. It needs a manual paste every time.

4. **Publish the bundle and use the Artifact platform's comment threads.** A
   real answer that needs no new code. Kept as the second transport. It
   makes commenting deliberate rather than available.

5. **Compute the anchor live, and append to a durable ledger.** Chosen.

## Decision

**Take the anchor from the lavish CLI. Keep the ledger it does not have.**

The anchor is computed from the live DOM when a reader selects something,
not written into the page when the page is built. Any element and any
mid-sentence selection becomes annotatable with no prior authoring.

One line is appended per thread to `<bundle-dir>/feedback/threads.ndjson`:

```json
{"id":"01JCXZ...", "state":"open",
 "entity":{"type":"pull_request","id":11,"level":2},
 "anchor":{"selector":"div.level-stack > p:nth-of-type(2)",
           "range":{"start":[0,58],"end":[0,101]},
           "quote":"each carries its own vendored copy of the code"},
 "body":"is this still true after the split?",
 "author":"human", "ts":"2026-08-21T14:02:00Z",
 "queue_key":"pr11/l2/p2"}
```

**The drawer opens on the click, and the text stays in view.** Today the
drawer is a mode a reader enters with the `c` key, and it covers what they
were reading. Reversed: a click on any element on the page opens the drawer
with that element already anchored, and the page shifts rather than hides
behind it. A reader must see the sentence they are commenting on while they
write the comment. Commenting becomes the available action rather than a
mode, which is the whole difference between a channel a person uses and one
they remember exists.

- `state` is `open`, `answered`, or `resolved`.
- `quote` is the fallback when a selector goes stale. It is also what makes
  the comment readable on its own.
- `queue_key` deduplicates a re-annotated spot before it is sent.
- **A read never deletes.** The ledger is append-only and each reader tracks
  its own offset. This is the single point where this record departs from
  the mechanism it borrows from.

**The agent answers in the thread, not in chat.** A reply is another line in
the same ledger, carrying `"author": "agent"` and `"replies_to": "<thread
id>"`, and the drawer renders it under the comment that prompted it. The
reader sees the answer beside the sentence they asked about, which is where
the question came from and where its answer belongs. A state change is a
third line naming only `id`, `state`, and `ts`.

**The ledger keeps the history and a projection keeps the current state.**
The append-only rule is about not destroying what a person said. It is not a
reason to make every reader recompute a state that a file can hold.
`feedback/threads-state.json` maps each thread id to its current state, who
moved it, when, and the reply count. It is rebuilt in full from the ledger
after each append, and deleting it costs nothing. The ledger is the truth and
the field is the cache, so a writer appends first and projects second, and a
disagreement between the two is a bug in the projection. This is the same
derived-projection discipline `index.json` follows.

This turns a one-way channel into a conversation. Today an answer arrives in
a chat session that the reader may not be looking at, and it loses the anchor
the question carried. **Threaded replies in the viewer are a required part of
the reply channel, and E6 delivers the record shape and the ledger they need.
Rendering a thread as a conversation is deliberately deferred past E6**, so
the first version ships the durable record rather than the interface. The
record shape is designed for it now, because retrofitting `replies_to` onto a
ledger with real content in it is the change this deferral must not cost.

**Machine findings stay in a separate channel.** An automatically detected
problem must not compete with human intent in one inbox.

**Two transports, one record.** A published page carries the Artifact
platform's own threads and needs no new code. The local viewer needs
`view` mode to accept a `POST /feedback` and append. That turns a static
file server into a small application, which is the real cost of the local
half.

**The write endpoint lands with the anchor, in the same epic.** It was open
whether to ship the anchor first and let a published page carry the threads
until the endpoint arrived. It does not, for two reasons. A published page
is a deliberate act and the local viewer is where the reading happens, so
the deferred half is the half that matters. And a comment written into
`localStorage` before the ledger exists is a record with no id and no
migration guard, which is the loss this record was written to prevent. The
`POST /feedback` endpoint is therefore part of E6 and not a follow-on.

**The agent finds new threads through a background command.** The install
surface forbids a hook and an MCP server, so a background command that
blocks until the ledger grows is the only wake path available. It must also
exit on a timeout, so a session never waits forever on a reader who left.

**A comment is the first record that is neither authored source nor
derivable from it.** No rebuild can reconstruct one. It joins the paid art
and the authored narrative as content a rebuild would destroy, so it comes
under `migrate_bundle.py`'s guard from the first commit rather than once one
is worth losing.

## Consequences

- **Positive:** The largest reading surface in the system stops being
  one-directional.
- **Positive:** A reaction carries its quote, so the agent never has to
  reconstruct what it referred to.
- **Constraint introduced:** A comment is appended to
  `feedback/threads.ndjson` with a stable id and a state, and a read of that
  ledger never deletes from it.
- **Negative / accepted:** `view` mode stops being a bare file server.
- **Negative / accepted:** A computed selector can go stale when a page is
  regenerated. `quote` is the recovery path, and it is a human-readable one
  rather than an automatic one.

## Value delivered

- **New capability:** A reader points at one paragraph of a generated page
  and asks a question the agent will find.
- **Benefit:** The reaction survives the session that produced it, which is
  what the mechanism this borrows from gets wrong.
- **Beneficiary:** operator, developer.

## Maps to

Context `cobuilder-packaging`, modules `viewer/index.html`,
`scripts/migrate_bundle.py`.

## Unverified before implementation

The selector walk and the range capture were read from `dist/cli.mjs` around
lines 5037 and 5354, and the drain behaviour at line 7522. None of it was
run. The Artifact platform's comment threads are documented and this session
has not carried one end to end.
