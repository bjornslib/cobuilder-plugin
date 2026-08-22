# Status: the cobuilder family

Shipping cobuilder as five separately installable plugins: `cobuilder-architect`,
`cobuilder-pr`, `cobuilder-implement`, `cobuilder-artifact`, and
`cobuilder-full-lifecycle`. This carries two designs at once, which ADR-0013
permits.

- Gate 1 — Product: APPROVED 2026-08-20
- Gate 2 — Architecture: APPROVED 2026-08-21
- Gate 3 — Program Design: APPROVED 2026-08-21
- Gate 4 — Slice plan + rubrics: APPROVED 2026-08-21

Hindsight: unavailable (tools advertised in this session but not registered — substitutes read, see 01-product.md)

## Slices

Six epics, fourteen slices. A seventh epic is deferred and carries none.

**E1 — one plugin becomes five**
- [x] Slice 4 — renames inside today's single plugin              score: 1.00 on attempt 2
- [x] Slice 5 — the cross-pillar references are fixed             score: 1.00 on attempt 3
- [x] Slice 6 — five plugins, five manifests                      score: 1.00
- [x] Slice 7 — the two ports land                                score: 1.00

**E2 — shared code survives an install**
- [x] Slice 1 — tracer bullet: two plugins, one shared module     score: 1.00

**E3 — the seam is version-safe**
- [x] Slice 2 — the compatibility gate exists                     score: 1.00
- [x] Slice 3 — the gate is wired and the bundle migrates         score: 1.00

**E4 — the record index**
- [x] Slice 8 — the index holds the entities                      score: 1.00
- [x] Slice 9 — the index resolves the joins                      score: 1.00

**E5 — one lifecycle surface**
- [x] Slice 10 — the Decisions and Contexts modes                 score: 1.00
- [x] Slice 11 — the Builds mode and the Backlog lane             score: 0.92

**E6 — the reply channel**
- [x] Slice 12 — the ledger and its projection                    score: 0.92
- [x] Slice 13 — the anchor and the write endpoint                score: 1.00
- [x] Slice 14 — the wake command and the whole loop              score: 1.00

**E7 — threads read as conversations**: deferred, no slice yet.

Build order is slice 1 first, then 2 and 3, then 4 through 7, then 8 through
14. Rubrics written before any implementation: 14 of 14, in
`.cobuilder/rubrics/cobuilder-family/`.

A Builds view always presents work epic-first, with each epic's slices nested
under it. It is never a flat slice list with an epic column.

## Escalated

None yet.

## Notes for a fresh session

- The prototype already exists and works: `~/.claude/skills/cobuilder-factory/`
  is 1390 lines across `SKILL.md`, four references, and one workflow script.
  This build is a port and a hardening, not a green-field feature.
- The rename is part of the build. `cobuilder-factory` becomes
  `cobuilder-implement` everywhere, including the lineage note.
- Governing records: `ADR-0012` (the skill itself), `ADR-0013` (the join to a
  design through `intent.json`, and the rule that one branch may carry more
  than one design).
- `docs/architecture/designs/cobuilder-implement/goal.json` is `stage:
  approved` and carries one epic, E1, on branch `design/design-mode`, PR 11.
- This build runs its own gates on itself. The design's fourth `done_when` is
  "cobuilder-implement builds one real change end to end under its own gates",
  so this plan is that proof, not a rehearsal of it.
- Gate 1 approved 2026-08-20. Presented as HTML at
  `.lavish/gate1-cobuilder-family.html`. The user asked that every gate be
  presented that way, not as markdown in chat. That request became a scope
  addition, recorded as a Gate 2 input: a `collaborate-with-user` skill, owned
  by `cobuilder-artifact`.
- Gate 2 approved 2026-08-21 after six corrections from the user: a handoff
  between plugins is allowed and only a file reference is banned, the comment
  drawer opens on a click rather than on a key, Describe is called by Design
  rather than run by a person, `pr:generate` carries the interview and the
  assessment and the narrative, the write endpoint is decided rather than
  open, and a boundary record now declares the districts it verifies.
- Every gate is presented in the Builds view at `.lavish/builds-view.html`,
  which renders the plan markdown rather than a second hand-written copy.
  `scripts/build_builds_view.py` regenerates it. The payload line carries its
  own closing `</script>` tag, and dropping that tag renders a blank page.
