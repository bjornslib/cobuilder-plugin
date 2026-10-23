# priority.dev

One inbox for all your coding agents. It shows only the sessions that need a human, ranked by your priorities. An advisor answers the rest under rules that you set and can audit.

**Status:** design phase. No code exists yet. This folder is the root of its own project. It lives inside the CoBuilder repository for now.

## Layout

```
priority-dev/
  README.md                     this file
  docs/
    role-models.md              the open-source projects the design borrows from
    design/
      design-overview.md        the high-level design (version 2, partly superseded)
      v0.1-scope.md             the riskiest assumption, the v0.1 lab, and the release ladder
      options-research.md       the technology research behind the choices
      diagrams/                 level-1.mmd, runtime-architecture.svg, v0.1-lab-flow.svg, action-loop.svg
      history/                  the round 2 scope file
      v1/                       the first version, kept as a record
```

The code layout waits for the v0.1 scope decision. The first build is a transcript lab that runs on one Mac with no service.

## Where to start

1. Read `docs/design/design-overview.md` for the pipeline and the parts.
2. Read `docs/design/v0.1-scope.md` for the riskiest assumption and the proposed first build.
3. Read `docs/role-models.md` before you borrow an idea or copy a line from another project.
