# Epic E4: The vocabulary bootstrap

Sources: `02-architecture.md` §glossary, `03-program-design.md`, ADR-0036, ADR-0035 (write-surface exception), baseline-derivation.md.

## Technical approach

`DDD-VOCABULARY.md` is read or updated at several points but created by
none. Epic E4 adds one bootstrap and a set of existence checks.

**The bootstrap** (`references/vocabulary-bootstrap.md`): design mode stage 1
runs it when the glossary is absent — symmetric to the existing baseline
fallback. Sequence:

1. **Propose from evidence.** From the baseline districts (`inventory.yaml`)
   and verified code symbols (real directories, classes, methods, events —
   the baseline discipline's never-an-unverified-boundary rule), list term
   candidates per district, each annotated with its DDD kind. The kind
   annotations come from the kind-matched `corpus/principles/ddd` cards
   (entities, value objects, repositories, domain events, aggregates) loaded
   under the existing corpus load cap.
2. **Grill.** Through `AskUserQuestion`: confirm, rename to the domain word,
   or reject each candidate; then the inverted question — what does the team
   call this that the code does not name (the generic-name check inverted,
   using `corpus/scenarios/architecture_ddd/004_ubiquitous_language_naming.yaml`
   as the question bank); then cross-context scoping — does a term mean the
   same thing across districts,
   `003_bounded_context_splitting.yaml` decides when a district is really two
   contexts. The corpus supplies the questions, never the words.
3. **Write.** One file in the established entry format, at the target repo
   root for self repos, `<bundle-dir>/DDD-VOCABULARY.md` for foreign targets
   (the describe-lite surface, beside `inventory.yaml`).

**The existence checks.** Every architect and implement mode checks the
glossary's existence and states the result:

- **Design stage 1**: bootstrap (primary, consented during the stage).
- **Options mode stage 1**: check; a missing glossary becomes an inquiry
  note in the report; the stage-6 hand-off offers the bootstrap. Consented
  glossary write = the one declared exception to ADR-0035's "writes nothing
  else", shared with design stage 5's update rule and recorded in ADR-0036.
- **Review mode**: the absence is a `P1` finding (the generic-names row in
  `corpus-index.md` is the finding template); the bootstrap is offered when
  the run ends, after the reports are written.
- **`/implement:install` / `/implement:start` / `/implement:debug`**: one
  notice line — glossary present or absent, and where the bootstrap lives.
  No auto-run: the build surface never interviews the engineer mid-feature.
- **`implement:vocabulary` agent**: step 0 — on a missing file, return
  `FINDINGS` with one `[UNDEFINED]` item naming the bootstrap; never a
  silent `CLEAN`.

## Boundary rules touched

- ADR-0025: no agent file changes in kind — `vocabulary.md` gains a step, not
  a new identity; no new agents or hooks ship anywhere.
- ADR-0018: for foreign targets the glossary joins the bundle shape (authored
  file, not a derived projection); the self-bundle path is unchanged.

## Risks

Interview weight on large repos: the grill is capped at the terms the
districts name. Consent drift (offers become silent writes): the mechanical
guard is only implement's step 0; the consent rule lives in prose and is
re-checked in review.