/**
 * The smoke test for the component runner.
 *
 * It proves that a `.tsx` source under `src/` renders in jsdom, that the `@` alias
 * resolves, and that the runner reports a pass. It is not a claim about
 * `StageBadge` itself.
 *
 * `src/App.tsx:131` supplies the tooltip context for the real app, so this test
 * supplies it the same way, at the same delay.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";

import { StageBadge } from "./StageBadge";

afterEach(cleanup);

describe("StageBadge", () => {
  it("renders the stage it is given", () => {
    render(
      <TooltipProvider delayDuration={150}>
        <StageBadge stage="approved" />
      </TooltipProvider>,
    );

    expect(screen.getByText("approved")).toBeTruthy();
  });
});
