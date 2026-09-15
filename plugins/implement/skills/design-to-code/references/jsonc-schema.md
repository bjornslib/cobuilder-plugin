---
title: "JSONC Schema Reference"
type: reference
status: active
last_verified: 2026-09-14
---

# JSONC Schema Reference

Complete schema for design specifications.

## Root Structure

```jsonc
{
  // Required metadata
  "metadata": { ... },

  // Page/component layout
  "layout": { ... },

  // Major content sections
  "sections": [ ... ],

  // Detailed component specs
  "components": [ ... ],

  // Color token mappings
  "colors": { ... },

  // Typography definitions
  "typography": { ... },

  // State machines, transitions, gating, defaults, timing, and the
  // cross-component contracts
  "interactions": { ... },

  // Accessibility specs
  "accessibility": { ... },

  // State management (optional)
  "stateManagement": { ... }
}
```

## Metadata

```jsonc
{
  "metadata": {
    "name": "ComponentName",           // PascalCase component name
    "description": "Short description of purpose",
    "route": "/path/to/route",         // Target route in app
    "version": "1.0",
    "source": {
      "tool": "Figma | GoogleStitch | Screenshot | GeminiImage",
      "hasHtmlCss": true | false,               // true when Stitch HTML/CSS available
      "stitchProjectId": "optional-project-id",  // For edit_screens iteration
      "stitchScreenId": "optional-screen-id",    // For edit_screens iteration
      "codeFile": "path/to/section-code.html"    // When hasHtmlCss=true
    }
  }
}
```

## Layout

```jsonc
{
  "layout": {
    "type": "page | component | modal | drawer",
    "structure": {
      "container": "min-h-screen bg-background",
      "content": "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8",
      "grid": "grid grid-cols-1 lg:grid-cols-3 gap-6"
    },
    "responsive": {
      "sm": "Single column, stacked layout",
      "md": "2-column grid for main areas",
      "lg": "Full 3-column layout with sidebar",
      "xl": "Centered with max-width constraint"
    }
  }
}
```

## Sections

```jsonc
{
  "sections": [
    {
      "id": "unique-section-id",
      "description": "What this section contains",
      "layout": "flex flex-col gap-4",
      "gridSpan": "lg:col-span-2",        // Optional grid positioning
      "components": ["ComponentA", "ComponentB"],
      "responsive": {
        "sm": "Stack vertically",
        "lg": "Side by side"
      }
    }
  ]
}
```

## Components

```jsonc
{
  "components": [
    {
      "name": "MetricCard",
      "description": "Displays a single KPI with trend",
      "instances": 4,                     // How many in the UI
      "props": {
        "title": "string",
        "value": "string | number",
        "trend": "{ direction: 'up' | 'down', value: string }",
        "icon": "LucideIcon"
      },
      "structure": {
        "container": "bg-card rounded-lg border border-border p-6",
        "iconWrapper": "w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4",
        "icon": "w-5 h-5 text-primary",
        "title": "text-sm text-muted-foreground",
        "value": "text-3xl font-bold text-foreground mt-1",
        "trend": {
          "wrapper": "flex items-center gap-1 mt-2 text-sm",
          "up": "text-green-600 dark:text-green-400",
          "down": "text-destructive"
        }
      },
      "darkMode": {
        "container": "dark:bg-card dark:border-border",
        "iconWrapper": "dark:bg-primary/20"
      },
      "sampleData": [
        {
          "title": "Total Calls",
          "value": "1,247",
          "trend": { "direction": "up", "value": "+12.5%" },
          "icon": "Phone"
        }
      ],

      // The state machine for this component. Section 3.2 of the interaction
      // design specification. Cover the whole vocabulary, and mark a state
      // that does not apply as not applicable.
      "interaction": {
        "states": [
          // Exactly one row carries "initial": true.
          { "name": "default",       "class": "default",      "initial": true,  "timerArming": null },
          { "name": "hover",         "class": "hover",        "initial": false, "timerArming": null },
          { "name": "focus-visible", "class": "focusVisible", "initial": false, "timerArming": null },
          { "name": "pressed",       "class": "pressed",      "initial": false, "timerArming": null },
          { "name": "selected",      "class": "selected",     "initial": false, "timerArming": null },
          { "name": "disabled",      "class": "disabled",     "initial": false, "timerArming": null },
          { "name": "loading",       "class": "loading",      "initial": false,
            // Name the start event and the reset event. Never arm a timer on
            // mount when the countdown belongs to a person's action.
            "timerArming": { "starts": "on fetch request", "resets": "on fetch settle" } },
          { "name": "error",         "class": "error",        "initial": false, "timerArming": null },
          { "name": "empty",         "class": "empty",        "initial": false, "timerArming": null },
          { "name": "transient",     "class": "transient",    "initial": false,
            "timerArming": { "starts": "on copy action", "resets": "after --hold-ack" } }
        ]
      }
    }
  ]
}
```

