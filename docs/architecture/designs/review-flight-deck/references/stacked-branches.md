# Stacked branches, merge queues, and the ordering problem

A research reference for `pr:flightdeck`. Written 2026-09-02.

Every claim below is either quoted from a source, or measured on this
machine with git 2.43.0. A cell I could not verify says so.

## 1. Summary

Twenty tools cover this space. All of them read a chain that somebody
already declared. None of them build one.

- Every stacking tool assumes a single trunk. The base of a stack is the
  trunk, and the base of each branch above it is the branch below.
- The parent-child relation comes from the author, not from analysis. It
  arrives as a config key, a text file, a commit trailer, or a local
  commit order. Two tools call their inference step "discover", and both
  document it as a heuristic that gets branches wrong.
- No tool handles a set with no common ancestor. Git itself refuses.
  `git merge-tree` exits 128 with `fatal: refusing to merge unrelated
  histories` unless you pass `--allow-unrelated-histories`.
- `git merge-tree --write-tree` is the mechanism for fast merge testing.
  It touches neither the index nor the working tree. I measured it at
  about 2.8 ms per pair on this repository, against about 650 ms for a
  scratch worktree and a real merge.
- Merge queues are the nearest existing thing to a flight deck. They
  order by arrival time only. Bors splits a failed batch in half and
  retests. GitHub and GitLab drop the failing change and rebuild
  everything behind it. Aviator calls the same event a "queue reset".
- Nothing in the surveyed set proposes an order over an unordered set of
  pull requests. Section 5 gives the honest answer to that question.
- The one adjacent idea worth knowing is academic. Crystal, from a 2011
  paper, speculatively merges every pair of developer repositories to
  warn about conflicts early. It reports pairs. It does not order them.

## 2. Comparison table

"Orders a set" asks question 3 of the brief. It means: given branches
with no declared relation, does the tool propose a sequence.

