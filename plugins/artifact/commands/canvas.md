---
title: "Artifact: Draw a Design Canvas"
status: active
type: command
last_verified: 2026-10-08
---

# Artifact: Draw a Design Canvas

Draws one design as a tldraw canvas. The canvas has five zones: Why (with a
before/after picture), Landscape, Flow, Structure, and Contract. The two
rendered diagrams, level 2 and level 3, sit to the right of the zones. The
result is a `.tldraw` file in the design folder.

Invoke the `cobuilder-artifacts` skill in canvas mode, forwarding any arguments
the user supplied after `/artifact:canvas`
(`--design <name|path>`, `--repo <path>`, `--redraw`, `--no-images`,
`--no-review`):

```
Skill("cobuilder-artifacts", args="canvas $ARGUMENTS")
```

## Requirements

- The `tldraw-offline` skill and subagent must be installed. This plugin does
  not ship them. The command stops and says so if they are missing.
- The tldraw Desktop app must be running.
- The design folder must hold `goal.json`. `narrative.json`, `intent.json` and
  `diagrams/` improve the result but are optional.
- The diagram images need `npx` and Google Chrome. Use `--no-images` to skip
  them.

## Options

| Option | Effect |
|---|---|
| `--design <name\|path>` | The design under `docs/architecture/designs/`, or a path to a design folder. Asked for when omitted. |
| `--repo <path>` | The repo that holds the design. Default: the current directory. |
| `--redraw` | Clear and redraw an existing canvas. Without it, the command stops when the `.tldraw` file exists. |
| `--no-images` | Skip the rendered diagram images. |
| `--no-review` | Skip the language review of the card text. |

## Examples

```
/artifact:canvas --design visualisation-queue-routing
/artifact:canvas --design hosted-canvas-ui-redesign --redraw
/artifact:canvas --design visualisation-queue-routing --no-images --no-review
```
