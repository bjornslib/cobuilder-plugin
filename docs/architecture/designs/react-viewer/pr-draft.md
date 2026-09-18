# The viewer becomes three goal-shaped surfaces, built from TypeScript and React

## What this changes

The bundle viewer stops slicing by record type. Its five tabs (Designs, Pull
requests, Decisions, Contexts, Builds) become three surfaces:

| Surface | The question it answers |
|---|---|
| Work | Is this decided, and where has it got to? |
| Flight deck | What does this pull request change, and was it intended? |
| Reference | What decisions and map coverage exist outside any one design? |

The record types do not disappear. They become lenses and filters underneath
the surfaces, and the joins that `data/index.json` already computes are
rendered together instead of rebuilt by the reader across four tabs.

## Why the source language changes too

`plugins/artifact/viewer/index.html` is 4899 lines in one function scope, with
45 `innerHTML` string blocks and no template layer. The three surfaces compose
five pieces of state at once. That is a component problem, not a file-size
problem.

The output does not change shape. Vite and `vite-plugin-singlefile` compile the
sources into the same committed, self-contained `index.html`, so ADR-0001 holds
and `/artifact:publish` keeps working.

This supersedes ADR-0020, which decided a Python concatenation of ordered parts
and was never executed.

## The cost, stated plainly

A contributor now needs Node and npm to change the viewer. This repository has
never required either. No epic removes that cost.

## How it lands

| Epic | Outcome |
|---|---|
| E1 | `export_artifact.py` matches named markers, not incidental literals |
| E2 | `npm run build` produces the committed file, and a test fails on any difference |
| E3 | One typed data layer over the bundle globals and `index.json` |
| E4 | The Work board and the seven design lenses |
| E5 | The Flight deck, at parity with today's viewer |
| E6 | The Reference surface, and the five tabs are removed |
| E7 | A published Artifact renders every surface, under the 16 MiB budget |

E1 is first on purpose. The exporter rewrites the viewer by verbatim string
replacement and hard-errors when a literal moves. A bundled build moves every
one of them.

## What reviewers should look at

1. The Node toolchain decision, which reverses one of ADR-0020's four rejected
   options.
2. The E1 ordering.
3. Whether seven lenses is one too many.
4. ADR-0019's comment anchors, which are computed from the live DOM that React
   now owns.

## Not in scope

No change to what the generation scripts write. No new record type, join, or
schema version. The open pull request gap stays with `inflight-record-store`.
