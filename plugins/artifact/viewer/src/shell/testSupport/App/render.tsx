import { render } from "@testing-library/react";

import Shell from "../../App";
import { at } from "./queries";

export function renderAt(hash: string) {
  at(hash);
  return render(<Shell />);
}
