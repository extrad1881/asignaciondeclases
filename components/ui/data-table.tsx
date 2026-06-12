import { cn } from "@/lib/utils";

export function DataTable({
  headers,
  rows,
  emptyLabel = "Sin registros todavía."
}: {
  headers: string[];
  rows: React.ReactNode[][];
  emptyLabel?: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-white shadow-subtle">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              {headers.map((header) => (
                <th className="px-4 py-3 font-semibold" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={headers.length}>
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  className={cn("border-t border-line", rowIndex % 2 === 1 && "bg-slate-50/60")}
                  key={rowIndex}
                >
                  {row.map((cell, cellIndex) => (
                    <td className="px-4 py-3 align-top" key={cellIndex}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