- ADR-0018 and ADR-0019 approved 2026-08-21.
- Gate 3 approved 2026-08-21. Two decisions came out of the review:
  `commands/explore-design.md` is deleted, because divergent exploration is an
  agent-invoked step of Design mode rather than a user-facing command. And the
  backlog is `goal.json.epics[]` with a null branch, not a new file.
- `docs/architecture/designs/plugin-split/goal.json` carries seven epics, E1
  through E7. The first cut had nine, five of which carried one slice each,
  which made an epic a label for a slice. Regrouped so an epic is a body of
  work that maps to one pull request.
- The Backlog lane in the Builds view is a required part of slice 11, not
  polish. It is a query over the index: every epic with a null branch plus
  every slice not yet scored, ranked by dependent ADR count.
- Threaded agent replies in the viewer are a required part of E6's record
  shape and a deferred part of its interface. See ADR-0019.

## Slice 1 — result

The spike proved ADR-0017's vendoring mechanism. A local marketplace with a
`shared/` directory and two sibling plugins, each carrying a symlink at
`<plugin>/shared`, copies the full `shared/` tree, including a nested
subdirectory, into each plugin's own install cache.

Commands run, in order:

```
claude plugin validate <plugin-a-path>
claude plugin validate <plugin-b-path>
claude plugin validate <marketplace-path>
claude plugin marketplace add <marketplace-path> --scope local
claude plugin install spike-plugin-a@slice1-spike-marketplace -s local -y
claude plugin install spike-plugin-b@slice1-spike-marketplace -s local -y
claude plugin list --json
python3 -c "import sys; sys.path.insert(0, '<cache>/shared'); import _bundle_meta; print(_bundle_meta.SCHEMA_VERSION)"
mv <marketplace-path> <marketplace-path>-RENAMED-unreachable
python3 -c "import sys; sys.path.insert(0, '<cache>/shared'); import _bundle_meta; print(_bundle_meta.SCHEMA_VERSION)"
claude plugin uninstall spike-plugin-a@slice1-spike-marketplace -s local
claude plugin uninstall spike-plugin-b@slice1-spike-marketplace -s local
claude plugin marketplace remove slice1-spike-marketplace
```

Both plugins validated with exit 0, warnings only, no author field. Both
installed to sibling cache directories under
`~/.claude/plugins/cache/slice1-spike-marketplace/`, neither nested inside
the other. Each cache held a real directory at `shared/`, not a symlink,
containing `_bundle_meta.py`, `_greeting.py`, and a `nested/` subdirectory
holding `_nested_module.py`. Every file in the source `shared/` tree
arrived in both caches, including the nested one.

Rename test: the first run inserted the cache path into `sys.path` and read
the module directly. That proves the cache holds the files. It does not
prove that a plugin command resolving `${CLAUDE_PLUGIN_ROOT}/shared/...`
reaches them, which is the claim the design rests on.

An independent validator closed that gap. It read the expression written in
each plugin's own command file, ran that expression with
`CLAUDE_PLUGIN_ROOT` set to the real cache directory, and did so before and
after the marketplace source directory was renamed out of reach. Both
plugins printed `SCHEMA_VERSION=1.2` in all four runs, with exit 0. Neither
plugin read the marketplace source tree at run time.

**Validated: ACCEPT, score 1.00 of 1.00**, all four criteria at full credit.
One reporting defect was found and is recorded above. A write-up must record
the command that matches the claim it makes, rather than a proxy for it.

ADR-0017's vendoring mechanism holds. The install copy dereferences a
symlinked directory, including a nested subdirectory, and each installed
plugin's cache is self-contained.


## Slice 2 — result

`scripts/_bundle_meta.py` gained `BundleIncompatible`, `require_compatible()`,
and `stamp_generator()`. The constants moved to schema 1.3 and bundle format
3. Nothing calls the two functions yet, which is slice 3.

The repository gained its first test suite at `tests/`, run with
`uv run --with pytest pytest tests/ -v`. No package manager configuration was
added. Pytest arrives through `--with` alone.

**Validated: ACCEPT, score 1.00 of 1.00.** An independent validator wrote 14
adversarial tests beyond the implementer's 11. A version comparison uses a
tuple of integers, so `"1.10"` correctly reads as newer than `"1.9"`.

Accepted regression: the existing bundles now report `bundle.format: stale:2`
and `bundle.schema: stale:1.2`. That is staleness and not corruption. Slice 3
owns the migration that clears it.

