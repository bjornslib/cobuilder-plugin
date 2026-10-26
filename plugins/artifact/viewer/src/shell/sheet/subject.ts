import type { ContextEntity, EpicDesignEntity, EpicEntity, RubricEntity, SliceEntity } from "@/data/types";

import type { AdrRecord } from "../records";

/** Everything a Sheet can show. One member per record kind. */
export type SheetSubject =
  | {
      kind: "adr";
      /** The decision's own record, or undefined when the bundle lacked it. */
      record: AdrRecord | undefined;
      /** The row the index holds, which is the only source for the title fallback. */
      title: string;
      state: string;
    }
  | {
      kind: "boundary";
      id: string;
      kindLabel: string;
      target: string;
      context: string;
      contextEntity: ContextEntity | undefined;
      detail: Record<string, unknown>;
    }
  | {
      kind: "epic-design";
      doc: EpicDesignEntity;
      epic: EpicEntity;
    }
  | {
      kind: "rubric";
      /** The rubric document the slice was scored against. */
      doc: RubricEntity;
      /** The slice the rubric belongs to, for the sheet's own badges and description. */
      slice: SliceEntity;
    };

export interface RecordSheetProps {
  subject: SheetSubject | null;
  onOpenChange: (open: boolean) => void;
}

export type SubjectOf<K extends SheetSubject["kind"]> = Extract<SheetSubject, { kind: K }>;

export function titleOf(subject: SheetSubject): string {
  if (subject.kind === "adr") return subject.record?.title ?? subject.title;
  if (subject.kind === "boundary") return subject.target;
  return subject.doc.title;
}

export function descriptionOf(subject: SheetSubject): string | null {
  if (subject.kind === "adr" || subject.kind === "boundary") {
    return null;
  }
  if (subject.kind === "rubric") {
    return `The blind acceptance rubric the slice ${subject.slice.n} work was scored against.`;
  }
  return `The Gate 4b technical solution design for epic ${subject.epic.epic_id}.`;
}
