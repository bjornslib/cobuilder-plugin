import type { StoryAssessmentAnswer } from "@/data/bundle";
import { Box, StateBadge, SubHead, TextList, toneForVerdict } from "@/shell/atoms";

const ANSWER_TEXT = "m-0 max-w-[92ch] font-serif text-[16px] leading-[1.6] text-foreground";

function Duplicates({ items }: { items: unknown[] }) {
  return (
    <Box label={`Duplicates · ${items.length}`} tone="note">
      <TextList items={items.map((entry) => JSON.stringify(entry))} />
    </Box>
  );
}

function AnswerNotes({ answer }: { answer: StoryAssessmentAnswer }) {
  const duplicates = Array.isArray(answer.duplicates) ? answer.duplicates : [];
  return (
    <>
      {answer.constraint_introduced ? <Box label="Constraint introduced" tone="note">{answer.constraint_introduced}</Box> : null}
      {answer.evidence ? <Box label="Evidence" tone="note">{answer.evidence}</Box> : null}
      {duplicates.length > 0 ? <Duplicates items={duplicates} /> : null}
    </>
  );
}

function AnswerVerdict({ verdict }: { verdict: string }) {
  return (
    <span>
      <StateBadge word={verdict} tone={toneForVerdict(verdict)} />
    </span>
  );
}

export interface AnswerBlockProps {
  title: string;
  answer: StoryAssessmentAnswer | undefined;
}

/** One of the assessment's three answers: what it says, and what it stands on. */
export function AnswerBlock({ title, answer }: AnswerBlockProps) {
  if (!answer?.answer) return null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SubHead anchor>{title}</SubHead>
      {answer.verdict ? <AnswerVerdict verdict={answer.verdict} /> : null}
      <p className={ANSWER_TEXT}>{answer.answer}</p>
      <AnswerNotes answer={answer} />
    </div>
  );
}