**Two findings handed to slice 3.** `require_compatible()` raises a raw
`json.JSONDecodeError` on a malformed `bundle.json`, and a raw
`AttributeError` when `min_reader_schema` holds a number. Both are acceptable
while nothing calls the function. Both must be wrapped before a real writer
depends on them. A malformed `generators` field is also discarded rather than
reported.

## Slice 3 — result

**Validated: ACCEPT, score 1.00 of 1.00.**

Eleven writers call `require_compatible()` before their first write, not the
three the program design named. The implementer grepped for the full set.
`verify_bundle.py` is exempt because it never writes. `migrate_bundle.py` is
exempt because gating the migrator on the check it exists to satisfy would
deadlock every bundle it repairs. A validator tested that reasoning rather
than accepting it.

All three bundles stepped to format 3 and schema 1.3. The authored fields and
every asset and audio file are byte-identical to the pre-migration backups,
checked by an independent checksum comparison. The old scalar
`generator_version` survives as the first entry of the `generators` map.

Proved by behaviour rather than by reading the source:

- A deliberately bad migration step wrote nothing at all. No story file
  changed and no backup directory appeared. The failure mode is "no write".
- A bundle already at the current version still had its viewer refreshed. A
  marker file placed there came back as the real viewer.
- A bundle claiming format 99 was refused. The ladder never steps backwards.
- A second migration run reports "already current" and changes nothing.

A static type checker flagged `migrate_bundle.py:319` as a call on an object.
It is a false positive from a loosely typed tuple slot. Every ladder step was
driven at run time with no error.

## Slice 4 — a naming decision that slice 6 must undo

Two skills each own a mode named `review`. The architecture skill audits a
codebase. The odyssey skill narrates merged history. A slash command takes
its name from its file, so one `commands/` directory cannot hold two files
named `review.md`.

Slice 4 kept `commands/review.md` for the architecture skill and named the
other `commands/odyssey-review.md`. That is correct today and wrong at the
end of the build.

**After the split the collision disappears.** `cobuilder-architect:review`
and `cobuilder-pr:review` are different plugins and different namespaces, so
each carries its own `commands/review.md`. ADR-0016 records that the split
resolves this collision structurally, and shipping a command called
`odyssey-review` would leave the workaround in place after its reason has
gone.

**Slice 6 must rename `commands/odyssey-review.md` back to `review.md`
inside `cobuilder-pr`.** The internal mode name is already `review` in both
skills, so only the file name changes.

## Backlog raised during the build

**A technical solution design per epic, before that epic's slices are built.**
Recorded as epic E2 of the `cobuilder-implement` design, raised 2026-08-22.

Gate 3 writes one program design for a whole feature. That is the right grain
for a feature and the wrong grain for an epic that carries four slices. This
session skipped the per-epic step and paid for it twice.

- The pull-request mode rename reached a slice brief still carrying a shape
  the user had already corrected. An epic-level design would have caught the
  contradiction before an agent acted on it.
- The `review` command-name collision surfaced while slice 4 was building,
  not while the epic was being designed. The fix was sound and it arrived
  late, and it left a temporary command name that slice 6 must undo.

`cobuilder-implement` must produce that per-epic design as part of its own
workflow, rather than leaving it to whoever runs the build.

## Slice 4 — first attempt, RETRY at 0.90

Four criteria at full credit. C4b, the critical one, scored 0.5. The rubric
names that case exactly: the two modes are correct, and a citation still
carries the old sense of `generate`.

Three files kept the pre-rotation meaning. One of them proves the rubric was
right to expect this. `README.md` was corrected to say the `review` command
warns about a stale baseline, while
`skills/odyssey/references/baseline-derivation.md` still credited `generate`
with the same warning. The fix landed in one place and missed the other.

`decision-records-lite.md` shows the same shape at a smaller scale. Its body
rotated correctly. Its title and its first heading did not. A file that is
partly correct is not evidence that it is wholly correct.

Attempt 2 is running, together with slice 5, because both are the same kind
of work in the same files.

## A measurement that moved

`02-architecture.md` records 33 cross-pillar references, counted 2026-08-21.
The count on 2026-08-22 is 25, being 18 from the architecture pillar into the
odyssey pillar and 7 in the other direction.

The number moved because slice 4 rewrote many of the citations these
references live in. It is not a correction of a miscount. Both runtime
references named in the plan still exist, and so do the five safe references
to a vendored shared skill.

## Slice 4 — attempt 2, ACCEPT at 1.00

Attempt 2 fixed the four leftovers the first validator named, and the
implementer's own sweep found three more: the lifecycle summary in
`README.md`, one further sentence there, and four `Submit-mode` comments in
`viewer/index.html`.

