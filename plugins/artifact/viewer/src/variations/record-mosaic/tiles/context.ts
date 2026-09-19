/**
 * The one object every tile reads. A tile renders it and derives nothing itself, so
 * a verdict is decided in `records.ts` exactly once.
 */

import type { Theme } from "../Mermaid";
import type { BundleModel } from "../records";

export interface TileContext {
  model: BundleModel;
  theme: Theme;
  /** Open another design's mosaic. The tile uses it for a supersession link. */
  openDesign: (id: string) => void;
}
