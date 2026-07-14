import { Save } from "lucide-react";
import { updateGroupSubjectHoursAction } from "@/app/(dashboard)/actions";
import { ActionStateForm } from "@/components/ui/action-state-form";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataCard } from "@/components/ui/data-card";
import { Input } from "@/components/ui/input";

export type SubjectHoursStatus =
  | "sin_asignar"
  | "incompleta"
  | "completa"
  | "excedida";

const statusLabel: Record<SubjectHoursStatus, string> = {
  sin_asignar: "Sin asignar",
  incompleta: "Incompleta",
  completa: "Completa",
  excedida: "Excedida"
};

const statusTone: Record<SubjectHoursStatus, "success" | "warning" | "danger" | "neutral"> = {
  sin_asignar: "neutral",
  incompleta: "warning",
  completa: "success",
  excedida: "danger"
};

export type SubjectHoursItem = {
  group_subject_id: string;
  subject_name: string;
  hours_per_week: number;
  assigned_hours: number;
  status: SubjectHoursStatus;
};

function statusBadge(item: SubjectHoursItem) {
  if (item.status === "incompleta") {
    const remaining = item.hours_per_week - item.assigned_hours;
    return <Badge tone="warning">{`Faltan ${remaining} h`}</Badge>;
  }
  return <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>;
}

const detailsClass =
  "rounded-md border border-line bg-panel [&>summary]:focus-ring [&>summary]:cursor-pointer [&>summary]:inline-flex [&>summary]:min-h-11 [&>summary]:items-center [&>summary]:gap-2 [&>summary]:rounded-md [&>summary]:border [&>summary]:border-line [&>summary]:bg-background [&>summary]:px-3 [&>summary]:py-1.5 [&>summary]:text-xs [&>summary]:font-semibold [&>summary]:text-ink [&>summary]:transition [&>summary]:hover:bg-accent [&>summary]:marker:hidden";

export function SubjectHoursCard({
  item,
  groupId,
  canEdit = true
}: {
  item: SubjectHoursItem;
  groupId: string;
  canEdit?: boolean;
}) {
  return (
    <DataCard
      actions={
        canEdit ? (
        <div className="flex w-full flex-col gap-2">
          <details className={detailsClass}>
            <summary>
              <Save className="h-3 w-3" aria-hidden />
              Editar límite
            </summary>
            <ActionStateForm action={updateGroupSubjectHoursAction} className="mt-3 space-y-2">
              <input name="group_subject_id" type="hidden" value={item.group_subject_id} />
              <input name="group_id" type="hidden" value={groupId} />
              <Input
                className="h-10"
                defaultValue={item.hours_per_week}
                max={99}
                min={0.5}
                name="hours_per_week"
                required
                step={0.5}
                type="number"
              />
              <ConfirmActionButton
                affectedName={item.subject_name}
                className="h-10 w-full"
                confirmLabel="Actualizar límite"
                description={`Se cambiará el límite semanal de ${item.subject_name} de ${item.hours_per_week} h a otro valor.`}
                title="Modificar límite de horas"
                variant="secondary"
              >
                <Save className="h-4 w-4" aria-hidden />
                Guardar
              </ConfirmActionButton>
            </ActionStateForm>
          </details>
        </div>
        ) : null
      }
      badge={statusBadge(item)}
      fields={[
        { label: "Límite", value: `${item.hours_per_week} h/semana` },
        { label: "Asignadas", value: `${item.assigned_hours} h` }
      ]}
      subtitle={statusLabel[item.status]}
      title={item.subject_name}
    />
  );
}
