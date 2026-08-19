# PR Levels - Mermaid Diagram Documentation

## Overview

This directory contains unified Mermaid diagrams for **PR-1 Digital Curator** organized by the three-level structure defined in your `story.json` metadata.

### File Structure
```
docs/pr-diagrams/
├── mermaid-pr-1-levels.mmd   # Main diagrams file (renderable)
└── README.md                  # This documentation
```

## Level Mapping

Per your story.json levels definition:
- **Level 1 (PR Landscape)**: Product overview, systems, platforms
- **Level 2 (Problem & Solution)**: Issue flow, user workflows, edge cases  
- **Level 3 (Architecture)**: Technical design, database schema, components

## Diagram Types by Level

| Level | Primary Purpose | Mermaid Type | Example Location in File |
|-------|----------------|--------------|--------------------------|
| L1 | Product scope visualization | Mindmap | Section after title "# Mermaid Diagrams..." |
| L2 | Workflow & interaction flow | Sequence + State Machine | Search for "sequenceDiagram" blocks |
| L3 | Code structure & data model | Class/ER Diagrams | Locate "classDiagram" and "erDiagram" |

## Usage Instructions

### For Level 1 Mindmap
```bash
# Expected content: product components, high-level architecture, documentation hierarchy
```

### For Level 2 Sequence Diagram  
```bash  
# Expected content: user interactions (copy PII), extension workflow, desktop sync flows, restore patterns, test scenarios
```

### For Level 3 Class/ER Diagrams
```bash
# Expected content: state database schema (Dolt tracking), menu items, clipboard events, PII entities, categories, tests, stakeholders
```

## Key Components to Look for in Your Images

Based on the structure you've defined:

**Level 1 Image Areas:**
- Product ecosystem overview (Desktop + Extension)
- Technical stack elements (Vite/CRXJS)  
- Documentation artifacts tree

**Level 2 Image Areas:**  
- User interaction flows (copy → detect → redact → verify)
- Exclusions logic for different app contexts
- State transitions (Paused ↔ Active)

**Level 3 Image Areas:**
- Database entity boxes with PK/FK annotations
- Component diagrams showing Extension MV3 boundaries
- Synchronization data structures

## Rendering & Validation

All diagrams validated against:
- Official Mermaid syntax from `/.claude/skills/mermaid/references/`  
- Supported chart types match skill definition table
- Code blocks properly wrapped with ```mermaid delimiters

---

**Last updated:** Based on images captured at 3168x1344 (wide panoramic view)