| Tool | Language / runtime | What it assumes about the base | How it tests mergeability | Orders a set | Rewrites branches | Licence | Maintained (last push) |
|---|---|---|---|---|---|---|---|
| `gh stack` (github/gh-stack) | Go | A trunk, plus a declared chain. `init` prompts for branches. `add` must run on the topmost branch | It does not test in advance. A rebase conflict stops the run and prints the conflicted files | No | Yes. `rebase`, `sync`, and force-push | MIT | Yes. 2026-09-02 |
| `gh-stack` (timothyandrew) | Rust | A trunk, plus a chain the author marks with an identifier in each pull request title | Not verified. The tool edits pull request bodies and bases | No | Not verified | MIT | No. Archived. 2021-09-09 |
| `git-stack` (gitext-rs) | Rust | Protected branches, set by `git-stack --protect <glob>` or git config. The parent is auto-detected from the graph | None. The README states that the tool gives up on a conflict and asks you to run `git rebase` yourself | No | Yes. Rebase is the core operation | MIT or Apache-2.0 | Yes. 2026-09-01 |
| Graphite (`gt`) | TypeScript CLI, plus a commercial service | A trunk. The CLI records the base of each branch, which is the commit matching its parent branch | Not verified for pre-merge prediction. The hosted merge queue rebases onto trunk and runs CI | No | Yes. `gt restack` and reordering rewrite the stack | Unverified | Yes. Commercial and active. Exact last commit unverified |
| Sapling (`sl`) | Rust | A public base. Draft commits above the public commits form the stack | Not verified | No | Yes. The stack is a commit series and rebases move it | GPL-2.0 | Yes. 2026-09-02 |
| `git-branchless` | Rust | A main branch. The main commit and its ancestors are "public". Everything else is "draft" | Not verified | No | Yes. `move` and restack rewrite draft commits | Apache-2.0 | Yes. 2026-09-01 |
| Git Town | Go, with Gherkin feature files | A perennial main branch. Lineage lives in git config as `git-town-branch.<branch>.parent=<branch>` | None found. Sync merges or rebases and surfaces conflicts | No | Yes, depending on the sync strategy | MIT | Yes. 2026-07-26 |
| `spr` (ejoffe) | Go | A trunk. The order comes from the local commit sequence on one branch. One commit becomes one pull request | It reports a conflict bit per pull request in `git spr status`. `git spr check` runs configured pre-merge checks | No | Yes. It amends commits and force-pushes | MIT | Yes. 2026-04-22 |
| `ghstack` | Python | A trunk. It takes all commits from the merge base to head. One commit becomes one pull request | None found | No | Yes. It writes `gh/<user>/<n>/{base,head,orig}` refs and amends local commits | MIT | Yes. 2026-07-29 |
| `git-machete` | Python | A branch tree written in the `.git/machete` text file. `git machete discover` guesses it with a documented heuristic | It compares each branch against its parent to show in-sync or out-of-sync. It does not test an arbitrary pair | No. `discover` guesses a tree, it does not order a merge sequence | Yes. `update`, `traverse`, and `slide-out` rebase | MIT | Yes. 2026-08-30 |
| StGit (`stg`) | Rust | The stack base is the most recent commit that is not an StGit patch. Order is the patch order the author sets | None found. `stg push` surfaces a conflict during application | No. `push` and `pop` reorder, but the author decides | Yes. Every patch is a commit that gets rewritten | GPL-2.0 | Yes. 2026-09-01 |
| `git-series` | Rust | A base commit the author records, plus a series of patches | None found | No | Yes | MIT | Dormant. 2024-07-14 |
| GitButler | Rust, Tauri, Svelte | A single target branch and one working directory. Several virtual branches apply at once | Hunk dependency analysis. A hunk that locks to two stacks marks a conflict. Rebases always finish, and conflicted commits carry a marker | No. It detects overlap, it does not propose a sequence | Yes. It rewrites virtual branch commits constantly | FSL-1.1-MIT | Yes. 2026-09-02 |
| Gerrit | Java, server | A relation chain built from real commit parents. A parent commit carrying a `Change-Id` becomes the parent change | Server-side. Gerrit reports a mergeability state per change. The exact plumbing is unverified | No. The chain follows the pushed commit order | Yes, through the author's amend and repush cycle | Apache-2.0 | Yes |
| Phabricator `arc` / Differential | PHP, server | A trunk, plus a `Depends on` line in the commit message. Later versions detect the dependency at `arc diff` time | Not verified | No | Yes. `arc diff` rewrites the local commit | Apache-2.0 | No. Upstream stopped in 2021. The Phorge fork continues |
| bors-ng | Elixir | The trunk. Batches build on the trunk head | It builds a real staging branch and runs CI on it | Arrival order only, then batch splitting on failure | No. It merges, it does not rewrite contributor branches | Apache-2.0 | No. Archived. 2024-04-04 |
| GitHub merge queue | Hosted service | The base branch. Each group holds the base plus the changes of every pull request ahead in the queue | It builds a real `gh-readonly-queue/{base_branch}` branch and runs the required checks | First in, first out only | No | Proprietary | Yes |
| GitLab merge trains | Hosted service | The target branch. Each car holds the target plus every merge request ahead of it | It runs a real pipeline on the combined result | Chronological by the moment somebody selects Merge | No | Proprietary and open core | Yes |
| Mergify merge queue | Hosted service | The base branch. Batches and speculative checks run ahead of the merge | It runs CI on a speculative branch, up to 128 in parallel | Priority rules set by config, then arrival order | No | Proprietary | Yes |
| Aviator MergeQueue / `av` | Go CLI, hosted service | The target branch. In parallel mode a bot pull request holds the target, the change, and every queued change ahead of it | It runs the required checks on the bot pull request | Arrival order, subject to configured priority | The `av` CLI rebases stacks. The queue does not | MIT for `av`. The service is proprietary | Yes. 2026-08-31 |

## 3. The common-ancestor question

### 3.1 The standard approach

