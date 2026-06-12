import { Save, Trash2, UserPlus } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataTable } from "@/components/ui/data-table";
import { ProfileCheckboxGroup } from "@/components/forms/profile-checkbox-group";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  assignCoordinatorTeacherAction,
  createTeacherAction,
  setTeacherActiveAction,
  updateTeacherProfilesAction
} from "@/app/(dashboard)/actions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { isAdmin } from "@/lib/permissions";
import { isValidProfileCode } from "@/lib/profiles";
import { formatHours } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  const supabase = await createClient();
  const [profile, { data: teachers = [] }, { data: profiles = [] }, { data: coordinators = [] }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("teachers")
      .select("id, name, email, max_hours, assigned_hours, active, responsible_coordinator_id, teacher_available_profiles(profile_code)")
      .order("name")
      .limit(300),
    supabase.from("teacher_profiles").select("code, name").order("code"),
    supabase.from("coordinators").select("id, name").eq("active", true).order("name")
  ]);
  const teacherRows = teachers ?? [];
  const canManageTeachers = isAdmin(profile?.role_code);
  const profileOptions = (profiles ?? []).filter((teacherProfile: any) => isValidProfileCode(teacherProfile.code));
  const coordinatorOptions = coordinators ?? [];

  return (
    <>
      <SectionHeader eyebrow="Catálogo" title="Docentes" />
      {canManageTeachers ? (
        <section className="mb-6 rounded-md border border-line bg-white p-4 shadow-subtle">
          <h2 className="mb-3 text-lg font-semibold text-ink">Agregar docente</h2>
          <form action={createTeacherAction} className="grid gap-3 md:grid-cols-[1fr_1fr_140px_220px_auto]">
            <label className="text-sm font-medium text-slate-700">
              Nombre
              <Input className="mt-1" name="name" placeholder="Nombre del docente" required />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Correo
              <Input className="mt-1" name="email" placeholder="correo@institucion.edu" type="email" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Horas máximas
              <Input className="mt-1" defaultValue={20} min={0} name="max_hours" required step={0.5} type="number" />
            </label>
            <div className="text-sm font-medium text-slate-700">
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
          </form>
        </section>
      ) : null}
      <DataTable
        headers={
          canManageTeachers
            ? ["Docente", "Correo", "Coordinador", "Perfiles aptos", "Horas", "Estado", "Editar perfiles", "Asignar coordinador", "Acciones"]
            : ["Docente", "Correo", "Coordinador", "Perfiles aptos", "Horas", "Estado"]
        }
        rows={teacherRows.map((teacher: any) => [
          <span className="font-medium text-ink" key="name">{teacher.name}</span>,
          teacher.email ?? <span className="text-slate-400">Sin correo</span>,
          coordinatorOptions.find((coordinator: any) => coordinator.id === teacher.responsible_coordinator_id)?.name ?? (
            <span className="text-slate-400">Sin asignar</span>
          ),
          <div className="flex flex-wrap gap-1" key="profiles">
            {((teacher.teacher_available_profiles ?? []).filter((profile: any) => isValidProfileCode(profile.profile_code))).length === 0 ? (
              <span className="text-slate-400">Sin perfiles</span>
            ) : (
              (teacher.teacher_available_profiles ?? []).filter((profile: any) => isValidProfileCode(profile.profile_code)).map((profile: any) => (
                <Badge key={profile.profile_code}>{profile.profile_code}</Badge>
              ))
            )}
          </div>,
          `${formatHours(teacher.assigned_hours)} / ${formatHours(teacher.max_hours)}`,
          <Badge key="state" tone={teacher.active ? "success" : "warning"}>
            {teacher.active ? "Activo" : "Inactivo"}
          </Badge>,
          ...(canManageTeachers
            ? [
                <form action={updateTeacherProfilesAction} className="grid min-w-56 gap-2" key="profiles-form">
                  <input name="teacher_id" type="hidden" value={teacher.id} />
                  <ProfileCheckboxGroup
                    maxHeight="max-h-36"
                    profiles={profileOptions as any[]}
                    selected={(teacher.teacher_available_profiles ?? [])
                      .map((item: any) => item.profile_code)
                      .filter(isValidProfileCode)}
                  />
                  <ConfirmActionButton
                    affectedName={teacher.name}
                    className="h-8 px-3"
                    confirmLabel="Guardar perfiles"
                    description="Se reemplazaran los perfiles aptos del docente. Las proximas asignaciones validaran contra esta lista."
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
                    affectedName={teacher.name}
                    className="h-8 px-3"
                    confirmLabel="Asignar coordinador"
                    description="El docente quedara bajo el coordinador seleccionado y se ajustara su alcance de gestion."
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
                    affectedName={teacher.name}
                    className="h-8 px-3"
                    confirmLabel={teacher.active ? "Desactivar docente" : "Reactivar docente"}
                    danger={teacher.active}
                    description={
                      teacher.active
                        ? "El docente dejara de estar disponible para nuevas asignaciones."
                        : "El docente volvera a estar disponible para asignaciones."
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
        ])}
      />
    </>
  );
}
