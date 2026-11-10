import { KeyValue } from "@/shell/atoms";

import { FileList, type FileListProps } from "./DiffFileList";
import { HunkList } from "./DiffHunks";
import type { DiffFile } from "./levels";

function FilePane({ file, count }: { file: DiffFile; count: number }) {
  return (
    <div className="col-span-12 flex min-w-0 flex-col gap-2 @3xl:col-span-8">
      <span className="flex min-w-0 flex-wrap items-baseline gap-2">
        <span className="min-w-0 font-mono text-[12.5px] font-bold break-all text-ink">{file.path}</span>
        <KeyValue label="files changed" value={count} />
      </span>
      <HunkList hunks={file.hunks} />
    </div>
  );
}

export function DiffGrid({ files, shown, onSelect }: FileListProps) {
  return (
    <div className="grid min-w-0 grid-cols-12 gap-4">
      <FileList files={files} shown={shown} onSelect={onSelect} />
      {shown === null ? null : <FilePane file={shown} count={files.length} />}
    </div>
  );
}