There is a standard approach, and it has no name. Every tool assumes one
trunk. The trunk is the base of the stack, and each branch above takes
the branch below as its base. A tool then stores that relation somewhere
it can read back:

- Git Town writes `git-town-branch.<branch>.parent` into git config.
- `gh stack` writes a JSON file at `.git/gh-stack`.
- `git-machete` writes a branch tree into `.git/machete`.
- Graphite records the base commit of each branch inside `.git`.
- Gerrit derives the chain from commit parents and `Change-Id` trailers.
- `spr`, `ghstack`, StGit, and Sapling read the local commit order.

None of these is a computation over the branch set. Each one is a record
of a decision the author already made.

### 3.2 What happens when the assumption does not hold

Three tools try to infer the relation rather than read it. All three
document the result as approximate.

`git machete discover` builds a branch tree with what the project calls
"an (imperfect) heuristic which usually yields branch layout close to
what the user would expect". The documentation warns that it can attach a
branch to `main` or `develop` incorrectly. It also runs a separate
fork-point algorithm that consults the reflog. That combination is the
closest published attempt at reconstructing relations after the fact.

`git-stack` auto-detects the parent branch from the commit graph, and
falls back to the protected-branch globs. `git-branchless` splits the
graph into public commits, meaning the main branch and its ancestors,
and draft commits, meaning everything else. Both start from a known
trunk. Remove the trunk, and neither has an answer.

### 3.3 Disjoint roots

No surveyed tool handles a set with no common ancestor. I found no
documentation that even raises the case. Git itself treats it as an
error, and I measured that behaviour:

```
$ git merge-tree main ORPH
fatal: refusing to merge unrelated histories
exit=128

$ git merge-tree --allow-unrelated-histories main ORPH
9a064507a00f5a6b6d32b0133c53f341c292d360
exit=0

$ git merge-base --octopus main A B ORPH
exit=1
```

Three facts follow, and they matter for the flight deck.

First, `git merge-base --octopus` prints nothing and exits 1 when the set
has no common ancestor. It gives no reason, so a caller must treat an
empty result as a signal, not as a failure to handle later.

Second, the octopus merge base of a sequentially cut branch set sits late
in history, not at the scaffold commit. That is a property of how the
branches were cut, not a defect. A late base is the correct base for
simulation, because it is what every branch in the set actually shares.

Third, a merge across disjoint roots does succeed once you pass
`--allow-unrelated-histories`. Git only refuses by default. So a flight
deck can simulate the disjoint case, as long as it opts in on purpose and
reports that it did.

A workable rule for a set with no shared ancestor is to partition. Use
`git merge-base --octopus` over each candidate subset, group the branches
that share a base, and treat each group as its own path. Report the
groups as separate, because a reviewer needs to know that the set is not
one story. I found no tool that does this, so the rule is a proposal, not
a report.

## 4. Mergeability mechanics

This section is an implementation reference. Every command below ran on
git 2.43.0 unless marked otherwise.

### 4.1 `git merge-tree --write-tree`, the modern form

Git 2.38, released October 2022, added the `--write-tree` mode. It
computes a merge with the `ort` strategy and touches neither the index
nor the working tree. It is now the default mode when you pass two
arguments.

```
git merge-tree [--write-tree] [<options>] <branch1> <branch2>
```

Options worth knowing:

| Option | Effect |
|---|---|
| `--name-only` | Print conflicted filenames instead of `(mode, oid, stage, path)` tuples, and print each name once |
| `--messages` / `--no-messages` | Force or suppress the `Auto-merging` and `CONFLICT` lines. The default prints them only on a conflict |
| `--quiet` | Print nothing. Use the exit status alone |
| `--allow-unrelated-histories` | Merge two commits that share no history. Without it, git exits 128 |
| `--merge-base=<commit>` | Supply the merge base instead of letting git find it |
| `-z` | End each filename with NUL instead of a newline |
| `--stdin` | Read merge requests from standard input. Implies `-z` |

