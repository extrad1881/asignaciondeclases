import { Save, Trash2, UserPlus } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { ProfileCheckboxGroup } from "@/components/forms/profile-checkbox-group";
import { ActionStateForm } from "@/components/ui/action-state-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataTableAdvanced, type DataTableAdvancedRow } from "@/components/ui/data-table-advanced";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  assignCoordinatorTeacherAction,
  assignCoordinatorTeacherFeedbackAction,
  createTeacherStateAction,
  setTeacherActiveAction,
  setTeacherActiveFeedbackAction,
  unassignCoordinatorTeacherAction,
  unassignCoordinatorTeacherFeedbackAction,
  updateTeacherMaxHoursAction,
  updateTeacherMaxHoursFeedbackAction,
  updateTeacherProfilesAction,
  updateTeacherProfilesFeedbackAction
} from "@/app/(dashboard)/actions";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { isAdmin } from "@/lib/permissions";
import { isValidProfileCode } from "@/lib/profiles";
import { formatHours } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const supabase = await createClient();
  const [profile, { data: teachers = [] }, { data: profiles = [] }, { data: coordinators = [] }] = await Promise.all([
    requireActiveProfileOrRedirect(),
    supabase
      .from("teachers")
      .select("id, name, max_hours, assigned_hours, active, coordinator_teachers(coordinators(id, name)), teacher_available_profiles(profile_code)")
      .order("name")
      .limit(300),
    supabase.from("teacher_profiles").select("code, name").order("code"),
    supabase.from("coordinators").select("id, name").eq("active", true).order("name")
  ]);
  const teacherRows = teachers ?? [];
  const canManageTeachers = isAdmin(profile?.role_code);
  const profileOptions = (profiles ?? []).filter((teacherProfile: any) => isValidProfileCode(teacherProfile.code));
  const coordinatorOptions = coordinators ?? [];

  const rows: DataTableAdvancedRow[] = teacherRows.map((teacher: any) => {
    const selectedProfiles = (teacher.teacher_available_profiles ?? [])
      .map((item: any) => item.profile_code)
      .filter(isValidProfileCode);
    const assignedCoordinators: Array<{ id: string; name: string }> = (teacher.coordinator_teachers ?? [])
      .map((ct: any) => ct.coordinators)
      .filter(Boolean);
    const coordinatorNames = assignedCoordinators.map((c) => c.name);
    const statusLabel = teacher.active ? "Activo" : "Inactivo";

    return {
      id: teacher.id,
      searchText: [teacher.name, ...coordinatorNames, selectedProfiles.join(" "), statusLabel].join(" "),
      filters: {
        coordinador: coordinatorNames[0] ?? "Sin asignar",
        estado: statusLabel,
        perfil: selectedProfiles[0] ?? "Sin perfil"
      },
      cells: [
        <span className="font-semibold text-ink" key="name">{teacher.name}</span>,
        <div className="flex flex-wrap gap-1 min-w-32" key="coordinators">
          {assignedCoordinators.length === 0 ? (
            <span className="text-muted text-xs">Sin asignar</span>
          ) : (
            assignedCoordinators.map((coordinator) => (
              <span className="inline-flex items-center gap-1 rounded bg-panel px-1.5 py-0.5 text-xs font-medium text-ink" key={coordinator.id}>
                {coordinator.name}
                {canManageTeachers ? (
                  <form action={unassignCoordinatorTeacherAction}>
                    <input name="teacher_id" type="hidden" value={teacher.id} />
                    <input name="coordinator_id" type="hidden" value={coordinator.id} />
                    <ConfirmActionButton
                      action={unassignCoordinatorTeacherFeedbackAction}
                      affectedName={`${coordinator.name} de ${teacher.name}`}
                      className="h-4 w-4 p-0 text-[10px] leading-none hover:text-destructive"
                      confirmLabel="Remover coordinador"
                      description={`Se removerá a ${coordinator.name} de los coordinadores asignados a ${teacher.name}.`}
                      title="Remover coordinador"
                      variant="ghost"
                    >
                      ×
                    </ConfirmActionButton>
                  </form>
                ) : null}
              </span>
            ))
          )}
        </div>,
        <div className="flex flex-wrap gap-1" key="profiles">
          {selectedProfiles.length === 0 ? (
            <span className="text-muted">Sin perfiles</span>
          ) : (
            selectedProfiles.map((profileCode: string) => <Badge key={profileCode}>{profileCode}</Badge>)
          )}
        </div>,
        canManageTeachers ? (
          <div className="grid min-w-48 gap-1" key="hours-cell">
            <span className="text-xs font-medium tabular-nums text-ink">
              {formatHours(teacher.assigned_hours)} / {formatHours(teacher.max_hours)}
            </span>
            <form action={updateTeacherMaxHoursAction} className="flex items-center gap-1">
              <input name="teacher_id" type="hidden" value={teacher.id} />
              <Input
                className="h-8 w-16 text-xs"
                defaultValue={teacher.max_hours}
                min={teacher.assigned_hours ?? 0}
                name="max_hours"
                step={0.5}
                type="number"
              />
              <ConfirmActionButton
                action={updateTeacherMaxHoursFeedbackAction}
                affectedName={teacher.name}
                className="h-8 px-2 text-xs"
                confirmLabel="Guardar horas"
                description="Se actualizarán las horas máximas del docente. No puede quedar por debajo de las horas ya asignadas."
                title="Modificar horas máximas"
                variant="secondary"
              >
                <Save className="h-3 w-3" />
              </ConfirmActionButton>
            </form>
          </div>
        ) : (
          `${formatHours(teacher.assigned_hours)} / ${formatHours(teacher.max_hours)}`
        ),
        <Badge key="state" tone={teacher.active ? "success" : "warning"}>
          {statusLabel}
        </Badge>,
        ...(canManageTeachers
          ? [
              <form action={updateTeacherProfilesAction} className="grid min-w-56 gap-2" key="profiles-form">
                <input name="teacher_id" type="hidden" value={teacher.id} />
                <ProfileCheckboxGroup maxHeight="max-h-36" profiles={profileOptions as any[]} selected={selectedProfiles} />
                <ConfirmActionButton
                  action={updateTeacherProfilesFeedbackAction}
                  affectedName={teacher.name}
                  className="h-8 px-3"
                  confirmLabel="Guardar perfiles"
                  description="Se reemplazarán los perfiles aptos del docente. Las próximas asignaciones validarán contra esta lista."
                  title="Modificar perfiles del docente"
                  variant="secondary"
                >
                  <Save className="h-4 w-4" />
                  Guardar
                </ConfirmActionButton>
              </form>,
              <form action={assignCoordinatorTeacherAction} className="grid min-w-52 gap-2" key="coordinator-form">
                <input name="teacher_id" type="hidden" value={teacher.id} />
                <Select defaultValue={teacher.responsible_coordinator_id ?? coordinatorOptions[0]?.id ?? ""} name="coordinator_id" required>
                  {coordinatorOptions.map((coordinator: any) => (
                    <option key={coordinator.id} value={coordinator.id}>
                      {coordinator.name}
                    </option>
                  ))}
                </Select>
                <ConfirmActionButton
                  action={assignCoordinatorTeacherFeedbackAction}
                  affectedName={teacher.name}
                  className="h-8 px-3"
                  confirmLabel="Asignar coordinador"
                  description="El docente quedará bajo el coordinador seleccionado y se ajustará su alcance de gestión."
                  disabled={coordinatorOptions.length === 0}
                  title="Cambiar coordinador del docente"
                  variant="secondary"
                >
                  Asignar
                </ConfirmActionButton>
              </form>,
              <form action={setTeacherActiveAction} key="active-form">
                <input name="teacher_id" type="hidden" value={teacher.id} />
                <input name="active" type="hidden" value={teacher.active ? "false" : "true"} />
                <ConfirmActionButton
                  action={setTeacherActiveFeedbackAction}
                  affectedName={teacher.name}
                  className="h-8 px-3"
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
                  {teacher.active ? <Trash2 className="h-4 w-4" /> : null}
                  {teacher.active ? "Quitar" : "Reactivar"}
                </ConfirmActionButton>
              </form>
            ]
          : [])
      ]
    };
  });

  return (
    <>
      <SectionHeader
        eyebrow="Catálogo"
        title="Docentes"
        description="Administra docentes, perfiles aptos, coordinador responsable y disponibilidad de horas para asignaciones."
      />
      {canManageTeachers ? (
        <section className="mb-6 rounded-md border border-line bg-card p-4 shadow-subtle">
          <h2 className="mb-1 text-lg font-semibold text-ink">Agregar docente</h2>
          <p className="mb-3 text-sm text-muted">Registra datos mínimos y perfiles aptos antes de asignar clases.</p>
          <ActionStateForm action={createTeacherStateAction} className="grid gap-3 md:grid-cols-[1fr_140px_220px_auto]" alertClassName="md:col-span-full">
            <label className="text-sm font-semibold text-ink">
              Nombre
              <Input className="mt-1" name="name" placeholder="Nombre del docente" required />
            </label>
            <label className="text-sm font-semibold text-ink">
              Horas máximas
              <Input className="mt-1" defaultValue={20} min={0} name="max_hours" required step={0.5} type="number" />
            </label>
            <div className="text-sm font-semibold text-ink">
              Perfiles aptos
              <div className="mt-1">
                <ProfileCheckboxGroup profiles={profileOptions as any[]} />
              </div>
            </div>
            <div className="flex items-end">
              <Button className="w-full" type="submit">
                <UserPlus className="h-4 w-4" />
                Agregar
              </Button>
            </div>
          </ActionStateForm>
        </section>
      ) : null}
      <DataTableAdvanced
        emptyDescription="Agrega docentes para poder asignarlos a materias y validar perfiles requeridos."
        emptyLabel="No hay docentes registrados."
        filters={[
          { key: "coordinador", label: "Coordinador" },
          { key: "estado", label: "Estado" },
          { key: "perfil", label: "Perfil" }
        ]}
        headers={
          canManageTeachers
            ? ["Docente", "Coordinadores", "Perfiles aptos", "Horas", "Estado", "Editar perfiles", "Agregar coordinador", "Acciones"]
            : ["Docente", "Coordinadores", "Perfiles aptos", "Horas", "Estado"]
        }
        rows={rows}
      />
    </>
  );
}
