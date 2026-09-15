# Program design: Gate state resolution

## Files

| File | Change |
|---|---|
| `plugins/artifact/scripts/build_builds_view.py` | Add `is_resolved()`. Give `current_doc()` the filtered document map, and let it return no document. Name a title and an ask note for the Gate 2b document. |
| `.cobuilder-architect/self/pages/builds-view.html` | Add the `na` gate treatment. Guard the crumb against a missing document. Key the approval prompt on the gate, and state when a gate holds no document. Emit an empty ask gate when nothing waits. |
| `plugins/artifact/viewer/index.html` | Give an `n/a` gate its own card class, its own pill class, and the words "Not applicable". Count approved gates in the header. |
| `tests/test_build_builds_view.py` | Cover the four shapes of `current_doc()`, the `is_resolved()` predicate, and the summary line. |
| `tests/test_viewer_modes.py` | Cover the `n/a` treatment and the header count. |

`shared/build_index.py` needs no change. It already projects the state, the
document, and the document kind, and slice 7 of `interaction-design-gate`
already added the `interaction` kind.

## Types & signatures

```python
# plugins/artifact/scripts/build_builds_view.py

TITLES = {
    # Was: no entry. GATE_DOCS named "interaction-design.md" for gate 2b
    # without a title, so the rail printed the text "undefined".
    "interaction-design.md": "Interaction design",
    # ...the existing entries...
}

ASK_NOTES = {
    # Was: no entry. A page that opened on a pending Gate 2b printed an
    # empty approval prompt.
    "2b": "Approval moves to Gate 3 — program design — where the files, "
          "the type signatures, and the test plan are written before any "
          "implementation exists.",
    # ...the existing entries...
}


def is_resolved(state: str) -> bool:
    """A resolved gate needs no answer: it reads APPROVED or n/a.

    One name for the test, because two call sites asked the same question
    and one of them asked it inline.
    """
    return state.startswith("APPROVED") or state.startswith("n/a")


def current_doc(
    gates: list[dict], present: dict[str, list[str]]
) -> tuple[str, str | None, bool]:
    """The gate the page opens on, and the document to show with it.

    An open gate is the first gate that still needs an answer. The page
    shows that gate's first document when the plan holds it, and no
    document when it does not.

    Every gate resolved means nothing waits. The page then shows the last
    gate that holds a document.

    `present` is the document map filtered to the files the plan holds, so
    a returned document always exists on disk.

    Returns the gate, its document or None, and whether the gate waits for
    an answer.
    """
    for g in gates:
        if not is_resolved(g["state"]):
            docs = present.get(g["n"], [])
            return g["n"], (docs[0] if docs else None), True
    for g in reversed(gates):
        docs = present.get(g["n"], [])
        if docs:
            return g["n"], docs[0], False
    return (gates[-1]["n"] if gates else "1"), None, False
```

```python
# render(), inside the fence rewrite loop.

gate, doc, pending = current_doc(payload["gates"], present)

# Was: titles = {k: v for k, v in TITLES.items() if k in payload["docs"]}
# An unlisted document vanished from the map, so the rail printed the
# text "undefined" for it. Every held document now carries a title.
titles = {k: TITLES.get(k, k) for k in payload["docs"]}

# Was: f'var cur={{gate:"{gate}",doc:"{doc}"}};'
# A missing document must be null, not the text "None".
lines[i] = f"var cur={{gate:{json.dumps(gate)},doc:{json.dumps(doc)}}};"

# Was: json.dumps(gate). The ask block keys on the gate, so an empty ask
# gate is what tells the page that nothing waits.
lines[i] = f"var ASKGATE={json.dumps(gate if pending else '')};"

# Was: doc if pending else "". A missing document must not fire the
# "rendered from the markdown" note, which names a path.
lines[i] = f"var ASKDOC={json.dumps(doc if (pending and doc) else '')};"

# Was: f'buildRail(); go("{gate}","{doc}");'
lines[i] = f"buildRail(); go({json.dumps(gate)}, {json.dumps(doc)});"

# Was: "'awaiting approval' if pending else 'all gates approved'".
# An n/a gate is not an approved gate, and the word "approved" claimed
# something the plan had not said.
f"{'awaiting approval' if pending else 'no gate awaiting an answer'}"
```

```javascript
// .cobuilder-architect/self/pages/builds-view.html

/* Was: return s.indexOf('approved')===0?'done'
                     :s.indexOf('in progress')===0?'now':'todo';
   An "n/a" gate fell to 'todo', which drew it as not started. */
function cls(g){var s=g.state.toLowerCase();
  return s.indexOf('approved')===0?'done'
       :s.indexOf('n/a')===0?'na'
       :s.indexOf('in progress')===0?'now':'todo';}

/* go(): a missing document must read as a name, not as the text "null". */
var path=doc?((PATHS&&PATHS[doc])||doc):('Gate '+gate);

/* go(): the prompt answers a gate, and a gate with no document has
   nothing to approve. */
var have=!!(doc&&D[doc]);
if(ASKGATE&&gate===ASKGATE&&have) ask='<div class="ask">...';
if(ASKGATE&&gate===ASKGATE&&!have) note+='<div class="note">This gate holds no document yet...</div>';
```

```css
/* .cobuilder-architect/self/pages/builds-view.html — the closed treatment. */
.gate.na .dot{background:var(--sunk);border-color:var(--line);color:var(--ink3)}
.gate.na .stt{color:var(--ink3)}
.pill.na{background:var(--sunk);color:var(--ink3)}
```

```javascript
// plugins/artifact/viewer/index.html

/* Was: const statusClass = isApproved ? 'is-approved'
                         : (isCurrent ? 'is-current' : 'is-planned');
   An "n/a" gate fell to 'is-planned' and read as not started. */
const isNa = /^n\/a/i.test((g.state || '').trim());
const statusClass = isApproved ? 'is-approved'
                  : isNa ? 'is-na'
                  : (isCurrent ? 'is-current' : 'is-planned');

/* Was: isApproved ? 'ok' : (isCurrent ? 'now' : 'wait') */
const pillClass = isApproved ? 'ok' : isNa ? 'na' : (isCurrent ? 'now' : 'wait');

/* Was: isApproved ? `Approved on ...` : 'In progress' */
const gateDesc = isApproved ? `Approved on ${...}` : isNa ? 'Not applicable' : 'In progress';

/* Was: const totalGates = gateRails.reduce((sum, r) => sum + r.gates.length, 0);
   The label then read "N Gates Approved" over a count of every gate. */
const totalGates = gateRails.reduce((sum, r) => sum + r.gates.length, 0);
const approvedGates = gateRails.reduce((sum, r) =>
  sum + r.gates.filter(g => (g.state || '').trim().toUpperCase().startsWith('APPROVED')).length, 0);
// label: `${approvedGates} of ${totalGates} Gates Approved`
```
