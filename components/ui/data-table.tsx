import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export function DataTable({
  headers,
  rows,
  emptyLabel = "Sin registros todavía.",
  emptyDescription = "Cuando existan datos disponibles aparecerán en esta tabla."
}: {
  headers: string[];
  rows: React.ReactNode[][];
  emptyLabel?: string;
  emptyDescription?: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-card text-card-foreground shadow-subtle">
      <div className="flex items-center justify-between border-b border-line bg-card px-4 py-3 text-sm text-muted">
        <span className="font-semibold text-ink">{rows.length} registro(s)</span>
        <span>Vista de consulta</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-panel text-xs uppercase tracking-wide text-muted">
            <tr>
              {headers.map((header) => (
                <th className="px-4 py-3 font-semibold" key={header} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6" colSpan={headers.length}>
                  <EmptyState description={emptyDescription} title={emptyLabel} />
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  className={cn("border-t border-line hover:bg-brandSoft/40", rowIndex % 2 === 1 && "bg-panel/60")}
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