Exit status, quoted from the manual page:

> For a successful, non-conflicted merge, the exit status is 0. When the
> merge has conflicts, the exit status is 1. If the merge is not able to
> complete (or start) due to some kind of error, the exit status is
> something other than 0 or 1 (and the output is unspecified). When
> --stdin is passed, the return status is 0 for both successful and
> conflicted merges, and something other than 0 or 1 if it cannot
> complete all the requested merges.

I confirmed the 0 and 1 values on a synthetic conflict. Note the trap: at
least one third-party summary of this page states the opposite. Do not
take the polarity on trust, and assert it in a test.

Output on a conflict looks like this:

```
ce127163145264fd8a1df037323800b076da3617
100644 a29bdeb434d874c9b1d8969c40c42161b03fafdc 1	f.txt
100644 8d75ebddd87e768644a8d2cc6a5bd70dab0ad26b 2	f.txt
100644 b38f09a9546a6d020f98c14f4d98fd0d99748be8 3	f.txt

Auto-merging f.txt
CONFLICT (content): Merge conflict in f.txt
```

The first line is the merged tree. Stage 1 is the base, stage 2 is
`<branch1>`, and stage 3 is `<branch2>`. With `--name-only` the middle
block collapses to one line per conflicted path, which is what a
conflict count needs.

Two cautions from the manual's MISTAKES TO AVOID section. The merged tree
for a conflicted merge contains conflict markers inside the blobs, so it
is not a clean tree. An empty conflicted-file list does not prove a clean
merge on its own, so read the exit status.

### 4.2 Batch mode

`--stdin` runs many merges in one process. Each input line has this form:

```
[<base-commit> -- ]<branch1> <branch2>
```

The per-merge status integer is **inverted relative to the process exit
status**. The manual says: "0: merge had conflicts, 1: merge was clean".
The process itself exits 0 whether or not merges conflicted. I measured
both. This is the single easiest thing to get wrong in an implementation.

Batch mode matters for a flight deck. Testing every ordered pair of 18
branches is 306 merges. One process beats 306.

### 4.3 Chaining simulated merges without a worktree

`git merge-tree` returns a tree, but in git 2.43.0 it will only accept
commits as its two arguments. I tested trees directly and got:

```
error: <oid>: expected commit type, but the object dereferences to tree type
merge-tree: <oid> - not something we can merge
```

The documentation for `--merge-base` claims that trees suffice. On 2.43.0
they do not. So to build a chain of merges in memory, wrap each result in
a commit:

```
TREE=$(git merge-tree --write-tree "$ACC" "$NEXT")
ACC=$(git commit-tree "$TREE" -p "$ACC" -p "$NEXT" -m "simulate")
```

`git commit-tree` writes a commit object and prints its id. It updates no
ref, so nothing on the branch list changes. I verified the resulting
graph with `git log --graph`. This gives a full path simulation with no
worktree, no index, and no checkout.

A caveat. Once a step conflicts, the accumulated tree carries conflict
markers, so every later step in that path measures a polluted input.
Stop the path at the first conflict, or drop the conflicting branch and
carry on from the last clean accumulator.

### 4.4 A scratch worktree, for the replay

```
git worktree add --detach <path> <base-ref>
git -C <path> merge --no-commit --no-ff <branch>
git worktree remove --force <path>
```

This is the honest test. It runs the real merge machinery, leaves the
session's own working tree untouched, and lets you run a build or a test
suite on the result. It is what the flight deck should use for the one or
two paths it promotes.

### 4.5 Measured cost

Measured on this repository, `size-pack` 22.99 MiB, git 2.43.0:

| Operation | Time |
|---|---|
| `git merge-tree` on one branch pair | about 2.8 ms, from 20 iterations at 55 ms total |
| `git worktree add --detach` plus `git merge --no-commit --no-ff` plus `git worktree remove` | about 648 ms |

