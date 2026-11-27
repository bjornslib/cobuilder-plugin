import type { Waiting } from "./indexLoad";

function LoadingNote() {
  return (
    <p className="font-serif text-[14px] text-ink-dim">
      Reading the record index.
    </p>
  );
}

function LoadFailure({ message }: { message: string }) {
  return (
    <div className="max-w-[80ch] rounded-lg border border-dashed border-warn bg-warn-wash px-4 py-3">
      <p className="m-0 font-mono text-[11px] font-bold tracking-[0.08em] text-warn uppercase">
        The record index did not load
      </p>
      <p className="mt-1.5 mb-0 font-serif text-[14px] leading-[1.5] text-ink-mid">
        {message}
      </p>
    </div>
  );
}

export function Pending({ load }: { load: Waiting }) {
  return (
    <div className="px-5 py-6">
      {load.state === "loading" ? (
        <LoadingNote />
      ) : (
        <LoadFailure message={load.message} />
      )}
    </div>
  );
}
