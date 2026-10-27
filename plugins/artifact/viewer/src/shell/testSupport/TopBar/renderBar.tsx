import { render } from "@testing-library/react";
import { vi } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";

import { TopBar, type TopBarProps } from "../../TopBar";

type BarHandlers = Pick<
  TopBarProps,
  "onChooseWork" | "onChooseEpic" | "theme" | "onToggleTheme" | "onOpenWork" | "paneId" | "nameId"
>;

type BarState = Omit<TopBarProps, keyof BarHandlers>;

function barIdentity(): Pick<BarState, "workId" | "workName" | "stage" | "supersededBy"> {
  return { workId: "w", workName: "w", stage: "building", supersededBy: null };
}

function barLists(): Omit<BarState, keyof ReturnType<typeof barIdentity>> {
  return {
    branch: null,
    branches: [],
    supersedes: [],
    ready: true,
    board: false,
    designs: [],
    epics: [],
  };
}

function barHandlers(): BarHandlers {
  return {
    onChooseWork: vi.fn(),
    onChooseEpic: vi.fn(),
    theme: "light",
    onToggleTheme: vi.fn(),
    onOpenWork: vi.fn(),
    paneId: "pane",
    nameId: "name",
  };
}

function barProps(): TopBarProps {
  return { ...barIdentity(), ...barLists(), ...barHandlers() };
}

export function renderBar(over: Partial<TopBarProps>) {
  return render(
    <SidebarProvider>
      <TopBar {...{ ...barProps(), ...over }} />
    </SidebarProvider>,
  );
}
