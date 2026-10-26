import { useEffect, useState } from "react";

import type { PanelAction } from "../../atoms";
import { diffFiles } from "../../change/levels";
import { counterpartHref, railGroups, readInLabel, rowsOf, type RailRow, type RailSource, type WorkItem } from "../../model";
import { useRailArrowKeys } from "../railKeys";
import type { Account } from "./account";
import type { Address } from "./address";
import type { ShellCore } from "./core";

interface Carried {
  href: string;
  section: string;
}

/*
 * The rail's own input. One object serves the rail, the arrow-key walk, and the Review
 * group's addresses, so all three read one derivation.
 *
 * THE CHANGE THE RAIL ADDRESSES IS THE ROUTE'S CHANGE, AND FAILING THAT THE WORK'S OWN.
 * A reader on a program row still sees where the change's four rows lead, and a reader
 * inside the change's account sees rows that open the address they are on. Without the
 * fallback the current-row match would fail on every program row, because the route
 * names no pull request there.
 */
function railChangePrOf(work: WorkItem | null, changePr: number | null): number | null {
  return changePr ?? (work && work.pullRequests.length > 0 ? work.pullRequests[0].id : null);
}

function buildRailSource(address: Address, account: Account): RailSource {
  const { work, gates, levels } = address;
  const { change, servedAudio } = account;
  const files = change.diff === null ? null : diffFiles(change.diff).length;
  return { work, gates, levels, changePr: railChangePrOf(work, account.changePr), changeLevels: change.levels, diffFiles: files, servedAudio };
}

/*
 * THE ROOT IS THE BOARD ROUTE. A reader who opens the server's root carries an empty
 * hash, and the shell's own answer is the bare route the deck opens over — so the
 * address normalizes to `#/` and the reader's later steps read one scheme. The
 * replacement carries no history entry: the root was always the board route.
 */
function useHomeHash(): void {
  useEffect(() => {
    if (window.location.hash === "") {
      window.history.replaceState(null, "", "#/");
    }
  }, []);
}

function useCarried(here: string) {
  const [carried, setCarried] = useState<Carried | null>(null);
  useEffect(() => {
    if (carried !== null && carried.href !== here) setCarried(null);
  }, [carried, here]);
  const carriedHere = carried !== null && carried.href === here ? carried.section : null;
  return { setCarried, carriedHere };
}

interface ActionInput {
  row: RailRow | null;
  workId: string;
  railChangePr: number | null;
  onGo: PanelAction["onGo"];
}

function panelActionOf({ row, workId, railChangePr, onGo }: ActionInput): PanelAction | null {
  if (row === null || row.shared === null || railChangePr === null) return null;
  const label = readInLabel(row.account, row.account === "program" ? railChangePr : null);
  if (label === null) return null;
  return { label, href: counterpartHref(workId, railChangePr, row.account, row.shared), onGo };
}

/*
 * THE LINK ON A SECTION HEADING CROSSES ONLY WHERE BOTH ACCOUNTS CARRY THE SAME SECTION
 * NAME. The row's own `shared` field holds that name or null, so the change's File Diffs
 * row and the program's Epics, Rubrics, and Plan rows get no link. A work whose own epics
 * carry no pull request has no change account to cross to, and `readInLabel` gives null.
 *
 * THE ADDRESS COMES FROM `counterpartHref`, the one builder that calls both of the
 * account builders. THE SECTION NAME RIDES VIEW STATE AND NOT THE ROUTE (ADR-0028). A
 * press stores the name with the address it opens, and the level that opens there reads
 * the name only while the address still matches. The effect below clears it as soon as
 * the hash is another address, so a later arrival at the same address starts clean.
 */
function usePanelAction(go: ShellCore["go"], row: RailRow | null, source: RailSource) {
  const here = window.location.hash;
  const { setCarried, carriedHere } = useCarried(here);
  const onGo = (href: string, sectionName: string) => {
    setCarried({ href, section: sectionName });
    go(href);
  };
  const panelAction = panelActionOf({ row, workId: source.work?.id ?? "", railChangePr: source.changePr ?? null, onGo });
  return { panelAction, carriedHere };
}

/*
 * THE READER'S OWN ROW, MATCHED BY ITS ADDRESS AND NEVER BY ITS SECTION NAME. Every
 * section of both accounts carries its account's mark, and the mark is the mark of the
 * row the reader's own address opens. The two groups repeat three section names, so a
 * match on the name would light more than one row at once and the mark would name the
 * wrong account. The address is what a deep link carries, so a reader who arrives on the
 * change's Architecture row reads Architecture's mark and not the account's first row's.
 *
 * A SECTION NO ACCOUNT OWNS HAS NO ROW. The pull-request list and the shipped record are
 * sections of the shell rather than of either account, so no row opens them and no mark
 * stands above them. The board and a work item the bundle lacks render no pane content
 * either way.
 */
export function useRailLinks({ go }: ShellCore, address: Address, account: Account) {
  const railSource = buildRailSource(address, account);
  useRailArrowKeys({ source: railSource, go });
  const row = rowsOf(railGroups(railSource)).find((candidate) => candidate.href === window.location.hash) ?? null;
  useHomeHash();
  return { railSource, ...usePanelAction(go, row, railSource) };
}
