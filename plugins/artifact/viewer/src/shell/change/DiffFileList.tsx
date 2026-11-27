import { cn } from "@/lib/utils";

import type { DiffFile } from "./levels";

const ROW_BASE =
  "flex min-h-9 w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors";
const ROW_ON = "border-primary bg-accent-wash";
const ROW_OFF = "border-line-soft bg-card hover:bg-surface-2";

interface FileButtonProps {
  file: DiffFile;
  on: boolean;
  onSelect: (path: string) => void;
}

function FileCounts({ file }: { file: DiffFile }) {
  return (
    <>
      <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-mid">{file.path}</span>
      <span className="shrink-0 font-mono text-[12px] text-good tabular-nums">+{file.adds}</span>
      <span className="shrink-0 font-mono text-[12px] text-destructive tabular-nums">&minus;{file.dels}</span>
    </>
  );
}

function FileButton({ file, on, onSelect }: FileButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(file.path)}
      aria-current={on ? "true" : undefined}
      className={cn(ROW_BASE, on ? ROW_ON : ROW_OFF)}
    >
      <FileCounts file={file} />
    </button>
  );
}

export interface FileListProps {
  files: DiffFile[];
  shown: DiffFile | null;
  onSelect: (path: string) => void;
}

export function FileList({ files, shown, onSelect }: FileListProps) {
  return (
    <ul className="col-span-12 m-0 flex min-w-0 list-none flex-col gap-1 p-0 @3xl:col-span-4">
      {files.map((file) => (
        <li key={file.path} className="min-w-0 list-none">
          <FileButton file={file} on={file.path === shown?.path} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}
