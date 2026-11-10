import type { ReactNode } from "react";

import { Panel, SubHead } from "@/shell/atoms";

import { ChangeFacts, Touched } from "./ChangeFacts";
import { narrationOf, type RowContext } from "./rowContext";
import { ChangeIntentPart, type IntentPart } from "./Sheets";

function whyPanel(ctx: RowContext): ReactNode {
  const intent = ctx.entry.intent;
  return (
    <Panel key="why" title="Why" icon={ctx.icon} absent={ctx.level === null && intent === undefined}>
      {narrationOf(ctx)}
      <ChangeIntentPart intent={intent} part="why" />
    </Panel>
  );
}

function partPanel(ctx: RowContext, part: IntentPart, title: string): ReactNode {
  const intent = ctx.entry.intent;
  return (
    <Panel key={part} title={title} icon={ctx.icon} absent={intent === undefined}>
      <ChangeIntentPart intent={intent} part={part} />
    </Panel>
  );
}

function wherePanel({ entry, icon }: RowContext): ReactNode {
  return (
    <Panel key="where" title="Where it sits" icon={icon}>
      <ChangeFacts entry={entry} />
      <SubHead>Districts touched</SubHead>
      <Touched entry={entry} />
    </Panel>
  );
}

export function intentSections(ctx: RowContext): ReactNode[] {
  return [
    whyPanel(ctx),
    partPanel(ctx, "approach", "Approach"),
    partPanel(ctx, "scope", "Scope and risk"),
    wherePanel(ctx),
  ];
}
