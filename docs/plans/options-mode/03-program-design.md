# Program Design: architect options mode

## Files

| File | Action | Why |
|---|---|---|
| `plugins/architect/commands/options.md` | create | dispatch line and the list of what the mode writes |
| `plugins/architect/skills/architecture/SKILL.md` | edit | `### Options Mode`, frontmatter, intro, invocation, layout, Quick Reference |
| `plugins/architect/skills/architecture/references/options-mode.md` | create | full procedure, stages 0 to 6 |
| `plugins/architect/skills/architecture/references/reports/options-report-TEMPLATE.html` | create | report skeleton with placeholders and one worked example |
| `plugins/architect/scripts/check_options_report.py` | create | structure validator |
| `tests/test_options_report.py`, `tests/fixtures/options_report/*.html` | create | good and broken fixtures |
| `tests/test_commands.py` | edit | seven modes, and command files equal the declared modes |
| `DDD-VOCABULARY.md` | edit | `Inquiry` entry |
| `plugins/architect/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | edit | version 0.7.0, description |
| `README.md`, `CLAUDE.md`, `plugins/cobuilder-full-lifecycle/skills/cobuilder-full/SKILL.md` | edit | mode count and lists |

## Types & signatures

```python
# plugins/architect/scripts/check_options_report.py  (PEP 723, no dependencies)
ANCHORS: tuple[str, ...]          # summary, current, flow, inquiries, directions,
                                  # proposed, gaps, order, decide, evidence
CONFIDENCE: frozenset[str]        # {"Verified", "ADR only", "Hypothesis"}

@dataclass(frozen=True)
class Result:
    check: int                    # 1..9
    severity: str                 # "error" | "warning"
    message: str

def check_report(html: str) -> list[Result]: ...
def main(argv: list[str] | None = None) -> int: ...   # 0 when no error result, else 1
```

Output: one line per result, `ERROR check N: message` or `WARN check N: message`.

## Call stack

`/architect:options` → `commands/options.md` → `Skill("architecture", "options ...")` → `references/options-mode.md` stage 0 to 6 → copy template → `check_options_report.py <report>` → print path and inquiry IDs.

## Test plan

- `tests/test_commands.py`: the dispatch of `options.md`, the seven declared modes, and command files equal the declared modes.
- `tests/test_options_report.py`: the template and a good fixture exit 0. One broken fixture for each error check exits 1 with the check number in the output. A report with only a long SVG text exits 0 and prints a warning.
- Existing manifest and vocabulary tests stay green.

## Least confident decisions

- The exact set of ten anchors and the `#inquiries` rename come from the brief and the reference report. The reference report is outside this repo and may drift.
- The validator parses HTML with `html.parser`. A malformed fixture may parse in a way the check does not expect.
- Whether the viewer files `model.ts` and `sections.tsx` count architect modes with a "six" is not yet checked.