### State vocabulary

Use these ten names. Do not invent a synonym for one of them.

| Name | Meaning |
|------|---------|
| `default` | At rest. No pointer, no focus, no selection. |
| `hover` | The pointer is over the control. |
| `focus-visible` | The control has keyboard focus. |
| `pressed` | The pointer is down on the control. |
| `selected` | The control represents the current choice. |
| `disabled` | The control is visible and inert. |
| `loading` | The control is waiting on work. |
| `error` | The control reports a fault. |
| `empty` | The control holds no content. |
| `transient` | The control shows a temporary change. |

## Colors

```jsonc
{
  "colors": {
    // Map each role to a token from the target project. Read the token
    // definitions from the project, usually in app/globals.css,
    // styles/tokens.css, or tailwind.config.*.
    "primary": {
      "usage": "Main CTAs, active states, brand elements",
      "token": "bg-primary text-primary-foreground",
      "extracted": "#1E3A8A"   // The value read from the design. Record only.
    },
    "secondary": {
      "usage": "Secondary buttons, links",
      "token": "bg-secondary text-secondary-foreground",
      "extracted": "#3B82F6"
    },
    "muted": {
      "usage": "Backgrounds, disabled states",
      "token": "bg-muted text-muted-foreground"
    },
    "destructive": {
      "usage": "Errors, delete actions",
      "token": "bg-destructive text-destructive-foreground"
    },
    // Custom accents for charts/status
    "accentColors": {
      "success": "#22C55E",
      "warning": "#F59E0B",
      "chart1": "var(--chart-1)",
      "chart2": "var(--chart-2)"
    }
  }
}
```

## Typography

```jsonc
{
  "typography": {
    "headings": {
      "h1": "text-3xl font-bold tracking-tight",
      "h2": "text-2xl font-semibold",
      "h3": "text-xl font-medium",
      "h4": "text-lg font-medium"
    },
    "body": {
      "default": "text-base text-foreground",
      "small": "text-sm text-muted-foreground",
      "label": "text-sm font-medium"
    },
    "special": {
      "metric": "text-3xl font-bold tabular-nums",
      "badge": "text-xs font-medium uppercase tracking-wide"
    }
  }
}
```

## Interactions

The `interactions` block holds everything the interface does over time. It maps
directly onto the interaction design specification from Step 1.

| Interaction design section | JSONC key |
|---------------------------|-----------|
| 2.3 Declared Defaults | `interactions.defaults` |
| 3.2 Component States | `components[].interaction.states` |
| 3.3 Visibility Gating | `interactions.visibility` |
| 4.1 Transition Table | `interactions.transitions` |
| 4.2 Timing Tokens | `interactions.timingTokens` |
| 11.1 Layering | `interactions.layering` |
| 11.2 Hit Targets | `interactions.hitTargets` |
| 11.3 Scroll Ownership | `interactions.scrollOwnership` |

