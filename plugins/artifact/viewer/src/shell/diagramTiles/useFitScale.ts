import { useLayoutEffect, useRef, useState } from "react";

type Box = HTMLElement | null;
type SetScale = (scale: number) => void;

function observeFit(box: Box, drawing: Box, setScale: SetScale): (() => void) | undefined {
  if (!box || !drawing) return undefined;
  const measure = () => {
    const natural = drawing.offsetWidth;
    if (natural > 0) setScale(Math.min(1, box.clientWidth / natural));
  };
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(box);
  return () => observer.disconnect();
}

/*
 * The box is the tile's box, which is the width the miniature has to fit. The drawing ref
 * is the untransformed holder of the drawing. Its `offsetWidth` is the drawing's own
 * width, because `offsetWidth` is a layout measure and an ancestor's `transform` does not
 * change it. `getBoundingClientRect` would report the scaled width instead.
 *
 * "Fit" is the body's width over the drawing's own width. It is measured and not assumed,
 * because a dialog is 92 vw and a level's drawing can be any width at all.
 */
export function useFitScale<B extends HTMLElement, D extends HTMLElement>(svg: string, initial: number) {
  const boxRef = useRef<B | null>(null);
  const drawingRef = useRef<D | null>(null);
  const [scale, setScale] = useState(initial);
  useLayoutEffect(() => {
    if (svg === "") return undefined;
    return observeFit(boxRef.current, drawingRef.current, setScale);
  }, [svg]);
  return { boxRef, drawingRef, scale };
}