The ratio is roughly 230 to 1. Treat these as indicative. This repository
is small, and a large repository will change both numbers, though not the
shape of the gap.

### 4.6 Other plumbing worth knowing

**Path overlap, as a prefilter.** Two branches that touch no common file
almost never conflict at the text level.

```
git diff --name-only $(git merge-base A B)...A
```

The three-dot form gives the files that A changed since the base. Compare
two such sets to skip most pairs before you merge anything. This is a
filter, not a proof. A rename or a directory-file collision defeats it.

**Duplicate work between two branches.** `git patch-id` reduces a diff to
a stable id that ignores whitespace, line numbers, commit messages, and
commit ids. Two commits with the same change get the same id. I measured
this:

```
$ git show A | git patch-id --stable
c32e1824e93bf21887b13d1a03ac5dce09676eea 675040d0...
$ git show A2 | git patch-id --stable
c32e1824e93bf21887b13d1a03ac5dce09676eea 71088096...
```

The same patch id, two different commits. `git cherry <upstream> <head>`
uses this and prints `-` for a commit already present upstream as an
equivalent patch, and `+` for one that is not. Use it to spot two open
pull requests that carry the same change.

**Server-side, without cloning.** The GitHub REST API returns `mergeable`
and `mergeable_state` on a pull request. `mergeable` is null until a
background job finishes the test merge, so a caller must poll. The
documented `mergeable_state` values are `clean`, `dirty`, `blocked`,
`unstable`, and `unknown`, where `dirty` means a conflict. GitHub has
never officially documented `mergeable_state`, and its own community
answers call it unofficial and subject to change. It also tests only
against the base branch, never against another open pull request. That
last point makes it useless for the flight deck's core question.

## 5. Ordering an unordered set

Nothing does this. That is the plain answer to question 3.

Every stacking tool reads an order it did not compute. The order arrives
as a config key, a text file, a commit trailer, a title token, or the
local commit sequence. `spr` and `ghstack` are the clearest case. They
turn commit number one into pull request number one, and the author set
that number by committing in that order.

The three tools that come nearest still fall short in a way that matters:

- **`git machete discover`** infers a branch *tree*, not a merge
  sequence. It answers "who is whose parent", and it answers it with a
  heuristic the project itself calls imperfect. It never asks whether two
  sibling branches can merge in either order.
- **GitButler** applies several branches to one working directory at
  once, and its hunk dependency analysis finds the overlap between them.
  That is real pairwise conflict knowledge over an unordered set. It uses
  the knowledge to refuse an application or to mark a commit conflicted.
  It does not turn the knowledge into a sequence.
- **Merge queues** produce a sequence, but they do not choose it. GitHub
  states its rule as "first-in-first-out order where the required checks
  are always satisfied". GitLab orders by the moment somebody presses
  Merge. Mergify and Aviator add a priority setting, which is a manual
  override, not a computed order.

The academic work is closer in spirit and older than all of it. Crystal,
from the 2011 paper *Proactive Detection of Collaboration Conflicts* by
Brun, Holmes, Ernst, and Notkin, speculatively merges pairs of developer
repositories, then builds and tests the result. It warns about textual,
build, and test conflicts before anybody hits them. It reports pairs. It
proposes no order over the set.

So the gap is real, and it is specific. Somebody has to:

1. Take a set of branches with no declared relation.
2. Compute a pairwise, and then an ordered, conflict relation over it.
3. Turn that relation into a sequence a reviewer can act on.

Steps 1 and 2 are ordinary work with the plumbing in section 4. Step 3 is
the part nobody ships.

## 6. What we should reuse, and what nobody offers

This section is my assessment. Everything above is reporting.

### 6.1 Reuse

**Reuse `git merge-tree --write-tree`, in `--stdin` batch mode, for the
simulation stage.** It is the exact tool for the job, it is 230 times
cheaper than a worktree here, and it touches nothing. Simulate every
candidate order with it, then replay only the winner on a worktree, which
is what the design already says. Section 4.3 gives the chaining recipe.