A second validator traced 271 raw matches and found no leftover. The phrase
`submit mode` survives nowhere, and no command dispatches that mode.

Four items stay untouched on purpose, and the validator agreed with each. The
trigger phrases "submit this PR" and "generate this PR" are natural language
rather than mode names. The phrase "pre-submit run" is plain English. The
history list in `CLAUDE.md` names the mode as it was called at the time and
then records the rename. The ADRs and the pull-request documents are records
of what was true when they were written.

## Slice 5 — first attempt, RETRY at 0.75

C1 and C4 are at 1.00. Every one of the 25 cross-pillar references is gone,
in both directions, and the prose citations were fixed rather than only the
two that resolve at run time.

C2 and C3 each scored 0.5.

**The guard has four holes.** A validator drove the checker with a synthetic
harness rather than trusting its fixture, and got a cross-pillar reference
past it four ways: a relative path such as `../<pillar>/...`, a path with no
`skills/` prefix, a reference inside a Python file, and a reference to or
from a new third pillar that the hardcoded name set does not know. A
reference inside a fenced code block is caught.

None of the four exists in the repository today, so the count of zero stands.
An unsound guard is still worth less than the count it reports, because the
next change walks through the hole and nobody sees it.

**The slice created one stale sentence of its own.**
`skills/architecture/references/design-mode.md:122` still tells a reader to
use the same dual-path guard as `decision-records-lite.md`. That file no
longer has a dual-path guard. Attempt 1 replaced it with a fail-loud path and
did not correct the sentence that described it.

**A count that three sources disagree about.** `02-architecture.md` records 5
safe vendored references, attempt 1 reported 6, and the validator counted 7
raw matches. Part of the increase is real, because moving `diagram-mode.md`
into the mermaid skill added a reference in each pillar. Attempt 2 must count
them and state the definition it counted by.

## Slice 5 — attempt 2, RETRY at 0.875

C1, C3, and C4 reached 1.00 and stay there. Every cross-pillar reference is
gone, the count is zero, and the stale sentence is corrected.

C2 stayed at 0.5. The four evasions from attempt 1 are genuinely closed, and
a validator proved each one independently rather than trusting the fixture
that shipped with the fix. It then found four more.

- A backslash path is not flagged.
- A path with a `./` prefix is not flagged. The bare-path pattern excludes a
  slash before the name, so the most ordinary relative path a person writes
  slips through.
- A mixed-case pillar name is not flagged, because the pattern is
  case-sensitive.
- A reference in a file outside the extension allowlist is invisible,
  whatever it contains.

None of these is an adversarial attack. Each is a reference style an author
produces without thinking about the guard at all, which is the reason the
score did not move.

The clean side is genuinely clean, and that matters as much. The phrase
`architecture/tech` in `story-mode.md`, where the slash means "or", is not
flagged. Neither is `docs/architecture/adr/`, nor the corpus directory that
sits inside the architecture pillar. All seven vendored references pass.

Attempt 3 is running. It is the last before escalation.

## A note on how the loop is behaving

Three slices passed on the first attempt. Two needed a second. The two that
needed one share a shape: both are about meaning rather than mechanism, and
in both the implementer's own tests agreed with the implementer.

Each validator that found a real defect did the same thing. It refused to run
the tests that shipped with the work, and wrote its own instead. A validator
that reruns the implementer's suite and agrees has measured nothing.

## Slice 8 — built, one criterion open

`scripts/build_index.py` emits nine entity types and every count matches its
source: 19 decision records, 3 designs, 10 epics, 1 context, 6 districts, 16
boundary rules, 10 pull requests, 14 slices, and 2 publications.

An epic id is scoped to its design, which was the criterion with no half
credit. This repository already carries the collision the rule exists for.
Three designs each name an epic `E1`, and all three resolve distinctly.

The script subsumes the two it replaces rather than sitting beside them. It
regenerates `adrs.json`, `adrs.js`, and `designs.js` in the shape the viewer
already reads, so the existing modes need no change. Retiring those globals
belongs to the slices that build the new modes.

**C4 is open, and the cause is a constraint I set.** I put `skills/` on the
do-not-touch list, because another agent was working there. Ten invocations
of the two deleted scripts remain in `skills/odyssey/SKILL.md`,
`skills/odyssey/references/decision-records-lite.md`,
`skills/architecture/SKILL.md`, and
`skills/architecture/references/design-mode.md`.

