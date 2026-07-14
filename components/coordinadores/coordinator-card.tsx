import { Save, Trash2 } from "lucide-react";
import {
  deleteCoordinatorRecordAction,
  deleteCoordinatorRecordFeedbackAction,
  updateCoordinatorCareersAction,
  updateCoordinatorCareersFeedbackAction,
  updateCoordinatorRecordAction,
  updateCoordinatorRecordFeedbackAction,
  updateCoordinatorUserAction,
  updateCoordinatorUserFeedbackAction
} from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataCard } from "@/components/ui/data-card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Career = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

type Coordinator = {
  id: string;
  name: string;
  active: boolean;
  users_profile?: {
    id: string;
    email: string | null;
    display_name?: string | null;
    role_code?: string | null;
    active?: boolean | null;
  } | null;
  coordinator_careers: Array<{
    career_id: string;
    careers?: { id?: string; code?: string | null; name?: string | null; active?: boolean } | null;
  }>;
  coordinator_teachers: Array<{ teacher_id: string }>;
};

const detailsClass =
  "rounded-md border border-line bg-panel [&>summary]:focus-ring [&>summary]:cursor-pointer [&>summary]:inline-flex [&>summary]:min-h-11 [&>summary]:items-center [&>summary]:gap-2 [&>summary]:rounded-md [&>summary]:border [&>summary]:border-line [&>summary]:bg-background [&>summary]:px-3 [&>summary]:py-1.5 [&>summary]:text-xs [&>summary]:font-semibold [&>summary]:text-ink [&>summary]:transition [&>summary]:hover:bg-accent [&>summary]:marker:hidden";

