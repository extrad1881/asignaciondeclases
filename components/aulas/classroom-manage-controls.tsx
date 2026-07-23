import { Pencil, Power, PowerOff, Save } from "lucide-react";
import {
  setClassroomActiveFeedbackAction,
  updateClassroomFeedbackAction
} from "@/app/(dashboard)/actions/aulas";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { Input } from "@/components/ui/input";

export type ClassroomItem = {
  id: string;
  name: string;
  capacity: number | null;
  kind: string | null;
  active: boolean;
};

const detailsClass =
  "rounded-md border border-line bg-panel [&>summary]:focus-ring [&>summary]:cursor-pointer [&>summary]:inline-flex [&>summary]:min-h-10 [&>summary]:items-center [&>summary]:gap-2 [&>summary]:rounded-md [&>summary]:px-3 [&>summary]:py-2 [&>summary]:text-xs [&>summary]:font-semibold [&>summary]:text-ink [&>summary]:transition [&>summary]:hover:bg-accent [&>summary]:marker:hidden";

export function ClassroomManageControls({
  classroom,
  compact = false
}: {
  classroom: ClassroomItem;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "grid min-w-[360px] gap-2" : "grid w-full gap-2"}>
      <details className={detailsClass}>
        <summary>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Editar datos
        </summary>
        <form className="grid gap-2 p-3">
          <input name="classroom_id" type="hidden" value={classroom.id} />
          <label className="grid gap-1 text-xs font-semibold text-muted">
            Nombre
            <Input defaultValue={classroom.name} name="name" required />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold text-muted">
              Tipo
              <Input
                defaultValue={classroom.kind ?? ""}
                name="kind"
                placeholder="Aula, laboratorio..."
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-muted">
              Capacidad
              <Input
                defaultValue={classroom.capacity ?? ""}
                min={0}
                name="capacity"
                placeholder="Sin límite"
                type="number"
              />
            </label>
          </div>
          <ConfirmActionButton
            action={updateClassroomFeedbackAction}
            affectedName={classroom.name}
            className="h-9"
            confirmLabel="Guardar cambios"
            description="Se actualizarán el nombre, el tipo y la capacidad del aula en todo el sistema."
            title="Editar aula"
            variant="secondary"
          >
            <Save className="h-4 w-4" aria-hidden />
            Guardar cambios
          </ConfirmActionButton>
        </form>
      </details>

      <form>
        <input name="classroom_id" type="hidden" value={classroom.id} />
        <input name="active" type="hidden" value={classroom.active ? "false" : "true"} />
        <ConfirmActionButton
          action={setClassroomActiveFeedbackAction}
          affectedName={classroom.name}
          className="h-9 w-full"
          confirmLabel={classroom.active ? "Desactivar aula" : "Reactivar aula"}
          danger={classroom.active}
          description={
            classroom.active
              ? "El aula dejará de aparecer en grupos y asignaciones nuevas. Los registros existentes se conservarán."
              : "El aula volverá a estar disponible para grupos y asignaciones."
          }
          title={classroom.active ? "Desactivar aula" : "Reactivar aula"}
          variant={classroom.active ? "danger" : "secondary"}
        >
          {classroom.active ? (
            <PowerOff className="h-4 w-4" aria-hidden />
          ) : (
            <Power className="h-4 w-4" aria-hidden />
          )}
          {classroom.active ? "Desactivar" : "Reactivar"}
        </ConfirmActionButton>
      </form>
    </div>
  );
}
