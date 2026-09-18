# One program, one FlightDeck: merging react-viewer and review-flight-deck

## What this changes

Two designs independently claimed the same surface name. `react-viewer`
rebuilds the bundle viewer as TypeScript and React, with three surfaces
replacing five record-type tabs. It named its single-pull-request view
Flight deck. `review-flight-deck` computes a merge order for a team's whole
open pull-request set, and it named its surface the same thing.

This design merges both into one program, `cobuilder-viewer`, and supersedes
both source designs outright.

| Surface | The question it answers |
|---|---|
| Work | Is this decided, and where has it got to? |
| FlightDeck | What does this pull request change, and was it intended — for one change, or for the whole open set? |
| Reference | What decisions and map coverage exist outside any one design? |

FlightDeck replaces the old Pull requests tab and carries two modes.
Single-pull-request mode ships first, at parity with today's viewer.
Multi-pull-request mode ships later, in the same design. A reviewer selects
open pull requests and receives one validated merge-order recommendation.
The alternatives stay visible and unreachable until the reviewer opens the
recommendation.

## Why merge instead of sequencing them

Shipping `react-viewer` first and layering the ordering UI on afterward
would have meant building the pull-request surface twice. The first build
would go against the viewer that `react-viewer`'s own E5 is about to
replace, and the second when E5 lands.

The two designs also left three questions unresolved between them, because
neither had read the other. Where can a merge-order simulation run, given
that a browser cannot invoke `git`? How does the comment ledger carry a
proposal, an acceptance, and a real outcome without breaking `ADR-0019`'s
fixed vocabulary? Who owns the open pull request as a record-index entity?

## What a divergent-exploration pass added

Six isolated design frames, then a separate critic pass, surfaced two
corrections and one new, concrete answer this design needed.

A frame proposed a scheduled GitHub Action to precompute the merge plan.
The challenge gate corrected it: `review-flight-deck`'s own record already
settled automatic triggering as a scheduled skill run or a workflow, the
same mechanism every other Odyssey mode uses. No new CI infrastructure is
needed.

A frame proposed a persistent, cross-repo compute service. The critic
flagged it as a trap. It reads as sound scaling architecture, and it
silently breaks the install-surface rule that holds this family together:
no agents, no hooks, no MCP servers. Rejected outright.

A starred, easy-to-overlook survivor answered who owns the open pull
request: `OpenPullRequest` is a branded extension of `PullRequest`, defined
once, in the epic that ships single-pull-request mode. A field renamed on
one and not the other fails the build instead of drifting silently.

## The cost, stated plainly

Everything `react-viewer` already accepted carries forward. A contributor
now needs Node and npm to change the viewer. This repository has never paid
that cost, and no epic in either source design removed it. This design adds
a second remote-writing surface on top: a runner that executes an accepted
merge path onto integration branches. Two pieces of schema and type work
are new here and untested. They are the ledger's proposal, acceptance, and
post-merge-actual lines, and `OpenPullRequest`'s branded-type declaration.

## How it lands

| Epic | Outcome |
|---|---|
| E1 | `export_artifact.py` matches named markers, not incidental literals |
| E2 | `npm run build` produces the committed file, and a test fails on any difference |
| E3 | One typed data layer, with `OpenPullRequest` declared as a branded extension |
| E4 | A detailed static prototype of the Work board, against real data, reviewed before E5 |
| E5 | The Work board and the design lenses, built to E4's approved prototype |
| E6 | A detailed static prototype of FlightDeck, both modes composed behind one switch, reviewed before E7 |
| E7 | FlightDeck, single-pull-request mode, at parity with today's viewer |
| E8 | A detailed static prototype of the Reference surface, against real data, reviewed before E9 |
| E9 | The Reference surface, built to E8's approved prototype, and the five tabs are removed |
| E10 | `/pr:generate` fills in a description before FlightDeck reads a bare pull request |
| E11 | FlightDeck lists the open set, marks what auto-merge already handled |
| E12 | A skill run or workflow simulates and replays candidate merge orders, commits `data/merge-plan.json` |
| E13 | FlightDeck renders one recommendation, with the alternatives unreachable until opened |
| E14 | The ledger records a merge-order proposal, its acceptance, and the post-merge actual result |
| E15 | A runner merges an accepted path onto integration branches, never the default branch |
| E16 | A published Artifact renders every surface, under the 16 MiB budget |
| E17 | The three non-viewer fixes `build-workflow-polish` carried are not lost |
| E18 | The comment ledger works, served and published, with anchors that survive a React re-render |

E1 is first on purpose, unchanged from `react-viewer`. E3 must declare
`OpenPullRequest` before E11 consumes it, or the drift guarantee has nothing
to enforce.

Each surface gets a prototype epic immediately before its build epic, in
the order E4→E5, E6→E7, then E8→E9. That matches the discipline
`review-flight-deck` already used twice for FlightDeck's multi-pull-request
mode.

## What reviewers should look at

1. The Node toolchain decision, carried unchanged from `ADR-0023`.
2. The E1 ordering, and E3's `OpenPullRequest` declaration landing ahead of E11.
3. E6's composed FlightDeck prototype, the one place in the design where
   single-pull-request and multi-pull-request mode meet as one surface.
4. E12's classification of three non-authored conflict shapes: a shared
   generated file, a hot file, and identical content added on both sides.
5. E14's ledger schema, new work neither source design specified in detail.
6. `ADR-0019`'s comment anchors under React, still unsettled, owned by E18.

## Not in scope

No change to what the generation scripts write. No new record type or join
beyond `OpenPullRequest`. A team's own auto-merge rules, read but not
defined here. The runner's credentials, which sit in the adopting
repository. Who deletes integration branches after a path completes.
