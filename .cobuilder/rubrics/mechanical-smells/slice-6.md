# Rubric: Slice 6 — the comments in viewer source

Feature: mechanical-smells
Epic: E1
Slice goal: `habit-sensors` reports no `non-essential-comment` finding for the 42 viewer source files that carried the 658 comment findings. A reviewer sample of at least 20 deleted comments finds no more than one that explained why.
Test command: uv run pytest tests -q && (cd plugins/artifact/viewer && npm run typecheck && npm run test)

Terms used below. **S** is the commit before the slice's first commit. **Sensor command** for a file F, run from the repo root:

```
habit-sensors --file F | python3 -c 'import sys,json;d=json.load(sys.stdin);p=sys.argv[1];print([(s["smell"],i["details"].get("line")) for s in d for i in s["issues"] if i["details"].get("file")==p])' F
```

The filter on `details.file` is required, because jscpd reports repo-wide clusters in `--file` mode. **The slice's files** are the viewer source files (not `*.test.*` files) that report a `non-essential-comment` finding at S. List them by running the sensor command, in a worktree at S (`git worktree add --detach /tmp/before-6 S`, with `node_modules` and `plugins/artifact/viewer/node_modules` linked in), for every non-test file under `plugins/artifact/viewer/src`.

## Criteria

### C1 — the comment findings are gone [CRITICAL]
**Must be true:** None of the slice's files reports a `non-essential-comment` finding.
**Evidence to check:** run the sensor command for each of the slice's files in the working tree, and count the `non-essential-comment` entries.
**Scoring:**
- 1.0 — zero.
- 0.5 — at most ten remain.
- 0.0 — more than ten remain.

### C2 — no code changed [CRITICAL]
**Must be true:** For every changed file, the code is identical once comments are stripped.
**Evidence to check:** run this from `plugins/artifact/viewer`. It prints a line for each file whose minified code differs from S:

```
for f in $(git diff --name-only S..HEAD -- src ':(exclude,glob)**/*.test.*' | sed 's|^plugins/artifact/viewer/||'); do
  ext=ts; case "$f" in *.tsx) ext=tsx;; esac
  a=$(git show S:plugins/artifact/viewer/$f | npx --no-install esbuild --minify --loader=$ext | sha256sum)
  b=$(npx --no-install esbuild --minify --loader=$ext < $f | sha256sum)
  [ "$a" = "$b" ] || echo "CODE CHANGED: $f"
done
```

Also run `git diff --name-only S..HEAD` and confirm the slice adds no new source file.
**Scoring:**
- 1.0 — the loop prints nothing.
- 0.5 — it prints one file, and the diff shows a whitespace or import-order change only.
- 0.0 — it prints a file with a code change.

### C3 — the reviewer sample keeps the comments that explain why [CRITICAL]
**Must be true:** Of at least 20 sampled comment changes, at most one removed or reworded a comment that explained why. A comment explains why when it states a reason, a constraint, a trade-off, or a fact that the code does not show. A comment that only restates the code does not.
**Evidence to check:** collect the removed comment lines, then draw a repeatable sample:

```
git diff -U0 S..HEAD -- plugins/artifact/viewer/src ':(exclude,glob)**/*.test.*' | grep -E '^-\s*(//|/\*|\*)' > /tmp/removed-6.txt
python3 -c "import random;L=open('/tmp/removed-6.txt').read().splitlines();random.seed(20261026);print('\n'.join(random.sample(L,min(25,len(L)))))"
```

Read each sampled line with its surrounding code (`git show S:<file>`), and classify it. Also read every comment the slice added or reworded: a rewording must explain why, not restate the code. Record the sample and the classes in the evidence file.
**Scoring:**
- 1.0 — at most one of the sampled changes lost a why-comment.
- 0.5 — two lost one.
- 0.0 — three or more lost one. This also fires the abort condition of the program: report it.

### C4 — no dodge, no suppression
**Must be true:** The slice adds no `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`, `noqa`, or `habit` suppression. It adds no comment in a form that the sensor ignores merely to keep text, such as a block of text moved into a string or a JSDoc wrapper around the same restating sentence.
**Evidence to check:** `git diff S..HEAD -- plugins/artifact tests .habit-hooks | grep '^+' | grep -E 'eslint-disable|@ts-ignore|@ts-expect-error|as any|noqa|habit-snooze|snooze'` must print nothing. Read the added lines of `.habit-hooks/config.toml`, which must show no new exclusion. Read ten added comment lines.
**Scoring:**
- 1.0 — nothing found.
- 0.5 — one comment is a disguised restatement.
- 0.0 — any suppression, or a new exclusion.

### C5 — tests and build are unchanged
**Must be true:** The viewer suite reports at least 252 passing tests. The Python suite passes, including the byte-comparison of `index.html`. The committed `index.html` equals its state at S, because comments leave no trace in the build.
**Evidence to check:** run the test command. Run `git diff --stat S..HEAD -- plugins/artifact/viewer/index.html` and expect no change.
**Scoring:**
- 1.0 — all pass, and `index.html` is unchanged.
- 0.5 — all pass, but `index.html` changed, and the rebuild test still passes.
- 0.0 — any test fails.

## Regression check
- All tests that passed before this slice must still pass.
- Files outside the slice scope must remain unchanged, except the sensor check `tests/test_viewer_habit_clean.py` (a slice 6 entry that asserts zero `non-essential-comment` findings for the slice's files).

## Out of scope — do not penalise
- Comment findings in `*.test.*` files. Slice 7 owns them.
- Structural findings. Slices 1 to 5 own them, and they stay as they are.
- Findings outside the viewer. Epic E2 owns them.
