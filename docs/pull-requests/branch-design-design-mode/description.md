# Branch design-design-mode

## Problem

The plugin captures author intent at submit time, after the change exists. Nothing captures it at design time, when the engineer still holds the alternatives, the constraints, and the doubts. Generate mode then reconstructs intent from merged code.

Submit mode's intent block already has the right shape. The bundle already holds districts and ADRs. The architecture skill holds the corpus. Those parts were not connected, and the lite ADR store no longer had a premise once architecture modes became self-only.

## Why this approach

Merge archkit main into this plugin, rename it cobuilder-architect, put authored source in docs/, and add /cobuilder-architect:design. One design joins N pull requests through an epics array and the branch name design/<name>[/<epic-slug>]. Submit loads that design's intent instead of interviewing cold.

## Alternatives considered

- **Put design mode in archkit instead** — rejected because The interview, bundle, diagrams, and viewer live here. archkit's contribution is one skill call.
- **Keep archkit a soft, optional dependency** — rejected because A design mode whose corpus is optional degrades into a chat.
- **Ask which options they rejected, as an interview question** — rejected because A rejected option is an outcome of explore and challenge, not an input.
- **Mint a synthetic PR key so a design enters story.json** — rejected because Four readers require a real integer pr.
- **Keep a lite JSON ADR store next to full markdown** — rejected because Two stores drift. Architecture modes are self-only, so the foreign-repo premise is gone.
- **Leave designs and PR documents in exports/** — rejected because exports/ is the publish pipeline. Authored intent belongs in docs/.

## Out of scope

- opening a pull request from design mode
- pushing a branch or any other remote action from design mode
- element-level annotation or a send-to-agent channel in the viewer
- renaming the GitHub repository (the plugin and bundle directory are renamed; GitHub redirects)
- deciding the fate of the archkit repository
- foreign-repo architecture analysis
- epic decomposition (cobuilder-factory G1)

## Risks

- a 390-file PR mixes rename, merge, store move, and design mode, so a reviewer cannot isolate one decision
- ADR-0004 still says ste-writing is off the install surface
- a toothless challenge stage leaves an ADR with one option
- the designs view ships thinner than the PR view unless the three-level chrome lands

## How this was tested

verify_bundle on the self bundle and both fixtures. build_adrs.py and build_designs.py each run twice. validate_decision_state.py over docs/architecture/adr/. Design resolve on this branch hits docs/architecture/designs/design-mode/.

## Where to focus

- the challenge gate in design-mode.md
- submit's branch-name lookup and per-epic drift
- authored source in docs/ versus the bundle projection
- the Designs | Pull requests switcher and the three-level design view

The author flagged these parts as not fully understood:

- whether a semantic duplicate-design search is accurate enough
- how much the architecture skill slows a plugin install
- whether GitHub marketplace redirects cover every existing prodyssey install

---

_Authorship: agent-assisted._