```jsonc
{
  "interactions": {
    // The shared class dictionary. One entry per state name. A component
    // override lives in components[].interaction.states.
    "stateClasses": {
      "default": "bg-primary text-primary-foreground",
      "hover": "hover:bg-primary/90",
      "focusVisible": "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "pressed": "active:bg-primary/80",
      "selected": "border-primary ring-1 ring-primary",
      "disabled": "disabled:opacity-50 disabled:cursor-not-allowed",
      "loading": "opacity-70 pointer-events-none",
      "error": "border-destructive text-destructive",
      "empty": "border-dashed border-muted-foreground/40",
      "transient": "animate-in fade-in"
    },

    // One row per edge of the state machine. Section 4.1.
    // durationToken MUST name a key in timingTokens.
    "transitions": [
      {
        "trigger": "pointer enters the card",
        "from": "default",
        "to": "hover",
        "durationToken": "--motion-press",
        "easing": "ease-out",
        "guard": null,
        "reset": "pointer leaves"
      },
      {
        "trigger": "pointer down held for --hold-drag",
        "from": "default",
        "to": "dragging",
        "durationToken": "--motion-drag",
        "easing": "ease-out",
        "guard": "the pointer stays down for --hold-drag",
        "reset": "a pointer lift before --hold-drag cancels"
      }
    ],

    // What must be true before a control exists at all. Section 3.3.
    // Gating is not disabling. A gated control is absent from the DOM.
    "visibility": [
      {
        "control": "InviteButton",
        "rendersWhen": "roomState === 'connected'",
        "removedWhen": "roomState !== 'connected'"
      }
    ],

    // The starting value of every setting with more than one option.
    // Section 2.3. A dark mockup does not make dark the default.
    "defaults": {
      "theme": "light",
      "panelState": "collapsed",
      "scope": "default"
    },

    // Declare every duration once. No component writes a literal duration.
    "timingTokens": {
      "--motion-press": "100ms",
      "--motion-drag": "100ms",
      "--motion-panel": "180ms",
      "--motion-modal-in": "150ms",
      "--motion-modal-out": "100ms",
      "--hold-drag": "150ms",
      "--hold-status": "600ms",
      "--hold-ack": "1800ms",
      "--motion-skeleton": "1500ms"
    },

    // One named scale. Every floating surface names a layer. Section 11.1.
    "layering": {
      "chrome":  { "token": "--z-chrome",  "surfaces": ["AppBar", "ToolRail"] },
      "panel":   { "token": "--z-panel",   "surfaces": ["AgentPanel", "StylePanel"],
                   "collisionRule": "panels never overlap. The second one repositions." },
      "overlay": { "token": "--z-overlay", "surfaces": ["Dialog", "Popover", "Toast"],
                   "collisionRule": "above all panels. Dims the surface below." }
    },

    // The element that must receive the pointer event. Section 11.2.
    // Any ancestor may set pointer-events: none. A control that inherits it
    // stays visible, stops responding to a real pointer, and still passes a
    // synthetic .click() in a test. Restore the property on the control.
    "hitTargets": [
      {
        "control": "AudioCapsuleChip",
        "eventElement": "the pill root, not the arrow icon",
        "clickableBounds": "the whole pill",
        "ancestorPointerEvents": "none",
        "restorePointerEvents": "auto"
      }
    ],

    // The surface that owns the wheel and drag gesture in each overlapping
    // region. Section 11.3. Use overflow: clip. An overflow: hidden container
    // becomes a scroll container and swallows the gesture.
    "scrollOwnership": [
      {
        "region": "agent panel over the canvas",
        "owner": "AgentPanel",
        "other": "the canvas does not pan or zoom",
        "overflow": "clip"
      }
    ]
  }
}
```

## Accessibility

```jsonc
{
  "accessibility": {
    "landmarks": {
      "main": "role='main'",
      "navigation": "role='navigation' aria-label='Main navigation'",
      "aside": "role='complementary'"
    },
    "labels": {
      "metricsSection": "aria-label='Key performance metrics'",
      "activityFeed": "aria-live='polite' aria-label='Recent activity'"
    },
    "keyboard": {
      "focusOrder": "Follow visual layout order",
      "skipLinks": "Include skip to main content",
      "escapeClose": "Escape closes modals/drawers"
    },
    "screenReader": {
      "statusAnnounce": "aria-live='polite' for status changes",
      "loadingAnnounce": "aria-busy='true' during loading"
    }
  }
}
```

## State Management

```jsonc
{
  "stateManagement": {
    // Only if component needs Zustand
    "required": true | false,
    "store": "useAppStore from @/stores",
    "slices": {
      "existing": ["uiSlice", "workflowSlice"],
      "new": {
        "name": "voiceAgentSlice",
        "state": {
          "agents": "Map<string, AgentStatus>",
          "activeCallsCount": "number"
        },
        "actions": ["fetchAgents", "updateStatus"]
      }
    },
    "realtime": {
      "source": "SSE endpoint /api/voice/events",
      "events": ["agent_status", "call_completed"]
    }
  }
}
```

## Complete Example Structure

See `examples/voice-dashboard.jsonc` for a complete implementation.

## Validation Rules

When generating JSONC, ensure:

**Structure and style**

1. **All Tailwind classes exist** in the design system
2. **No hardcoded hex values** in structure fields
3. **Dark mode variants** for all color-dependent classes
4. **Responsive classes** at appropriate breakpoints
5. **Component props** are TypeScript-valid types
6. **Icons** use lucide-react names
7. **Sample data** matches prop types

**States and transitions**

8. **Every interactive component** carries an `interaction` block
9. **Exactly one state per component** carries `"initial": true`
10. **Every state with a countdown** names both `starts` and `resets` in `timerArming`
11. **Every `durationToken`** names a key in `interactions.timingTokens`. No literal duration appears anywhere in the file.
12. **Every transition** names a `from` state and a `to` state

**Cross-component contracts**

13. **Every control with a conditional existence** appears in `interactions.visibility`
14. **Every multi-valued setting** appears in `interactions.defaults`
15. **Every floating surface** names a layer in `interactions.layering`
16. **Every control** appears in `interactions.hitTargets`, and sets `restorePointerEvents` when an ancestor sets `pointer-events: none`
17. **Every overlapping region** appears in `interactions.scrollOwnership`, with `overflow` set to `clip` rather than `hidden`
