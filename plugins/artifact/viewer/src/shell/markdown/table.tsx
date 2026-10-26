import { inline } from "./inline";

interface CellProps {
  cell: string;
  id: string;
}

function HeadCell({ cell }: { cell: string }) {
  return (
    <th
      className="border-b border-line px-2 py-1.5 text-left font-mono text-[12px] tracking-[0.05em] text-ink-dim uppercase"
    >
      {cell}
    </th>
  );
}

function BodyCell({ cell, id }: CellProps) {
  return (
    <td className="border-b border-line-soft px-2 py-1.5 align-top text-ink-mid">
      {inline(cell, id)}
    </td>
  );
}

function BodyRow({ row, rowKey }: { row: string[]; rowKey: string }) {
  return (
    <tr>
      {row.map((cell, cellIndex) => (
        <BodyCell key={`${rowKey}-c${cellIndex}`} cell={cell} id={`${rowKey}-c${cellIndex}`} />
      ))}
    </tr>
  );
}

function TableHead({ head, id }: { head: string[]; id: string }) {
  return (
    <thead>
      <tr>
        {head.map((cell, cellIndex) => (
          <HeadCell key={`${id}-h${cellIndex}`} cell={cell} />
        ))}
      </tr>
    </thead>
  );
}

function TableBody({ body, id }: { body: string[][]; id: string }) {
  return (
    <tbody>
      {body.map((row, rowIndex) => (
        <BodyRow key={`${id}-r${rowIndex}`} row={row} rowKey={`${id}-r${rowIndex}`} />
      ))}
    </tbody>
  );
}

export function TableBlock({ rows, id }: { rows: string[][]; id: string }) {
  const [head, ...body] = rows;
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full border-collapse font-serif text-[15px]">
        <TableHead head={head ?? []} id={id} />
        <TableBody body={body} id={id} />
      </table>
    </div>
  );
}