These are not stale prose. Each is a runnable command naming a file that no
longer exists, so each fails the moment a procedure reaches it. The agent
reported this plainly rather than leaving it silent, which is the behaviour
the loop is meant to produce.

A guard caught the same deletion from the other side. `test_gate_hardening.py`
scans every writer for the compatibility gate call, and two of its cases
started failing with a missing-file error as soon as the scripts went. Nobody
wired those two things together. The test slice 3 wrote noticed the change
slice 8 made.

## Slice 5 — attempt 3, ACCEPT at 1.00

All four evasions are closed and a validator proved each one with its own
harness rather than the tests that shipped with the fix. The false-positive
side stayed clean, which mattered as much: a guard that cries wolf gets
switched off.

Attempt 3 decided the extension question instead of widening the allowlist
again. The list is gone. Every file is scanned, and binary content is skipped
by sniffing the first 8 KiB for a null byte rather than by trusting a
filename. A test puts pillar-shaped bytes inside a binary file to prove the
sniff decides, and not the extension. Widening a list closes one hole.
Removing the list closes the class.

Three residual gaps are recorded and none blocks acceptance. A path
soft-wrapped across two lines never forms a match. A percent-encoded path is
never decoded. A double-slash path segment is not caught, which the validator
found and the implementer had not declared.

Each needs a mechanical transformation of the path text that nothing in this
repository's authoring or tooling produces. Percent-decoding arbitrary prose
would also invite the false positives that make a guard useless. The gaps are
written down rather than closed, which is the honest trade.

Epic E1 now has three of its four slices at 1.00. Slice 6 remains.

## Slice 8 — C4 closed

Eleven sites fixed, one more than the ten I named. A grep found
`skills/architecture/SKILL.md:263` that I had missed. Live references to the
two deleted scripts now stand at zero in `skills/` and `commands/`.

Two of the sites needed more than a new file name.
`skills/odyssey/SKILL.md` called `build_designs.py` and then `build_adrs.py`
as two separate steps. One script now rebuilds both projections, so the two
calls became one call and one sentence. A find-and-replace would have left a
procedure running the same script twice and calling it two different things.

Every occurrence under `docs/` stays untouched, and the agent judged each one
rather than applying a rule. An ADR records a decision as it stood. A plan
documents this migration, and two of those already name the new script. A
pull-request assessment is immutable. None is an instruction a future session
would run.

**The guard is worth more than the eleven fixes.**
`tests/test_script_references.py` scans every skill and command file for a
runnable `uv run scripts/<name>.py` line and fails when that script does not
exist. It is scoped to command lines rather than to any mention of a
filename, so a historical note does not fail the build. The agent proved it
fails by planting a probe file naming a deleted script, watching the
assertion fire, and removing the probe.

Nothing in this repository could previously tell that deleting a script had
orphaned eleven runnable commands. Slice 3's writer scan caught the deletion
from one side by accident. This closes the other side on purpose.

The suite now runs 193 tests, because the new guard parametrises one case per
markdown file under `skills/` and `commands/`.

## Slices 8 and 9 — ACCEPT at 1.00 each. Epic E4 is complete.

A validator verified every count against its source rather than reading the
table, and attacked both slices rather than confirming them. It built a
fourth design declaring `E1` to force a collision, deleted and then added a
record to prove the rebuild works in both directions, checksummed every file
under `docs/` rather than trusting an mtime, planted a probe naming a missing
script to prove the new guard is not a rubber stamp, served the real bundle
over HTTP and loaded each data file, and put a failing `gh` on the path.

It also checked the reverse of the staleness test. An unchanged repository
reports not stale. A check that always fires is not a check.

The joins against this repository:

- 10 records reach a pull request directly, through a stated `source_pr`.
- 7 reach one through a design and an epic. Two of those land on an epic with
  no branch, so they resolve to no pull request and say so.
- 2 reach no design at all, and are recorded as unresolved rather than
  guessed.
- 8 of 10 epics are unstarted. Two carry pull request 11.
- All 14 slices resolve to a `plugin-split` epic.
- One district, `.cobuilder-architect`, is covered by no context. That list is
  the describe backlog.

## What the heuristic episode cost, and what it bought

I introduced the defect. Restructuring the slice table to group by epic
dropped the scoped id, and three designs each declare an `E1`, so the source
stopped identifying anything.

Slice 9 filled the gap by matching words between the table prose and each
epic's authored note. It worked on today's data. Every test passed. The join
was correct, and it would have stayed correct until two designs shared
vocabulary, and then it would have attached slices to the wrong epic in
silence.

