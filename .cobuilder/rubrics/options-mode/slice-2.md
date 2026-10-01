# Rubric: Slice 2 — The report template and the validator

Feature: options-mode
Epic: options-mode/E1
Slice goal: `references/reports/options-report-TEMPLATE.html` exists. `uv run plugins/architect/scripts/check_options_report.py <template>` exits 0. Each broken fixture under `tests/fixtures/options_report/` exits 1 for its own check. A long SVG text only warns. `tests/test_options_report.py` passes.
Test command: `uv run --with pytest pytest tests/test_options_report.py -q`

Sources: `04-slices.md` row 2, `epic-E1-design.md`, `03-program-design.md`, the reference report named in `epic-E1-design.md`.

## Criteria

### C1 — The template passes the validator [CRITICAL]
**Must be true:** The template has ten anchors (`#summary`, `#current`, `#flow`, `#inquiries`, `#directions`, `#proposed`, `#gaps`, `#order`, `#decide`, `#evidence`). It has the three figures `fig-current`, `fig-flow`, `fig-proposed` as `<svg>` with a `viewBox`. It has a `<title>`, a `.prompt-box`, and a "Copy all answers" button.
**Evidence to check:**
- `uv run plugins/architect/scripts/check_options_report.py plugins/architect/skills/architecture/references/reports/options-report-TEMPLATE.html; echo $?` prints `0`.
- `grep -c 'id="inquiries"' <template>` prints `1`. `grep -c 'id="findings"' <template>` prints `0`.
**Scoring:**
- 1.0 — exit 0 and the anchor greps hold.
- 0.5 — exit 0 but the old `#findings` anchor remains.
- 0.0 — non-zero exit.

### C2 — Each error check fails on its own fixture [CRITICAL]
**Must be true:** `tests/fixtures/options_report/` holds one good fixture and one broken fixture for each error check: a missing anchor, a figure with no `viewBox`, a `<g id>` with no `<title>`, a row with no direction block, a bad confidence value, an external `src` or `href`, an external script or stylesheet, and a page that calls `window.lavish` or has no copy button or no `<title>`. Each broken fixture exits 1, and the output names the check number.
**Evidence to check:**
- `ls tests/fixtures/options_report/`. Count the broken fixtures. At least eight.
- For each broken fixture run `uv run plugins/architect/scripts/check_options_report.py <fixture>; echo $?` and read the first output line.
- `uv run --with pytest pytest tests/test_options_report.py -q` passes.
**Scoring:**
- 1.0 — eight or more broken fixtures, each exits 1 with its own check number.
- 0.5 — six or seven do, or two fixtures share one check number.
- 0.0 — fewer than six, or a broken fixture exits 0.

### C3 — The warning does not fail the run [CRITICAL]
**Must be true:** An SVG `<text>` longer than 70 characters prints `WARN check 9` and the run still exits 0 when no error check fails.
**Evidence to check:** A fixture that differs from the good fixture only by one long `<text>`. Run the validator on it and read the exit code and output. A pytest case asserts both.
**Scoring:**
- 1.0 — exit 0, one WARN line, and a test asserts both.
- 0.5 — exit 0 and a WARN line, but no test.
- 0.0 — exit 1, or no WARN line.

### C4 — The validator is stdlib-only and runs under uv
**Must be true:** `check_options_report.py` starts with a PEP 723 block that lists no dependency. It imports only the standard library. `main` returns 0 when no error result exists and 1 otherwise.
**Evidence to check:**
- `head -12 plugins/architect/scripts/check_options_report.py`. Expect `# /// script` and `dependencies = []`.
- `grep -n "^import\|^from" plugins/architect/scripts/check_options_report.py`. Each module is in the standard library.
**Scoring:**
- 1.0 — both hold.
- 0.5 — a third-party import exists.
- 0.0 — the script does not run with `uv run`.

### C5 — The template carries no Lavish code and no external resource [CRITICAL]
**Must be true:** The template has no `window.lavish`, no `<script src=`, no `<link rel="stylesheet" href=`, and no `http` value in any `src=` or `href=` outside plain text links in the evidence section. Its inline script parses, and the copy handler uses `navigator.clipboard` inside a `try` with a fallback.
**Evidence to check:**
- `grep -n "lavish" <template>` prints nothing.
- Extract each inline `<script>` body to a temp file and run `node --check <file>`. Expect exit 0.
- Read the copy handler. It must catch a clipboard failure.
**Scoring:**
- 1.0 — all hold.
- 0.5 — the script parses but the handler has no fallback.
- 0.0 — any Lavish reference, any external resource, or a syntax error.

### C6 — The design system file is unchanged and the report is self-contained
**Must be true:** `assets/design-system.css` has no change. The template inlines the design-system CSS and its own extension CSS in `<style>`. It adds `white-space: nowrap` to tags and ID cells.
**Evidence to check:**
- `git diff --stat -- plugins/architect/skills/architecture/assets/design-system.css` prints nothing.
- `grep -c "<style" <template>` is at least 1, and `grep -n "white-space: *nowrap" <template>` has a hit.
**Scoring:**
- 1.0 — all hold.
- 0.5 — the CSS file is unchanged but `nowrap` is missing.
- 0.0 — the design-system file changed or the template links a stylesheet.

### C7 — The template teaches the structure
**Must be true:** The template has placeholders and one worked example for an inquiry row, a direction block with an options table, a decision form, and the evidence `<details>`. Confidence cells use only the three allowed values. Prose follows `ste-writing`.
**Evidence to check:**
- Read the template for `row-F1`, `dir-F1`, a `form.q`, and four `<details>` elements.
- `python3 plugins/architect/shared/skills/ste-writing/ste-lint.py --mode flavored <(sed 's/<[^>]*>//g' <template>)` prints a score. Record it. A score above 3 violations per 100 words scores 0.5.
**Scoring:**
- 1.0 — all four elements exist and the lint score is 3 or lower.
- 0.5 — all four elements exist and the lint score is above 3.
- 0.0 — an element is missing.

## Weights

C1 20%, C2 25%, C3 15%, C4 5%, C5 20%, C6 5%, C7 10%.
