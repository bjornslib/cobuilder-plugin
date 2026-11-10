const KIND_LABELS: Array<[RegExp, string]> = [
  [/classdiagram/i, "Classes"],
  [/sequencediagram/i, "Sequence"],
  [/c4container/i, "Container"],
  [/^<svg/i, "Runtime architecture"],
];

/**
 * The drawing at its own size.
 *
 * Mermaid caps the width of most grammars and emits `width="100%"` beside a pixel
 * `max-width` instead of a real width. A drawing laid out inside a 300 px box composes
 * its labels for 300 px and then shrinks to nothing legible under the tile's scale, so
 * the cap becomes the size: the width attribute takes the pixel value the style carried,
 * and the height follows from the viewBox. The cap is set per diagram grammar, and a
 * bundle may carry any grammar, so the drawing is normalised here and not through a
 * config key per kind.
 */
export function uncap(svg: string): string {
  const capped = svg.match(/max-width:\s*([\d.]+)px/);
  if (!capped) return svg;
  return svg.replace(/width="100%"/, `width="${capped[1]}"`).replace(/max-width:\s*[\d.]+px;?/, "");
}

/**
 * Give an authored SVG a pixel size when it has none.
 *
 * The contract for the runtime slot asks for a `viewBox` and no fixed pixel width. The
 * tile and the dialog lay a drawing out at its real size inside a `w-max` box, then
 * scale it. An SVG with a `viewBox` and no `width` has no real size, so that box measures
 * 0 and the drawing is blank. The root tag therefore takes `width` and `height` from the
 * `viewBox`. An SVG that already carries a width or a height stays as it is.
 */
export function sizeFromViewBox(svg: string): string {
  const root = svg.match(/<svg\b[^>]*>/i);
  if (!root || /\s(?:width|height)\s*=/i.test(root[0])) return svg;
  const box = root[0].match(
    /\sviewBox\s*=\s*"\s*-?[\d.]+[\s,]+-?[\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/i,
  );
  if (!box) return svg;
  return svg.replace(root[0], root[0].replace(/<svg\b/i, `<svg width="${box[1]}" height="${box[2]}"`));
}

function grammarLine(source: string): string {
  return (
    source
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line !== "" && !line.startsWith("%%")) ?? ""
  );
}

/**
 * One word for the grammar a source opens with. The word comes from the source's own
 * first line, which is the only place the kind is recorded.
 *
 * A line that names the drawing is not the grammar line. An authored source may open
 * with a `%%` comment that names the drawing for a human. The reading skips a blank
 * line and a `%%` comment line, and takes the first line that is neither. A source of
 * comments alone falls through to "Diagram".
 */
export function labelFor(source: string): string {
  const first = grammarLine(source);
  const kind = KIND_LABELS.find(([pattern]) => pattern.test(first));
  return kind?.[1] ?? (first || "Diagram");
}