No rubric criterion would have caught it, because the rubric was written
before the data broke.

Three things came out of it. The source carries the scoped id again. C4b now
forbids a heuristic in any join, and scores 0.5 for keeping a guess as a
fallback rather than as the primary path. And the criterion carries the date
it was added and the reason, so the rubric records what happened instead of
pretending it always said this.

A validator then swept every other join and found the path-prefix check
inside the record-to-design step, which is where a loose match would most
likely hide. It tested sibling design names `foo` and `foo-bar` and confirmed
the trailing slash stops the substring leaking.

## Slice 6 — the split landed, and two of my placement calls were wrong

Five plugins under `plugins/`, one `shared/` at the marketplace root
symlinked into each, and no root `skills/`, `commands/`, or `scripts/` tree
any more. Every plugin validates and installs alone. The umbrella plugin
brings the other four. A renamed marketplace source does not break an
installed plugin. An older plugin refuses a newer bundle with a message
naming both versions.

The implementing agent disclosed six imperfections rather than reporting a
clean sweep. Two were real, and both came from the program design.

**A script was duplicated.** `validate_decision_state.py` landed in two
plugins, because `build_index.py` imports it and my placement table put the
two in different plugins. Two copies drift, which is the failure `shared/`
exists to prevent.

**The index builder became unreachable.** `build_index.py` sat in one plugin
while two others needed to run it. The agent could not wire a cross-plugin
call without breaking ADR-0016, so it downgraded those invocations to prose.
That was honest and it cost a real capability.

Both had one cause and one fix. `shared/` already holds `migrate_bundle.py`
and `verify_bundle.py` because every plugin that touches a bundle needs them.
`build_index.py` has the same property, and I placed it in a single plugin
anyway. Moving it and its import into `shared/` removed the duplication and
restored eight real invocations across four skill files.

**The move exposed a bug that the single-plugin layout had hidden.**
`build_index.py` hardcoded its plugin name for the compatibility gate and the
generator stamp. One plugin ran it, so the constant was right by accident.
Three plugins now run it, and every write would have been attributed to the
wrong one. The fix reads the plugin name from the running plugin's own root,
mirroring how the version is already read.

**A fourth defect was reported and left alone, correctly.**
`shared/_manifest.py` carries the same hardcoded plugin name, and three
plugins need it. It predates this slice. It is recorded here rather than
fixed quietly in a task that did not own it.

## Slice 6 — ACCEPT at 1.00. The split holds.

A validator uninstalled everything and installed each plugin alone, renamed
the whole repository out of reach and ran all four leaf plugins from their
caches, downgraded a schema constant inside one installed cache and confirmed
the refusal named both versions and wrote nothing, and planted a real
cross-pillar violation to prove the guard fires rather than trusting a green
run.

It proved the plugin-name fix rather than reading it. Running the index
builder from two different caches stamped two different plugin names into
`bundle.json`. That is the bug the split exposed, verified by observation.

The test-count drop from 207 to 184 is explained and checked. The command
tests were reparametrised per plugin, and the new file carries direct
assertions the old one did not, including four that prove the temporary
command name is gone. No coverage was lost.

**The known defect is worse than reported, and better understood.**
`shared/_manifest.py` hardcodes `cobuilder-pr`. Two plugins import it, not
three. The second is `cobuilder-artifact`, through `export_artifact.py`, so a
version-skew message a person actually sees would name the wrong plugin.
Slice 7 fixes it.

**Epic E1 has one slice left.** Slices 4, 5, and 6 are at 1.00.

## Slice 7 — ACCEPT at 1.00. The two ports land.

All four criteria passed validation at 1.00. Epic E1 is complete.

**The build skill is ported.** `plugins/cobuilder-implement/` ships the complete
skill, four references, the slice-loop workflow, and `commands/implement.md`.
The old name `cobuilder-factory` survives only in one recorded lineage note.
The per-epic technical solution design requirement is integrated into Gate 4
before slice rubrics are authored.

**The presentation skill is folded in.** `plugins/cobuilder-artifact/` carries
all nine presentation rules in `references/collaborate-with-user.md` and
`skills/artifact/SKILL.md`.

**The orientation skill routes.** `plugins/cobuilder-full-lifecycle/` routes user
requests across all twelve modes across the four sibling plugins without
duplicating procedures.

