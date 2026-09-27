# Product: Slice agents, coding habits, and a DDD vocabulary

## Problem

An engineer who builds a feature with `/implement:start` gets code that
passes its tests and its blind rubric, but two kinds of defect still get
through.

1. **Structural smells.** Long functions, deep nesting, duplicated code, and
   too many parameters. The validator scores behaviour, not shape. Nothing
   in the loop coaches the implementer while it writes.
2. **Vocabulary drift.** The same concept gets two names, or a name that
   the project already rejected. The terms live in three places: the
   Vocabulary table in `CLAUDE.md`, the "Ubiquitous language" section of
   each bounded-context canvas, and the districts in `inventory.yaml`.
   Nothing joins them, and nothing checks new code against them.

Today the RED, GREEN, and VALIDATE roles exist only as prompt text that the
orchestrator pastes into a general-purpose subagent. A rule that must apply
to one role only, such as "coach GREEN after each file it writes", has no
place to live.

## Success metric

Three measurements, each read from files on disk:

1. **Coaching reaches GREEN.** In a slice built after this change, the GREEN
   role's transcript shows habit-hooks output after each file write, and the
   final diff reports clean on `habit-hooks --branch <base>`. Measured on the
   first real feature built after release.
2. **One vocabulary.** `DDD-VOCABULARY.md` at the repository root is the one
   glossary. `CLAUDE.md` holds a pointer to it, not a copy. Every
   bounded-context canvas links its terms to it.
3. **Drift gets caught.** VALIDATE reports a vocabulary verdict for every
   slice. Seeded test: a slice that names a class with a term from an
   `_Avoid_` list gets a vocabulary finding.

## Announcement: the blog post before the feature

The implement plugin now ships its three slice roles as real agents: RED,
GREEN, and VALIDATE. GREEN runs habit-hooks after every file it writes, so
it gets a short coaching note about a smell at the moment it creates one,
not at review time. habit-hooks is an MIT project by Ivett Ördög and its
contributors, and we credit it in the plugin. The repository also has one
DDD vocabulary, `DDD-VOCABULARY.md`. Design mode reads it and adds to it,
and a vocabulary check in VALIDATE holds new code to it.

## Screens

no UI
