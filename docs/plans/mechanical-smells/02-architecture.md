# Architecture: Clear the viewer's habit-hooks findings (mechanical-smells)

## Fit

The work sits in the `artifact` context, under `plugins/artifact/viewer/src/`.
The viewer has four layers. The data layer in `data/` loads and joins the bundle.
The model layer in `shell/model.ts` holds routes, keys, and pure helpers. The
render layer holds the atoms, the sections, the panels, and the change surface.
The shell holds `App.tsx`, the sheet, the drawer, the rail, and the top bar.
The committed `plugins/artifact/viewer/index.html` is the build output, and a
test rebuilds it from source.

Two other files change. `.habit-hooks/config.toml` already excludes the generated
`components/ui` and `components/smoothui` folders. The catalog at
`docs/architecture/designs/mechanical-smells/findings-catalog.md` records the
scan, the clusters, and the verdicts.

## Endpoints

none

## Data

No table or bundle schema changes. The catalog is a Markdown file. The sensor
config is a TOML file.

## Flow

1. The engineer picks the next ready slice from the tracker.
2. RED writes a check that runs `habit-sensors --file <path>` for each file of
   the slice. The check fails while any finding remains.
3. GREEN splits the files by concern. Each moved unit is re-exported from the
   old file under its old name.
4. The vitest suite, the build, and the byte-identical rebuild test run. The
   sensor check passes.
5. VALIDATE scores the slice against the blind rubric.
6. The comment slices add a reviewer sample. The reviewer counts deleted
   comments that explained why.

## External

`habit-sensors` (habit-hooks v1.5.0), with `eslint`, `knip`, `ruff`, and `jscpd`
under it. `vitest` and `vite` run the viewer tests and the build. No API, no
environment variable, and no webhook.