export function CoordinatorCard({
  coordinator,
  careers,
  canManage
}: {
  coordinator: Coordinator;
  careers: Career[];
  canManage: boolean;
}) {
  const statusLabel = coordinator.active ? "Activo" : "Inactivo";
  const statusTone = coordinator.active ? "success" : "warning";
  const assignedCareerIds = new Set(
    coordinator.coordinator_careers
      .map((item) => item.career_id ?? item.careers?.id)
      .filter((id): id is string => Boolean(id))
  );
  const careerCount = coordinator.coordinator_careers.length;
  const teacherCount = coordinator.coordinator_teachers.length;
  const userLabel = coordinator.users_profile?.email ?? "Sin usuario vinculado";

  return (
    <DataCard
      actions={
        canManage ? (
          <div className="flex w-full flex-col gap-2">
            <details className={detailsClass}>
              <summary>
                <Save className="h-3 w-3" aria-hidden />
                Modificar carreras
              </summary>
              <form action={updateCoordinatorCareersAction} className="mt-3 space-y-3">
                <input name="coordinator_id" type="hidden" value={coordinator.id} />
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-line bg-card p-2">
                  {careers.map((career) => (
                    <label
                      className="flex items-start gap-2 rounded-md border border-line bg-panel px-2 py-2 text-xs font-medium text-ink"
                      key={career.id}
                    >
                      <input
                        className="mt-0.5 h-4 w-4 accent-brand"
                        defaultChecked={assignedCareerIds.has(career.id)}
                        name="career_ids"
                        type="checkbox"
                        value={career.id}
                      />
                      <span className="grid gap-0.5">
                        <span>{career.code}</span>
                        <span className="font-normal text-muted">
                          {career.name}
                          {career.active ? "" : " (Inactiva)"}
                        </span>
                      </span>
                    </label>
                  ))}
                  {careers.length === 0 ? (
                    <span className="text-sm text-muted">Sin carreras</span>
                  ) : null}
                </div>
                <ConfirmActionButton
                  action={updateCoordinatorCareersFeedbackAction}
                  affectedName={coordinator.name}
                  className="h-10 w-full"
                  confirmLabel="Guardar carreras"
                  description="Se reemplazará la lista de carreras asignadas al coordinador por la selección actual."
                  title="Modificar carreras del coordinador"
                  variant="secondary"
                >
                  Guardar carreras
                </ConfirmActionButton>
              </form>
            </details>

            <details className={detailsClass}>
              <summary>
                <Save className="h-3 w-3" aria-hidden />
                Modificar coordinador
              </summary>
              <form action={updateCoordinatorRecordAction} className="mt-3 space-y-2">
                <input name="coordinator_id" type="hidden" value={coordinator.id} />
                <Input
                  className="h-10"
                  defaultValue={coordinator.name}
                  name="name"
                  required
                />
                <Select
                  className="h-10"
                  defaultValue={coordinator.active ? "true" : "false"}
                  name="active"
                  required
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </Select>
                <ConfirmActionButton
                  action={updateCoordinatorRecordFeedbackAction}
                  affectedName={coordinator.name}
                  className="h-10 w-full"
                  confirmLabel="Guardar coordinador"
                  description="Se actualizarán el nombre y estado operativo del coordinador."
                  title="Modificar coordinador"
                  variant="secondary"
                >
                  Guardar
                </ConfirmActionButton>
              </form>
            </details>

            {coordinator.users_profile?.id ? (
              <details className={detailsClass}>
                <summary>
                  <Save className="h-3 w-3" aria-hidden />
                  Modificar usuario
                </summary>
                <form action={updateCoordinatorUserAction} className="mt-3 space-y-2">
                  <input name="coordinator_id" type="hidden" value={coordinator.id} />
                  <input name="user_id" type="hidden" value={coordinator.users_profile.id} />
                  <Input
                    className="h-10"
                    defaultValue={coordinator.users_profile.email ?? ""}
                    name="email"
                    required
                    type="email"
                  />
                  <Select
                    className="h-10"
                    defaultValue={
                      (coordinator.users_profile.active ?? coordinator.active) ? "true" : "false"
                    }
                    name="active"
                    required
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </Select>
                  <Input
                    className="h-10"
                    name="password"
                    placeholder="Nueva contraseña"
                    type="password"
                  />
                  <ConfirmActionButton
                    action={updateCoordinatorUserFeedbackAction}
                    affectedName={coordinator.name}
                    className="h-10 w-full"
                    confirmLabel="Guardar usuario"
                    description="Se actualizará el correo, estado y, si escribiste una nueva, la contraseña del usuario vinculado."
                    title="Modificar usuario del coordinador"
                    variant="secondary"
                  >
                    Guardar
                  </ConfirmActionButton>
                </form>
              </details>
            ) : null}

            {!coordinator.users_profile?.id ? (
              <form action={deleteCoordinatorRecordAction}>
                <input name="coordinator_id" type="hidden" value={coordinator.id} />
                <ConfirmActionButton
                  action={deleteCoordinatorRecordFeedbackAction}
                  affectedName={coordinator.name}
                  className="h-10 w-full"
                  confirmLabel="Desactivar coordinador"
                  danger
                  description="El coordinador se desactivará. Esta opción solo aplica cuando no tiene usuario vinculado."
                  title="Desactivar coordinador"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Desactivar coordinador
                </ConfirmActionButton>
              </form>
            ) : null}
          </div>
        ) : null
      }
      badge={<Badge tone={statusTone}>{statusLabel}</Badge>}
      fields={[
        {
          label: "Usuario",
          value: coordinator.users_profile?.email ? (
            userLabel
          ) : (
            <span className="text-muted">{userLabel}</span>
          )
        },
        {
          label: "Carreras",
          value:
            careerCount === 0 ? (
              <span className="text-muted">Sin asignar</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {coordinator.coordinator_careers.map((item, index) => (
                  <Badge key={`${coordinator.id}-career-${index}`}>{item.careers?.code ?? "—"}</Badge>
                ))}
              </div>
            )
        },
        { label: "Docentes", value: teacherCount }
      ]}
      subtitle={coordinator.users_profile?.display_name ? coordinator.users_profile.display_name : "Coordinador"}
      title={coordinator.name}
    />
  );
}
