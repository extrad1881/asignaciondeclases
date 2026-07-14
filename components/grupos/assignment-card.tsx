import { History, Save, Trash2 } from "lucide-react";
import {
  deleteAssignmentAction,
  deleteAssignmentFeedbackAction,
  updateAssignmentAction,
  updateAssignmentFeedbackAction
} from "@/app/(dashboard)/actions";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataCard } from "@/components/ui/data-card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type AssignmentBlockOption = {
  id: string;
  label: string;
};

export type AssignmentClassroomOption = {
  id: string;
  name: string;
};

export type AssignmentItem = {
  id: string;
  group_id: string;
  schedule_block_id: string;
  duration_hours: number;
  subject_name: string;
  teacher_name: string;
  block_label: string;
  classroom_id: string | null;
  classroom_name: string | null;
};

const detailsClass =
  "rounded-md border border-line bg-panel [&>summary]:focus-ring [&>summary]:cursor-pointer [&>summary]:inline-flex [&>summary]:min-h-11 [&>summary]:items-center [&>summary]:gap-2 [&>summary]:rounded-md [&>summary]:border [&>summary]:border-line [&>summary]:bg-background [&>summary]:px-3 [&>summary]:py-1.5 [&>summary]:text-xs [&>summary]:font-semibold [&>summary]:text-ink [&>summary]:transition [&>summary]:hover:bg-accent [&>summary]:marker:hidden";

const affectedName = (item: AssignmentItem) =>
  `${item.subject_name} - ${item.teacher_name}`;

export function AssignmentCard({
  item,
  blocks,
  classrooms,
  hasHistory,
  canEdit = true
}: {
  item: AssignmentItem;
  blocks: AssignmentBlockOption[];
  classrooms: AssignmentClassroomOption[];
  hasHistory: boolean;
  canEdit?: boolean;
}) {
  return (
    <DataCard
      actions={
        canEdit || hasHistory ? (
        <div className="flex w-full flex-col gap-2">
          {canEdit ? (
            <>
          <details className={detailsClass}>
            <summary>
              <Save className="h-3 w-3" aria-hidden />
              Cambiar bloque o aula
            </summary>
            <form action={updateAssignmentAction} className="mt-3 space-y-2">
              <input name="assignment_id" type="hidden" value={item.id} />
              <input name="group_id" type="hidden" value={item.group_id} />
              <label className="block text-xs font-semibold text-muted">
                Bloque
                <Select
                  className="mt-1 h-10"
                  defaultValue={item.schedule_block_id}
                  name="schedule_block_id"
                  required
                >
                  {blocks.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.label}
                    </option>
                  ))}
                </Select>
              </label>
              <Input
                className="h-10"
                defaultValue={item.duration_hours}
                max={99}
                min={0.5}
                name="duration_hours"
                required
                step={0.5}
                type="number"
              />
              <label className="block text-xs font-semibold text-muted">
                Aula
                <Select
                  className="mt-1 h-10"
                  defaultValue={item.classroom_id ?? ""}
                  name="classroom_id"
                >
                  <option value="">Aula del grupo</option>
                  {classrooms.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </option>
                  ))}
                </Select>
              </label>
              <ConfirmActionButton
                action={updateAssignmentFeedbackAction}
                affectedName={affectedName(item)}
                className="h-10 w-full"
                confirmLabel="Guardar cambio"
                description="Se modificará el horario, aula y horas de esta asignación activa."
                title="Modificar asignación"
                variant="secondary"
              >
                <Save className="h-4 w-4" aria-hidden />
                Guardar
              </ConfirmActionButton>
            </form>
          </details>

          <form action={deleteAssignmentAction}>
            <input name="assignment_id" type="hidden" value={item.id} />
            <input name="group_id" type="hidden" value={item.group_id} />
            <ConfirmActionButton
              action={deleteAssignmentFeedbackAction}
              affectedName={affectedName(item)}
              className="h-10 w-full"
              confirmLabel="Eliminar asignación"
              danger
              description="La asignación se eliminará y el docente liberará esas horas."
              title="Eliminar asignación"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Eliminar
            </ConfirmActionButton>
          </form>
            </>
          ) : null}

          {hasHistory ? (
            <details className={detailsClass}>
              <summary>
                <History className="h-3 w-3" aria-hidden />
                Ver historial
              </summary>
              <p className="mt-2 text-xs text-muted">
                Consulta el historial completo en la sección &quot;Historial del grupo&quot; al final de la página.
              </p>
            </details>
          ) : null}
        </div>
        ) : null
      }
      fields={[
        { label: "Docente", value: item.teacher_name },
        { label: "Bloque", value: item.block_label },
        { label: "Horas", value: `${item.duration_hours ?? 0} h` },
        {
          label: "Aula",
          value: item.classroom_name ? (
            item.classroom_name
          ) : (
            <span className="text-muted">Aula del grupo</span>
          )
        }
      ]}
      title={item.subject_name}
    />
  );
}
