import { LANES } from "../workDeck";
import { STATUS_COLUMNS } from "./status";

export type BoardLevel = "programs" | "epics" | "orphans";
export type ProgramOrder = "name" | "open" | "progress";
export type CardGrain = "epics" | "slices";

export interface BoardAddress {
  level: BoardLevel;
  /** The design id of the epic board. Null on the other two boards. */
  program: string | null;
  q: string;
  order: ProgramOrder;
  cards: CardGrain;
  /** Column keys, in column order. */
  hide: readonly string[];
}

export const BOARD_HREF = "#/board";

const ORDERS: readonly ProgramOrder[] = ["name", "open", "progress"];
const GRAINS: readonly CardGrain[] = ["epics", "slices"];
const STAGE_KEYS = LANES.map((lane) => lane.key);
const STATUS_KEYS = STATUS_COLUMNS.map((column) => column.key);

export function columnKeysOf(level: BoardLevel): readonly string[] {
  return level === "programs" ? STAGE_KEYS : STATUS_KEYS;
}

export function defaultHide(level: BoardLevel): readonly string[] {
  return level === "programs" ? ["superseded"] : [];
}

function picked<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.find((one) => one === value) ?? fallback;
}

function inColumnOrder(level: BoardLevel, keys: readonly string[]): string[] {
  return columnKeysOf(level).filter((key) => keys.includes(key));
}

function hideOf(raw: string | null, level: BoardLevel): readonly string[] {
  if (raw === null) return defaultHide(level);
  const hide = inColumnOrder(level, raw.split(","));
  return hide.length === columnKeysOf(level).length ? hide.slice(0, -1) : hide;
}

function levelOf(params: URLSearchParams): BoardLevel {
  if (params.get("program")) return "epics";
  return params.get("orphans") === "1" ? "orphans" : "programs";
}

export function readBoardAddress(hash: string): BoardAddress | null {
  const match = /^#\/board(?:\?(.*))?$/.exec(hash);
  if (match === null) return null;
  const params = new URLSearchParams(match[1] ?? "");
  const level = levelOf(params);
  const program = level === "epics" ? params.get("program") : null;
  const order = picked(params.get("sort"), ORDERS, "name");
  const cards = picked(params.get("cards"), GRAINS, "epics");
  return { level, program, q: params.get("q") ?? "", order, cards, hide: hideOf(params.get("hide"), level) };
}

function boardKey(address: BoardAddress): string | null {
  if (address.level === "epics" && address.program) return `program=${encodeURIComponent(address.program)}`;
  return address.level === "orphans" ? "orphans=1" : null;
}

function hideKey(address: BoardAddress): string | null {
  const hide = inColumnOrder(address.level, address.hide);
  const fallback = defaultHide(address.level);
  const atDefault = hide.length === fallback.length && hide.every((key, at) => key === fallback[at]);
  return atDefault ? null : `hide=${hide.join(",")}`;
}

export function boardHash(address: BoardAddress): string {
  const keys = [
    boardKey(address),
    address.q ? `q=${encodeURIComponent(address.q)}` : null,
    address.order === "name" ? null : `sort=${address.order}`,
    address.cards === "epics" ? null : `cards=${address.cards}`,
    hideKey(address),
  ].filter((key): key is string => key !== null);
  return keys.length === 0 ? BOARD_HREF : `${BOARD_HREF}?${keys.join("&")}`;
}

export function boardChangeHref(level: BoardLevel, program: string | null, q: string): string {
  return boardHash({ level, program, q, order: "name", cards: "epics", hide: defaultHide(level) });
}

/** Add a key to the hide set, or remove it. The last visible column refuses. */
export function hideToggled(address: BoardAddress, key: string): BoardAddress {
  const columns = columnKeysOf(address.level);
  if (!columns.includes(key)) return address;
  if (address.hide.includes(key)) {
    return { ...address, hide: address.hide.filter((hidden) => hidden !== key) };
  }
  if (address.hide.length + 1 >= columns.length) return address;
  return { ...address, hide: inColumnOrder(address.level, [...address.hide, key]) };
}
