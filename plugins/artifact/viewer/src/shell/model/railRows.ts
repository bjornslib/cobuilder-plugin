/*
 * The change's own four rows, and the table from a row's word to the bundle's level key.
 * This file reads them from `../change/sections` and never copies them: two lists of the
 * same four names would let the row the rail opens and the row the pager renders
 * disagree.
 */
import { CHANGE_LABEL, CHANGE_KEYS, CHANGE_LEVEL_KEY, type ChangeKey } from "../change/sections";
import type { ChangeLevel } from "../change/levels";
import { PROGRAM_LABEL, SHARED_KEYS, type ProgramKey, type SharedKey } from "./accounts";
import { changeCount, programCount } from "./counts";
import { changeHref, programHref } from "./routes";
import type { RailReading, RailRow } from "./railTypes";

function sharedOf(section: string): SharedKey | null {
  return (SHARED_KEYS as readonly string[]).includes(section) ? (section as SharedKey) : null;
}

function unavailable(row: RailRow, absent: string[]): RailRow {
  return { ...row, href: "#", available: false, absent };
}

function baseRow(reading: RailReading, section: ProgramKey): RailRow {
  const { work } = reading;
  return {
    key: `program-${section}`,
    label: PROGRAM_LABEL[section],
    href: programHref(work.id, section),
    account: "program",
    shared: sharedOf(section),
    count: programCount(work, section),
    available: true,
  };
}

/*
 * A level's record is absent rather than empty. The row states it in place, so the
 * reader sees the gap where they would have clicked.
 */
function levelRow(row: RailRow, section: ProgramKey, reading: RailReading): RailRow {
  const state = reading.levels?.[section];
  const available = state?.available ?? true;
  return {
    ...row,
    href: available ? row.href : "#",
    available,
    absent: available ? undefined : (state?.missing ?? ["no work item is selected"]),
  };
}

type RowRule = (row: RailRow, reading: RailReading) => RailRow;

const ROW_RULES: Partial<Record<ProgramKey, RowRule>> = {
  /* Epics and Rubrics are sections of the work, and the work always states both. */
  rubrics: (row) => row,
  /* A work with no plan directory keeps the row, disabled, so the gap reads in place. */
  plan: (row, { work }) => (work.hasPlan ? row : unavailable(row, ["no plan"])),
  epics: (row, { gates }) =>
    gates?.build ? row : unavailable(row, ["the work carries no epic"]),
};

export function programRowOf(reading: RailReading, section: ProgramKey): RailRow {
  const row = baseRow(reading, section);
  const rule = ROW_RULES[section];
  return rule ? rule(row, reading) : levelRow(row, section, reading);
}

function levelOf(changeLevels: ChangeLevel[], section: ChangeKey): ChangeLevel | null {
  const key = CHANGE_LEVEL_KEY[section];
  return changeLevels.find((level) => level.key === key) ?? null;
}

function changeCountOf(reading: RailReading, section: ChangeKey): string {
  const { changeLevels, diffFiles, servedAudio } = reading;
  const level = levelOf(changeLevels, section);
  return changeCount({ level, diffFiles, section, servedAudio, read: changeLevels.length > 0 });
}

function changeRowOf(reading: RailReading, section: ChangeKey, changePr: number): RailRow {
  return {
    key: `change-${section}`,
    label: CHANGE_LABEL[section],
    href: changeHref(reading.work.id, changePr, section),
    account: "change",
    shared: sharedOf(section),
    count: changeCountOf(reading, section),
    available: true,
  };
}

function noChangeRow(): RailRow {
  return {
    key: "change-file-diffs",
    label: CHANGE_LABEL["file-diffs"],
    href: "#",
    account: "change",
    shared: null,
    count: "",
    available: false,
    absent: ["no pull request carried by the work's epics"],
  };
}

export function changeRowsOf(reading: RailReading): RailRow[] {
  const { changePr } = reading;
  if (changePr === null) return [noChangeRow()];
  return CHANGE_KEYS.map((section) => changeRowOf(reading, section, changePr));
}