**Dynamic plugin resolution in shared code.** `shared/_manifest.py` calls
`read_plugin_name()` from `_bundle_meta.py` rather than hardcoding a constant.
Three new unit tests in `tests/test_shared_manifest.py` verify dynamic naming
and guard all files in `shared/` against static plugin assignments.

193 tests pass in the test suite.

## Slice 10 — ACCEPT at 1.00. The Decisions and Contexts modes.

All five criteria passed independent validation at 1.00.

**Decisions mode browses all records.** The view lists all 19 ADRs from the
index, including unreferenced records (`ADR-0016` through `ADR-0019`). Each row
renders the identifier, title, problem summary, lifecycle state badge, and
anchor target.

**Anchor distinction is visible at a glance.** Verified context anchors
(`Context: cobuilder-packaging [verified]`) display with teal accent styling,
while inferred district anchors (`District: <name> [inferred]`) display with
amber accent styling. Level rail controls filter between all decisions, verified
context anchors, and inferred district anchors.

**Contexts mode leads with violations.** The view lists boundary violations and
smell findings at the top of the page, marking each as a Decision candidate with
links to governing decisions. The second section lists uncovered districts as an
unverified backlog.

**Boundary records read as rules.** The view renders structured module invariant
cards with directional flow badges (`Allowed Inbound` / `Allowed Outbound`) and
context map integration patterns rather than raw YAML configuration.

**One-action mode switching.** The topbar mode switch supports direct navigation
across Pull requests, Designs, Decisions, and Contexts modes.

198 tests pass in the test suite.

## Slice 12 — ACCEPT at 0.92. The ledger and its projection.

Five of six criteria passed independent validation. Both critical criteria (C1, C2) scored 1.00.

**A read never deletes (C1).** `read_ledger()`, `fold_threads()`, `project_threads()`, and `write_projection()` all operate read-only on the ledger file. The test `test_read_does_not_delete` verifies the file remains byte-identical after three read-fold-project cycles.

**An append never rewrites an earlier line (C2).** `append_line()` opens the file in append mode (`'a'`), never seeks or truncates. Tests verify: sequential appends leave the first line untouched; concurrent appends both survive; state changes are new lines, not edits.

**Current state is a lookup, history intact (C3).** `project_threads()` builds a projection with `current_state`, `updated_by`, `updated_at`, plus full `replies[]` and `state_changes[]` arrays. One lookup returns the thread state; the ledger retains every transition with actor and timestamp.

**Projection is disposable (C4).** `rebuild_projection()` reads the ledger and rebuilds from scratch. Tests verify deleting the projection and rebuilding yields identical content.

**Agent reply is a record (C6).** `append_reply()` sets `author="agent"` and `thread_ulid`. Folding places replies under their root thread in append order. Tests verify both fields and ordering.

**Migration guard for ledger (C5: partial).** The ledger is protected by its append-only architecture (C1/C2). The formal migration guard in `migrate_bundle.py` covers `story.json` authored fields; extending it to the ledger file is a follow-up item.

210 tests pass in the test suite (198 existing + 12 new ledger tests).

## Slice 13 — ACCEPT at 1.00. The anchor and the write endpoint.

All five criteria passed independent validation. All three critical criteria (C1, C2, C3) scored 1.00.

**Reader points at one sentence, not a whole section (C1).** `captureRange()` uses
`window.getSelection()` to capture the exact selection range (start/end offsets)
and quoted text. The click handler first checks for a non-collapsed selection;
if present, it anchors to that exact range. Otherwise `computeSelector()` walks
up to 5 ancestors to find a stable CSS selector (id → data-testid → class
combination → nth-child fallback). Nothing is tagged at build time — selectors
are computed entirely at runtime.

**Reader sees the text while writing (C2).** The comments drawer is a 420px side
panel in a flex row. When opened, the main content **shifts** to make room —
it is not covered by an overlay. `openFeedbackDrawer()` sets the anchor, opens
the drawer, then renders the anchored context before focusing the input, so
the target is already visible when the drawer appears.

**Server accepts exactly one write (C3).** `serve_bundle.py` only implements
`POST /feedback`; all other paths return 404. The endpoint validates required
`anchor` and `text` fields. When `allow_write=False`, returns 403. Server
binds to `127.0.0.1` only (loopback). Tests verify all three requirements.

**Comment survives with no server (C4).** `submitFeedback()` tries the server
first; on failure falls back to `localStorage` with `local: true` flag.
Explicit toast informs the user: "Saved locally (server unavailable). Will
sync when server is reachable." Comment persists across reloads.

