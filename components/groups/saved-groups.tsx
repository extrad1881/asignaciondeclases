import Link from "next/link";
import { LayoutGrid, Trash2 } from "lucide-react";
import { deleteGroupAction, deleteGroupFeedbackAction } from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { EmptyState } from "@/components/ui/empty-state";

type SavedGroup = {
  id: string;
  name: string;
  quarter: number;
  modality: string;
  shift: string;
  status: string;
  academic_cycles?: { code?: string | null } | null;
  careers?: { code?: string | null; name?: string | null } | null;
};

const statusBadge: Record<string, { tone: "neutral" | "success" | "warning" | "info" | "danger"; label: string }> = {
  draft: { tone: "neutral", label: "Borrador" },
  review: { tone: "warning", label: "Revisión" },
  active: { tone: "success", label: "Activo" },
  final: { tone: "success", label: "Finalizado" },
  archived: { tone: "info", label: "Archivado" }
};

function groupKey(group: SavedGroup) {
  const shift = group.shift === "matutino" ? "Matutino" : "Vespertino";
  return `${shift} · Cuatrimestre ${group.quarter}`;
}

function modalityLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function SavedGroups({ groups, canDelete = false }: { groups: SavedGroup[]; canDelete?: boolean }) {
  const activeGroups = groups.filter(Boolean);
  const buckets = new Map<string, SavedGroup[]>();

  for (const group of activeGroups) {
    const key = [group.academic_cycles?.code ?? "Sin ciclo", modalityLabel(group.modality), groupKey(group)].join(" / ");
    buckets.set(key, [...(buckets.get(key) ?? []), group]);
  }

  if (buckets.size === 0) {
    return (
      <EmptyState
        action={
          <Link href="/grupos/nuevo">
            <Button type="button">Crear grupo</Button>
          </Link>
        }
        description="Crea un grupo para empezar a configurar materias, docentes y bloques de horario."
        icon={LayoutGrid}
        title="No hay grupos activos para este ciclo."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from(buckets.entries()).map(([key, bucket]) => (
        <section className="rounded-md border border-line bg-white p-4 shadow-subtle" key={key}>
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-ink">{key}</h2>
              <p className="mt-1 text-sm text-muted">Grupos listos para revisión o asignación.</p>
            </div>
            <Badge tone="brand">{bucket.length} grupo(s)</Badge>
          </div>
          <div className="space-y-2">
            {bucket.map((group) => (
              <div className="flex items-center gap-2" key={group.id}>
                <Link
                  className="min-w-0 flex-1 rounded-md border border-line bg-slate-50 px-3 py-2 text-sm transition hover:border-brand hover:bg-brandSoft/50"
                  href={`/grupos/${group.id}`}
                >
                  <span className="block truncate font-semibold text-ink">{group.name}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-muted">
                    <span>{group.careers?.code ?? group.careers?.name ?? "Sin carrera"}</span>
                    <Badge tone={statusBadge[group.status]?.tone ?? "neutral"}>
                      {statusBadge[group.status]?.label ?? group.status}
                    </Badge>
                  </span>
                </Link>
                {canDelete ? (
                  <form action={deleteGroupAction}>
                    <input name="group_id" type="hidden" value={group.id} />
                    <ConfirmActionButton
                      action={deleteGroupFeedbackAction}
                      aria-label={`Borrar ${group.name}`}
                      affectedName={group.name}
                      className="h-10 w-10 px-0"
                      confirmLabel="Borrar grupo"
                      danger
                      description="Se eliminará el grupo junto con sus materias y asignaciones asociadas si la base lo permite."
                      title="Borrar grupo"
                      variant="danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </ConfirmActionButton>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
