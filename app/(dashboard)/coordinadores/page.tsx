import { SectionHeader } from "@/components/section-header";
import { CoordinatorCard } from "@/components/coordinadores/coordinator-card";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Select } from "@/components/ui/select";
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
import { isAdmin } from "@/lib/permissions";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CoordinatorsPage() {
  const supabase = await createClient();
  const [profile, { data: coordinators = [] }, { data: careers = [] }] = await Promise.all([
    requireActiveProfileOrRedirect(),
    supabase
      .from("coordinators")
      .select(
        "id, profile_id, name, active, users_profile(id, email, display_name, role_code, active), coordinator_careers(career_id, careers(id, code, name, active)), coordinator_teachers(teacher_id)"
      )
      .order("name"),
    supabase.from("careers").select("id, code, name, active").order("code")
  ]);
  const canManageUsers = isAdmin(profile?.role_code);
  const coordinatorRows = coordinators ?? [];
  const careerRows = (careers ?? []).map((c: any) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    active: c.active
  }));

  return (
    <>
      <SectionHeader eyebrow="Usuarios" title="Coordinadores" />
      <ResponsiveTable
        cards={
          <ul className="grid gap-3 sm:grid-cols-2">
            {coordinatorRows.map((coordinator: any) => (
              <li key={coordinator.id}>
                <CoordinatorCard
                  canManage={canManageUsers}
                  careers={careerRows}
                  coordinator={{
                    id: coordinator.id,
                    name: coordinator.name,
                    active: coordinator.active,
                    users_profile: coordinator.users_profile,
                    coordinator_careers: coordinator.coordinator_careers ?? [],
                    coordinator_teachers: coordinator.coordinator_teachers ?? []
                  }}
                />
              </li>
            ))}
          </ul>
        }
        table={
          <DataTable
            headers={
              canManageUsers
                ? [
                    "Coordinador",
                    "Usuario",
                    "Carreras",
                    "Modificar carreras",
                    "Docentes",
                    "Estado",
                    "Modificar coordinador",
                    "Modificar usuario"
                  ]
                : ["Coordinador", "Usuario", "Carreras", "Docentes", "Estado"]
            }
            rows={coordinatorRows.map((coordinator: any) => {
              const assignedCareerIds = new Set(
                (coordinator.coordinator_careers ?? [])
                  .map((item: any) => item.career_id ?? item.careers?.id)
                  .filter(Boolean)
              );

              return [
                <span className="font-medium text-ink" key="name">
                  {coordinator.name}
                </span>,
                coordinator.users_profile?.email ?? (
                  <span className="text-muted-foreground" key="no-user-email">
                    Sin usuario vinculado
                  </span>
                ),
                <div className="flex flex-wrap gap-1" key="careers">
                  {(coordinator.coordinator_careers ?? []).length === 0 ? (
                    <span className="text-muted-foreground">Sin asignar</span>
                  ) : (
                    (coordinator.coordinator_careers ?? []).map((item: any, index: number) => (
                      <Badge key={index}>{item.careers?.code}</Badge>
                    ))
                  )}
                </div>,
                ...(canManageUsers
                  ? [
                      <form
                        action={updateCoordinatorCareersAction}
                        className="grid min-w-[560px] gap-2"
                        key="edit-careers"
                      >
                        <input name="coordinator_id" type="hidden" value={coordinator.id} />
                        <div className="grid max-h-56 gap-2 overflow-y-auto rounded-md border border-line bg-card p-2 md:grid-cols-2">
                          {careerRows.map((career) => (
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
                          {careerRows.length === 0 ? (
                            <span className="text-sm text-muted-foreground">Sin carreras</span>
                          ) : null}
                        </div>
                        <ConfirmActionButton
                          action={updateCoordinatorCareersFeedbackAction}
                          affectedName={coordinator.name}
                          className="h-9 px-3"
                          confirmLabel="Guardar carreras"
                          description="Se reemplazará la lista de carreras asignadas al coordinador por la selección actual."
                          title="Modificar carreras del coordinador"
                          variant="secondary"
                        >
                          Guardar carreras
                        </ConfirmActionButton>
                      </form>
                    ]
                  : []),
                coordinator.coordinator_teachers?.length ?? 0,
                <Badge key="state" tone={coordinator.active ? "success" : "warning"}>
                  {coordinator.active ? "Activo" : "Inactivo"}
                </Badge>,
                ...(canManageUsers
                  ? [
                      <div className="grid min-w-[460px] gap-2" key="edit-coordinator">
                        <form
                          action={updateCoordinatorRecordAction}
                          className="grid gap-2 md:grid-cols-[1fr_130px_auto]"
                        >
                          <input name="coordinator_id" type="hidden" value={coordinator.id} />
                          <Input defaultValue={coordinator.name} name="name" required />
                          <Select
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
                            className="h-10 px-3"
                            confirmLabel="Guardar coordinador"
                            description="Se actualizarán el nombre y estado operativo del coordinador."
                            title="Modificar coordinador"
                            variant="secondary"
                          >
                            Guardar
                          </ConfirmActionButton>
                        </form>
                        {coordinator.profile_id ? (
                          <span className="text-xs text-muted-foreground">Con usuario vinculado</span>
                        ) : (
                          <form action={deleteCoordinatorRecordAction}>
                            <input name="coordinator_id" type="hidden" value={coordinator.id} />
                            <ConfirmActionButton
                              action={deleteCoordinatorRecordFeedbackAction}
                              affectedName={coordinator.name}
                              className="h-9 px-3"
                              confirmLabel="Desactivar coordinador"
                              danger
                              description="El coordinador se desactivará. Esta opción solo aplica cuando no tiene usuario vinculado."
                              title="Desactivar coordinador"
                            >
                              Desactivar coordinador
                            </ConfirmActionButton>
                          </form>
                        )}
                      </div>,
                      coordinator.users_profile?.id ? (
                        <form
                          action={updateCoordinatorUserAction}
                          className="grid min-w-[560px] gap-2"
                          key="edit-user"
                        >
                          <input name="coordinator_id" type="hidden" value={coordinator.id} />
                          <input name="user_id" type="hidden" value={coordinator.users_profile.id} />
                          <div className="grid gap-2 md:grid-cols-[1fr_140px_1fr_auto]">
                            <Input
                              defaultValue={coordinator.users_profile.email ?? ""}
                              name="email"
                              required
                              type="email"
                            />
                            <Select
                              defaultValue={
                                (coordinator.users_profile.active ?? coordinator.active)
                                  ? "true"
                                  : "false"
                              }
                              name="active"
                              required
                            >
                              <option value="true">Activo</option>
                              <option value="false">Inactivo</option>
                            </Select>
                            <Input name="password" placeholder="Nueva contraseña" type="password" />
                            <ConfirmActionButton
                              action={updateCoordinatorUserFeedbackAction}
                              affectedName={coordinator.name}
                              className="h-10 px-3"
                              confirmLabel="Guardar usuario"
                              description="Se actualizará el correo, estado y, si escribiste una nueva, la contraseña del usuario vinculado."
                              title="Modificar usuario del coordinador"
                              variant="secondary"
                            >
                              Guardar
                            </ConfirmActionButton>
                          </div>
                        </form>
                      ) : (
                        <span className="text-sm text-muted-foreground" key="no-user">
                          Sin usuario para editar
                        </span>
                      )
                    ]
                  : [])
              ];
            })}
          />
        }
      />
    </>
  );
}