**Reuse `git commit-tree` to chain steps in memory.** It keeps a whole
path simulation off the disk and out of the ref namespace. Wrap it so a
conflict stops the path, because the accumulated tree stops being
meaningful after the first conflict.

**Reuse the path-overlap prefilter from section 4.6.** With 18 branches
there are 153 unordered pairs. Most pairs share no file, and skipping
them cheaply keeps the simulation stage small as the open set grows.

**Reuse the merge queue failure model, not its ordering model.** Bors
splits a failed batch in half and retests, which isolates the offender in
logarithmic steps. GitHub and GitLab drop the failing change and rebuild
everything behind it. Aviator names the same event a "queue reset". Any
of the three is a sound answer to "the replay hit a conflict at step
four". Their *ordering* model is arrival time, which is exactly the thing
we are trying to replace, so take nothing from it.

**Reuse `git patch-id` for one narrow job.** Two open pull requests that
carry the same change should not both appear on the path. `git cherry`
already does this comparison, and the flight deck should run it before it
orders anything.

**Reuse the vocabulary, carefully.** "Stack" already means a chain an
author declared. Our thing is not a stack. Section 2 of `CLAUDE.md` sets
the rule for this family, so pick a distinct word before the mode ships,
and do not let a reader think `pr:flightdeck` is a `gt` clone.

### 6.2 What nobody offers

**No ordering.** Section 5 says it plainly. There is no algorithm to
copy, no reference implementation to read, and no prior art to cite for
the sequence itself. That is the mode's real contribution, and it is also
the whole of its risk.

**No disjoint-root handling.** No tool documents the case, and git
refuses it by default. The partition rule in section 3.3 is mine, and it
is untested. It needs a decision recorded before the first simulation
runs, because an empty `git merge-base --octopus` result is silent.

**No conflict count as a first-class output.** Every tool treats a
conflict as an interrupt to hand to a human. The flight deck treats a
conflict count as a score for comparing candidate paths. That inversion
has no precedent in the surveyed set, so nothing tells us how expensive
the count is on a large set. Measure it on this repository's 18 branches
before the design commits to a search strategy.

**No cost model for restacking.** Every stacking tool rebases and
force-pushes, and `git rebase --update-refs`, added in git 2.38, moves
the branches above. The published material says almost nothing about what
that costs somebody else who has the branch checked out. Andrew Lock's
part 2 recommends `--force-with-lease` and `rebase.updateRefs true`, and
does not discuss collaborators at all. Our design merges onto an
integration branch and never rewrites a contributor's branch. That avoids
the whole problem, and it is the right call. Keep it.

## 7. Sources

Repository facts such as language, licence, and last push date came from
the GitHub API on 2026-09-02.

