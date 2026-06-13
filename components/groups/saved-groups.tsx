import Link from "next/link";
import { Trash2 } from "lucide-react";
import { deleteGroupAction, deleteGroupFeedbackAction } from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";

type SavedGroup = {
  id: string;
  name: string;
  quarter: number;
  modality: string;
  shift: string;
  academic_cycles?: { code?: string | null } | null;
  careers?: { code?: string | null; name?: string | null } | null;
};

function groupKey(group: SavedGroup) {
  const shift = group.shift === "matutino" ? "MAT" : "VES";
  return `${shift} ${group.quarter}`;
}

export function SavedGroups({ groups, canDelete = false }: { groups: SavedGroup[]; canDelete?: boolean }) {
  const activeGroups = groups.filter(Boolean);
  const buckets = new Map<string, SavedGroup[]>();

  for (const group of activeGroups) {
    const key = [
      group.academic_cycles?.code ?? "Sin ciclo",
      group.modality,
      groupKey(group)
    ].join(" / ");
    buckets.set(key, [...(buckets.get(key) ?? []), group]);
  }

  if (buckets.size === 0) {
    return (
      <div className="rounded-md border border-line bg-white p-6 text-sm text-slate-600 shadow-subtle">
        No hay grupos activos todavía.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from(buckets.entries()).map(([key, bucket]) => (
        <section className="rounded-md border border-line bg-white p-4 shadow-subtle" key={key}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-ink">{key}</h2>
            <Badge tone="success">{bucket.length} activo(s)</Badge>
          </div>
          <div className="space-y-2">
            {bucket.map((group) => (
              <div className="flex items-center gap-2" key={group.id}>
                <Link
                  className="min-w-0 flex-1 rounded-md border border-line bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100"
                  href={`/grupos/${group.id}`}
                >
                  <span className="font-medium text-ink">{group.name}</span>
                  <span className="ml-2 text-slate-500">{group.careers?.code ?? group.careers?.name}</span>
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
                      description="Se eliminara el grupo junto con sus materias y asignaciones asociadas si la base lo permite."
                      title={`Borrar ${group.name}`}
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
