import { DataCard } from "@/components/ui/data-card";

export type AuditEntry = {
  id: string | number;
  dateLabel: string;
  actionLabel: string;
  userLabel: string;
  table_name: string;
  summary: string;
};

function formatValue(value: unknown): string {
  if (value == null) return "Sin datos";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const detailsClass =
  "rounded-md border border-line bg-panel [&>summary]:focus-ring [&>summary]:cursor-pointer [&>summary]:inline-flex [&>summary]:min-h-11 [&>summary]:items-center [&>summary]:gap-2 [&>summary]:rounded-md [&>summary]:border [&>summary]:border-line [&>summary]:bg-background [&>summary]:px-3 [&>summary]:py-1.5 [&>summary]:text-xs [&>summary]:font-semibold [&>summary]:text-ink [&>summary]:transition [&>summary]:hover:bg-accent [&>summary]:marker:hidden";

export function AuditEntryCard({ entry }: { entry: AuditEntry }) {
  return (
    <DataCard
      fields={[
        { label: "Fecha", value: entry.dateLabel },
        { label: "Usuario", value: entry.userLabel },
        { label: "Acción", value: entry.actionLabel },
        { label: "Tabla", value: entry.table_name },
        { label: "Resumen", value: entry.summary, span: 2 }
      ]}
      title={entry.actionLabel}
    />
  );
}

export function AuditEntryCardDetailed({
  entry,
  oldValue,
  newValue
}: {
  entry: AuditEntry;
  oldValue: unknown;
  newValue: unknown;
}) {
  return (
    <DataCard
      actions={
        <details className={detailsClass + " w-full"}>
          <summary>Ver valores completos</summary>
          <div className="mt-3 grid gap-3 text-xs">
            <div>
              <p className="mb-1 font-semibold uppercase text-muted">Anterior</p>
              <pre className="max-h-48 overflow-auto rounded-md bg-ink p-3 text-primary-foreground">
                {formatValue(oldValue)}
              </pre>
            </div>
            <div>
              <p className="mb-1 font-semibold uppercase text-muted">Nuevo</p>
              <pre className="max-h-48 overflow-auto rounded-md bg-ink p-3 text-primary-foreground">
                {formatValue(newValue)}
              </pre>
            </div>
          </div>
        </details>
      }
      fields={[
        { label: "Fecha", value: entry.dateLabel },
        { label: "Usuario", value: entry.userLabel },
        { label: "Acción", value: entry.actionLabel },
        { label: "Tabla", value: entry.table_name },
        { label: "Resumen", value: entry.summary, span: 2 }
      ]}
      title={entry.actionLabel}
    />
  );
}