| Source | What it gave |
|---|---|
| https://github.com/github/gh-stack | The official extension. Metadata in `.git/gh-stack`, an author-declared chain, `sync` switching to `--onto` after a merge |
| https://github.com/github/gh-stack/blob/main/README.md | The quoted command list and the sync sequence |
| https://github.com/timothyandrew/gh-stack | The older Rust tool of the same name. Archived 2021-09-09 |
| https://github.com/gitext-rs/git-stack | Protected branches as the trunk rule, auto-detected parents, and the explicit refusal to resolve conflicts |
| https://andrewlock.net/working-with-stacked-branches-in-git-part-1/ | `git rebase -i --update-refs` and `git absorb` for editing inside a stack |
| https://andrewlock.net/working-with-stacked-branches-in-git-part-2/ | Restacking after a squash merge, `rebase --onto`, and `rebase.updateRefs true`. The series stops at part 2 |
| https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/managing-stacked-pull-requests | GitHub's own stacked pull request documentation. `gh stack sync --prune` and the author-declared base |
| https://graphite.com/docs/command-reference | Graphite stores stack metadata in `.git` and tracks the base commit of each branch |
| https://github.com/withgraphite/docs/blob/main/guides/graphite-cli/mixing-gt-and-git.md | The warning that a vanilla `git rebase` untracks a branch and needs `gt track` |
| https://sapling-scm.com/docs/addons/reviewstack/ | `sl pr submit --stack`, one pull request per commit, and ReviewStack's stack navigation |
| https://github.com/arxanas/git-branchless | Public commits versus draft commits, and the smartlog |
| https://github.com/arxanas/git-branchless/wiki/Command:-git-smartlog | How the main branch fixes the base of the local work |
| https://www.git-town.com/stacked-changes.html | `git town hack`, `append`, `set-parent`, and the cascade in `sync --all` |
| https://www.git-town.com/preferences/parent | The config key `git-town-branch.<branch>.parent=<branch>` |
| https://github.com/ejoffe/spr | Order taken from the local commit sequence, one commit per pull request, and the status conflict bit |
| https://github.com/ezyang/ghstack | The `gh/<user>/<n>/{base,head,orig}` ref scheme, and `ghstack land` |
| https://github.com/VirtusLab/git-machete | The `.git/machete` file, and `discover` described as an imperfect heuristic |
| https://stacked-git.github.io/guides/tutorial/ | The stack base is the most recent commit that is not an StGit patch. `push` and `pop` reorder |
| https://github.com/git-series/git-series | A patch series over a recorded base. Dormant since 2024-07-14 |
| https://docs.gitbutler.com/overview | Several virtual branches on one working directory, and the single-worktree constraint |
| https://deepwiki.com/gitbutlerapp/gitbutler/2.4-workspace-and-hunk-management | Hunk locks across stacks as the conflict signal |
| https://blog.gitbutler.com/opening-up-gitbutler | The FSL-1.1-MIT licence |
| https://gerrit-review.googlesource.com/Documentation/concept-changes.html | The relation chain as commits linked by parent pointers |
| https://gerrit-review.googlesource.com/Documentation/cross-repository-changes.html | Submitting a topic pulls in dependent changes and their topics |
| https://secure.phabricator.com/book/phabricator/article/arcanist_diff/ | `arc diff` and the `Differential Revision` line |
| https://secure.phabricator.com/T11343 | The task that made `arc diff` detect a dependent revision and write `Depends on` |
| https://github.com/bors-ng/bors-ng | Batch testing, and splitting a failed batch into two. Archived 2024-04-04 |
| https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue | First-in-first-out ordering, `gh-readonly-queue/{base_branch}` branches, removal on failure, and the group size and wait time settings |
| https://docs.gitlab.com/ci/pipelines/merge_trains/ | Each car tests the changes ahead of it, chronological ordering, and cancel-and-restart on a failure |
| https://docs.mergify.com/merge-queue/ | Speculative checks up to 128 in parallel, batching, and priority rules |
| https://docs.aviator.co/mergequeue/concepts/queue-modes | Parallel mode bot pull requests, and the quoted "queue reset" on a failure |
| https://git-scm.com/docs/git-merge-tree | The full option list for `--write-tree`, the output format, and the deprecated `--trivial-merge` mode |
| https://man7.org/linux/man-pages/man1/git-merge-tree.1.html | The verbatim EXIT STATUS text, the `--stdin` line format, and the inverted per-merge status values |
| https://github.blog/2022-10-03-highlights-from-git-2-38/ | Git 2.38 added `--write-tree` with the `ort` strategy, and `rebase --update-refs` |
| https://github.com/orgs/community/discussions/24299 | The `mergeable_state` values, and the note that the field is undocumented |
| https://github.com/orgs/community/discussions/24504 | `mergeable` returns null until the background test merge finishes |
| https://www.cs.ubc.ca/~rtholmes/papers/fse_2011_brun.pdf | Crystal. Speculative pairwise merging, building, and testing to warn about conflicts early |
| https://dl.acm.org/doi/10.1145/2025113.2025139 | The published record of that paper, FSE 2011 |
