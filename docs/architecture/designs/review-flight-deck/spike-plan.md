# Spike plan: test the flight deck on a real repository

For the `review-flight-deck` design. Written 2026-09-02.

## 1. Why a spike

The design assumes a capability nobody has shown to work. It orders a set
of branches that nobody declared an order for. A survey of 20 tools found
none that does this, so there is no prior art to copy and no
implementation to read. See `references/stacked-branches.md`.

This repository cannot test the assumption. Of 153 pairs of pull request
heads, 139 are ancestor and descendant, 11 are disjoint, and 3 are
genuine three-way merges. All three merge cleanly. The live open set is
one pull request.

The spike answers one question. **Does a computed order beat arrival
order on a real repository?** If it does not, the design has no product,
and a merge queue already does the job.

## 2. What the spike does not build

- No viewer, and no change to `viewer/index.html`.
- No ledger writes, and no new line kinds.
- No runner, and no integration branches.
- No `/pr:generate` call, and no narrative.
- No plugin code. The spike lives under
  `docs/architecture/designs/review-flight-deck/spike/` until it earns a
  place in `plugins/pr/`.

The spike is a script and a result table. Nothing it writes ships.

## 3. The metric

**Path cost.** Merge the branches of a set in a given order onto an
accumulating tree. At each step, count the files that conflict. Path cost
is the sum across all steps.

**Stop count.** The number of steps that conflict at all. A reviewer
feels a stop, not a file.

Both numbers come from `git merge-tree --write-tree`, chained in memory
with `git commit-tree`. Neither touches the working tree.

Report path cost twice: once for all conflicted files, and once for
authored files only. Question Q3 in `open-questions.md` asks whether a
derived-file conflict counts, and this spike measures both rather than
assuming an answer.

## 4. Baselines

A computed order must beat all three.

| Baseline | Definition | Why it is the bar |
|---|---|---|
| Arrival | Pull request creation date, ascending | What GitHub, GitLab and bors already do |
| Random | Mean path cost over 100 shuffles | Chance |
| Reverse arrival | Arrival order, reversed | Guards against a metric that any non-arrival order beats |

## 5. Candidate orderings

Four heuristics, cheapest first.

- **H1 fewest files first.** Order by the count of changed files, ascending.
- **H2 deletion last.** A branch that deletes or renames a path another
  branch writes to goes after that branch. This is the rule this
  repository's own history would need, because pull request 11 deletes
  three directories that five earlier pull requests write into.
- **H3 greedy minimum conflict.** At each step, test every remaining
  branch against the accumulated tree, and take the one that conflicts
  least. Ties break by arrival date.
- **H4 cluster then order.** Group branches by shared file, order within
  a group by H3, and order the groups by size.

H3 is the obvious first algorithm, and `git merge-tree` makes it cheap. A
set of N branches costs N squared over 2 merge tests, which is about 4,950
tests for 100 branches, or roughly 20 seconds at the 4 ms per test
measured here.

## 6. Stages, with kill criteria

### Stage 0. Find a corpus

Score candidate repositories for suitability. A repository qualifies when
it has all four of:

- 15 or more open pull requests.
- 3 or more distinct authors across them.
- 5 or more genuine three-way pairs, meaning neither head is an ancestor
  of the other.
- 1 or more pairs that actually conflict.

`spike/probe_repo.py` computes this against a local checkout.

**Kill:** no repository can be found where open pull requests conflict
with each other. The problem may then be rarer than the design assumes,
and the mode has little to order.

*Output:* a shortlist of three repositories.
*Timebox:* half a day.

### Stage 1. Acquire the set and the base

For each shortlisted repository, list the open pull requests, fetch every
head, and compute the octopus merge-base.

Record: does a common ancestor exist, how many disjoint groups there are,
and how far the base sits from the default branch head.

This stage settles questions Q1 and Q2 with evidence rather than
argument. It has no kill criterion, because it is data collection.

*Output:* one table per repository.
*Timebox:* half a day.

### Stage 2. The pairwise matrix

Run `git merge-tree --write-tree` over every pair. Classify each pair as
clean, conflict, disjoint, or ancestor. Classify every conflicted file as
authored or derived.

**Kill:** fewer than 5 percent of genuine three-way pairs conflict. Order
then barely matters, the git replay is decoration, and what remains of
the design is the narrative alone. That is still a product, and it is a
different and smaller one, so the design would need rewriting rather than
building.

*Output:* a conflict matrix, and a conflict density figure.
*Timebox:* one day.

### Stage 3. Order the set

This is the stage that matters. Implement H1 to H4. Compute path cost and
stop count for each, and for the three baselines.

**Success:** the best heuristic reaches a path cost of 50 percent or less
of the arrival-order cost, on at least two of the three repositories, and
beats the random mean on all three.

**Kill:** no heuristic beats arrival order by a margin worth the machine.
A merge queue then already solves the problem, and the design should stop.

*Output:* a table of seven orderings against two metrics, per repository.
*Timebox:* two days.

### Stage 4. Does the simulation predict the replay

Take the winning order from stage 3. Replay it for real, on a scratch
worktree, with sequential `git merge` commands. Compare the real conflicts
against what the chained `merge-tree` simulation predicted.

**Kill:** the simulation disagrees with the replay on which steps
conflict. The cheap path is then invalid, and every simulation must run
on a worktree, which changes the cost model of the whole design.

*Output:* a predicted-against-actual table.
*Timebox:* one day.

### Stage 5. Ask a human

Show the winning order to somebody who knows the repository. Ask whether
they would have chosen it, before they see the cost.

This is a calibration, not a gate. It is the only test of question Q7,
and one person's answer settles nothing. Record it anyway, because
nothing else in the plan touches the claim that the whole design rests
on.

*Output:* a written answer, and the reasons.
*Timebox:* an hour.

## 7. What the spike settles

| Question | Stage | How |
|---|---|---|
| Q1 no common ancestor | 1 | Count disjoint groups on real sets |
| Q2 which ancestor | 1 | Measure the distance from base to head |
| Q3 derived conflicts | 2 | Report path cost with and without them |
| Q4 the algorithm | 3 | Compare four heuristics against three baselines |
| Q5 a corpus | 0 | Produce the shortlist |
| Q7 reviewer trust | 5 | One answer, recorded as one answer |
| Q9 how many paths | 3 | See how many heuristics differ in cost |

Questions Q6, Q8, and Q10 to Q15 are decisions, and no measurement
settles them.

## 8. Total

Five and a half days, and four kill points. Three of the four can stop
the design before any plugin code exists.
