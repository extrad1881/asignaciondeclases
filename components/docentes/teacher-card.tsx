import { Save, Trash2 } from "lucide-react";
import {
  assignCoordinatorTeacherAction,
  assignCoordinatorTeacherFeedbackAction,
  setTeacherActiveAction,
  setTeacherActiveFeedbackAction,
  updateTeacherMaxHoursAction,
  updateTeacherMaxHoursFeedbackAction,
  updateTeacherProfilesAction,
  updateTeacherProfilesFeedbackAction
} from "@/app/(dashboard)/actions";
import { ProfileCheckboxGroup } from "@/components/forms/profile-checkbox-group";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataCard } from "@/components/ui/data-card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatHours } from "@/lib/utils";

type ProfileOption = {
  code: string;
  name?: string | null;
};

type CoordinatorOption = {
  id: string;
  name: string;
};

type Teacher = {
  id: string;
  name: string;
  max_hours: number | null;
  assigned_hours: number | null;
  active: boolean;
  responsible_coordinator_id?: string | null;
  assignedCoordinators: Array<{ id: string; name: string }>;
  selectedProfiles: string[];
};

const detailsClass =
  "rounded-md border border-line bg-panel [&>summary]:focus-ring [&>summary]:cursor-pointer [&>summary]:inline-flex [&>summary]:min-h-11 [&>summary]:items-center [&>summary]:gap-2 [&>summary]:rounded-md [&>summary]:border [&>summary]:border-line [&>summary]:bg-background [&>summary]:px-3 [&>summary]:py-1.5 [&>summary]:text-xs [&>summary]:font-semibold [&>summary]:text-ink [&>summary]:transition [&>summary]:hover:bg-accent [&>summary]:marker:hidden";

export function TeacherCard({
  teacher,
  profileOptions,
  coordinatorOptions,
  canManage
}: {
  teacher: Teacher;
  profileOptions: ProfileOption[];
  coordinatorOptions: CoordinatorOption[];
  canManage: boolean;
}) {
  const statusLabel = teacher.active ? "Activo" : "Inactivo";
  const statusTone = teacher.active ? "success" : "warning";
  const coordinatorNames = teacher.assignedCoordinators.map((c) => c.name);
  const hasPrimaryCoordinator = coordinatorNames.length > 0;
  const primaryCoordinator = hasPrimaryCoordinator ? (
    coordinatorNames[0]
  ) : (
    <span className="text-muted">Sin asignar</span>
  );

  return (
    <DataCard
      actions={
        canManage ? (
          <div className="flex w-full flex-col gap-2">
            <details className={detailsClass}>
              <summary>
                <Save className="h-3 w-3" aria-hidden />
                Cambiar horas
              </summary>
              <form action={updateTeacherMaxHoursAction} className="mt-3 space-y-2">
                <input name="teacher_id" type="hidden" value={teacher.id} />
                <Input
                  className="h-10"
                  defaultValue={teacher.max_hours ?? 20}
                  min={teacher.assigned_hours ?? 0}
                  name="max_hours"
                  required
                  step={0.5}
                  type="number"
                />
                <ConfirmActionButton
                  action={updateTeacherMaxHoursFeedbackAction}
                  affectedName={teacher.name}
                  className="h-10 w-full"
                  confirmLabel="Guardar horas"
                  description="Se actualizarán las horas máximas del docente. No puede quedar por debajo de las horas ya asignadas."
                  title="Modificar horas máximas"
                  variant="secondary"
                >
                  <Save className="h-4 w-4" aria-hidden />
                  Guardar horas
                </ConfirmActionButton>
              </form>
            </details>

            <details className={detailsClass}>
              <summary>
                <Save className="h-3 w-3" aria-hidden />
                Editar perfiles
              </summary>
              <form action={updateTeacherProfilesAction} className="mt-3 space-y-2">
                <input name="teacher_id" type="hidden" value={teacher.id} />
                <ProfileCheckboxGroup
                  maxHeight="max-h-40"
                  profiles={profileOptions}
                  selected={teacher.selectedProfiles}
                />
                <ConfirmActionButton
                  action={updateTeacherProfilesFeedbackAction}
                  affectedName={teacher.name}
                  className="h-10 w-full"
                  confirmLabel="Guardar perfiles"
                  description="Se reemplazarán los perfiles aptos del docente. Las próximas asignaciones validarán contra esta lista."
                  title="Modificar perfiles del docente"
                  variant="secondary"
                >
                  <Save className="h-4 w-4" aria-hidden />
                  Guardar perfiles
                </ConfirmActionButton>
              </form>
            </details>

            <details className={detailsClass}>
              <summary>
                <Save className="h-3 w-3" aria-hidden />
                Asignar coordinador
              </summary>
              <form action={assignCoordinatorTeacherAction} className="mt-3 space-y-2">
                <input name="teacher_id" type="hidden" value={teacher.id} />
                <Select
                  className="h-10"
                  defaultValue={teacher.responsible_coordinator_id ?? coordinatorOptions[0]?.id ?? ""}
                  disabled={coordinatorOptions.length === 0}
                  name="coordinator_id"
                  required
                >
                  {coordinatorOptions.map((coordinator) => (
                    <option key={coordinator.id} value={coordinator.id}>
                      {coordinator.name}
                    </option>
                  ))}
                </Select>
                <ConfirmActionButton
                  action={assignCoordinatorTeacherFeedbackAction}
                  affectedName={teacher.name}
                  className="h-10 w-full"
                  confirmLabel="Asignar coordinador"
                  description="El docente quedará bajo el coordinador seleccionado y se ajustará su alcance de gestión."
                  disabled={coordinatorOptions.length === 0}
                  title="Cambiar coordinador del docente"
                  variant="secondary"
                >
                  Asignar
                </ConfirmActionButton>
              </form>
            </details>

            <form action={setTeacherActiveAction}>
              <input name="teacher_id" type="hidden" value={teacher.id} />
              <input name="active" type="hidden" value={teacher.active ? "false" : "true"} />
              <ConfirmActionButton
                action={setTeacherActiveFeedbackAction}
                affectedName={teacher.name}
                className="h-10 w-full"
                confirmLabel={teacher.active ? "Desactivar docente" : "Reactivar docente"}
                danger={teacher.active}
                description={
                  teacher.active
                    ? "El docente dejará de estar disponible para nuevas asignaciones."
                    : "El docente volverá a estar disponible para asignaciones."
                }
                title={teacher.active ? "Desactivar docente" : "Reactivar docente"}
                variant={teacher.active ? "danger" : "secondary"}
              >
                {teacher.active ? <Trash2 className="h-4 w-4" aria-hidden /> : null}
                {teacher.active ? "Desactivar" : "Reactivar"}
              </ConfirmActionButton>
            </form>
          </div>
        ) : null
      }
      badge={<Badge tone={statusTone}>{statusLabel}</Badge>}
      fields={[
        { label: "Coordinador", value: primaryCoordinator },
        {
          label: "Perfiles aptos",
          value:
            teacher.selectedProfiles.length === 0 ? (
              <span className="text-muted">Sin perfiles</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {teacher.selectedProfiles.map((code) => (
                  <Badge key={code}>{code}</Badge>
                ))}
              </div>
            )
        },
        {
          label: "Horas",
          value: `${formatHours(teacher.assigned_hours)} / ${formatHours(teacher.max_hours)}`
        }
      ]}
      subtitle={coordinatorNames.length > 1 ? `${coordinatorNames.length} coordinadores` : "Docente"}
      title={teacher.name}
    />
  );
}
