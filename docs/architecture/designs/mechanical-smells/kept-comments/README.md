# Kept why-comments

This folder records the comments that slices 6 and 7 of epic E1 kept. The sensor flags
every `//` comment of 10 or more characters, and every block or JSDoc comment of 15 or
more characters. A comment that explains why can never reach zero findings, so the
engineer chose to keep those comments in the code and to record them here (2026-10-27).

Each slice adds one or more files in this folder, one per group of source folders. A file
holds one markdown table with these columns:

| File | Kept | Original |
|---|---|---|
| `src/shell/model/routes.ts` | 7 | 8 |

- **File** is the path under `plugins/artifact/viewer/`.
- **Original** is the number of `non-essential-comment` findings in that file before the
  review of its slice.
- **Kept** is the number of comments that explain why and stay in the file. It is at most
  Original. A file with no row has no kept comment, so the sensor must report zero for it.

A test reads every table in this folder. It fails when a file has more findings than its
Kept value, or when a Kept value is above its Original value.