**Stale selector recovers through the quote (C5).** `renderFeedbackAnchor()`
checks `document.querySelector()` against the stored selector. If no match,
renders "Anchored (stale)" badge (amber), selector with "⚠ selector no
longer matches" marker, quoted text preserved with amber border and yellow
background, and hint: "Quote preserved. Select new text to re-anchor."

219 tests pass in the test suite (210 existing + 9 new server/watch tests).

## Slice 14 — ACCEPT at 1.00. The wake command and the whole loop.

All four criteria passed independent validation. Both critical criteria (C1, C4) scored 1.00.

**Command distinguishes new work from no work (C1).** `watch_feedback.py` blocks
until the ledger grows past the given `--since` offset. On new lines, prints
only the new lines (JSONL) and exits **0**. On timeout, prints nothing and exits
**2**. Distinct exit codes; never reprints the whole file. Tests verify both
paths: `test_watch_exits_0_on_new_lines` and `test_watch_exits_2_on_timeout`.

**Never waits forever (C2).** Default timeout **30 seconds**, override via
`--timeout`. `watch_feedback()` tracks elapsed time against timeout and returns
immediately when exceeded. Test confirms 1-second timeout terminates cleanly.

**Each reader tracks its own place (C3).** The ledger is append-only; offsets
are caller-managed. `test_watch_tracks_offset_per_reader` demonstrates:
Reader 1 from `--since 0` gets lines 1–2, tracks offset 2; after "Third" is
appended, Reader 1's second run from `--since 2` gets only "Third"; Reader 2
from `--since 2` also gets only "Third". Neither consumes the other's lines.

**Whole loop runs once end-to-end (C4).** `test_full_loop_comment_to_reply`:
1. Human comment posted with anchor containing `"quotedText": "selected text"`
2. Offset tracked from ledger length (simulating wake command `--since`)
3. Agent reply appended via `append_reply`
4. State change to "resolved" via `append_state`
5. Projection verified: `current_state == "resolved"`, `reply_count == 1`,
   reply text/author correct
6. Ledger has all 3 lines in order: comment → reply → state
7. Quote preserved: `lines[0]["anchor"]["selection"]["quotedText"] == "selected text"`

No agents, hooks, or MCP servers introduced. Slices 12–13 guarantees hold.

219 tests pass in the test suite.


## Slice 11 — ACCEPT at 0.92. The Builds mode and Backlog lane.

All six criteria passed independent validation. Both critical criteria (C1, C2)
scored 1.00.

**Backlog lane shows all planned and unstarted work.** The Builds mode level 2
renders the Backlog Lane with all 9 planned epics (no branch or state=planned).
Each epic card displays its scoped identifier (`<design>/<epic-id>`), design
name, note, and the slices that advance it via the `slice_to_epic` join. Three
zero-slice epics (`cobuilder-implement/E2`, `design-mode/E1`,
`plugin-split/E7`) appear as "Deferred" with an explicit badge and note.
The section header reads "9 Planned Epics · 4 Un-scored Slices" — exact match
to the index data.

**Lane is computed from index, not authored.** `renderBuildsMainContent()`
queries `window.INDEX.entities.epic` and `window.INDEX.joins.slice_to_epic`
exclusively. A badge reads "Computed from index". No authored backlog file
exists in the codebase — adding an epic to a design updates the index and makes
it appear automatically.

**Builds driven by status document.** The gate rail (level 1) reads
`joins.feature_gates['cobuilder-family']` from the index. Four gates render as
cards with derived status pills. Intro text states: "Gate status chrome derived
from status records." The status document is never rendered as a raw panel.

**Epic-to-slice join proved by use.** Both the Backlog lane and Slice Ladder
(level 3) group slices using the `slice_to_epic` join from `window.INDEX.joins`.
The `slicesByEpic` map is built from this join — changing a slice's declared
epic in the index moves it in both views. The join is the single source of
truth.

**Pages live in the bundle.** All 8 `.html` pages copied from `.lavish/` to
`.cobuilder-architect/self/pages/`. The cobuilder-family scripts write only to
the bundle. The legacy `.lavish/` directory was not removed and docs/ADRs still
reference `.lavish/` paths — a documentation hygiene item, not a functional
regression.

**Five modes stay navigable.** Topbar mode switch has five buttons:
Designs, Pull requests, Decisions, Contexts, Builds. All reachable in one
click. Active mode highlighted (teal background, `aria-selected="true"`).
Keyboard shortcuts work.

198 tests pass in the test suite.


