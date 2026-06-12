import { redirect } from "next/navigation";
import { SectionHeader } from "@/components/section-header";
import {
  assignCoordinatorCareerAction,
  assignCoordinatorTeacherAction,
  createUserAction,
  updateUserAction
} from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile?.role_code)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: profiles = [] }, { data: logs = [] }, { data: coordinators = [] }, { data: careers = [] }, { data: teachers = [] }] = await Promise.all([
    supabase.from("users_profile").select("id, email, display_name, role_code, active").order("email"),
    supabase
      .from("audit_logs")
      .select("id, action_type, table_name, record_id, created_at, users_profile(email)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("coordinators").select("id, name").eq("active", true).order("name"),
    supabase.from("careers").select("id, code, name").eq("active", true).order("code"),
    supabase.from("teachers").select("id, name").eq("active", true).order("name").limit(300)
  ]);

  return (
    <>
      <SectionHeader eyebrow="Administración" title="Panel de administración" />
      <section className="mb-6 grid gap-4 xl:grid-cols-3">
        <form action={createUserAction} className="grid gap-3 rounded-md border border-line bg-white p-4 shadow-subtle">
          <h2 className="text-lg font-semibold text-ink">Crear usuario</h2>
          <Input name="display_name" placeholder="Nombre" required />
          <Input name="email" placeholder="correo@institucion.edu" required type="email" />
          <Input name="password" placeholder="Contraseña temporal" required type="password" />
          <Select name="role_code" required>
            <option value="coordinator">Coordinador</option>
            <option value="admin">Administrador</option>
          </Select>
          <Button type="submit">Crear</Button>
        </form>

        <form action={assignCoordinatorCareerAction} className="grid gap-3 rounded-md border border-line bg-white p-4 shadow-subtle">
          <h2 className="text-lg font-semibold text-ink">Asignar carrera</h2>
          <Select name="coordinator_id" required>
            {(coordinators ?? []).map((coordinator: any) => (
              <option key={coordinator.id} value={coordinator.id}>{coordinator.name}</option>
            ))}
          </Select>
          <Select name="career_id" required>
            {(careers ?? []).map((career: any) => (
              <option key={career.id} value={career.id}>{career.code} · {career.name}</option>
            ))}
          </Select>
          <ConfirmActionButton
            confirmLabel="Asignar carrera"
            description="Se vinculara la carrera seleccionada al coordinador elegido."
            title="Asignar carrera a coordinador"
          >
            Asignar
          </ConfirmActionButton>
        </form>

        <form action={assignCoordinatorTeacherAction} className="grid gap-3 rounded-md border border-line bg-white p-4 shadow-subtle">
          <h2 className="text-lg font-semibold text-ink">Asignar docente</h2>
          <Select name="coordinator_id" required>
            {(coordinators ?? []).map((coordinator: any) => (
              <option key={coordinator.id} value={coordinator.id}>{coordinator.name}</option>
            ))}
          </Select>
          <Select name="teacher_id" required>
            {(teachers ?? []).map((teacher: any) => (
              <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
            ))}
          </Select>
          <ConfirmActionButton
            confirmLabel="Asignar docente"
            description="Se vinculara el docente seleccionado al coordinador elegido."
            title="Asignar docente a coordinador"
          >
            Asignar
          </ConfirmActionButton>
        </form>
      </section>
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-ink">Usuarios</h2>
        <DataTable
          headers={["Correo", "Nombre", "Rol", "Estado", "Modificar"]}
          rows={(profiles as any[]).map((profile) => [
            profile.email,
            profile.display_name,
            profile.role_code,
            profile.active ? "Activo" : "Inactivo",
            <form action={updateUserAction} className="grid min-w-[520px] gap-2" key={profile.id}>
              <input name="user_id" type="hidden" value={profile.id} />
              <div className="grid gap-2 md:grid-cols-2">
                <Input defaultValue={profile.email} name="email" required type="email" />
                <Input defaultValue={profile.display_name} name="display_name" required />
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <Select defaultValue={profile.role_code} name="role_code" required>
                  <option value="coordinator">Coordinador</option>
                  <option value="admin">Administrador</option>
                </Select>
                <Select defaultValue={profile.active ? "true" : "false"} name="active" required>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </Select>
                <Input name="password" placeholder="Nueva contraseña" type="password" />
              </div>
              <ConfirmActionButton
                affectedName={profile.email}
                className="h-8 px-3"
                confirmLabel="Guardar cambios"
                description="Se actualizaran correo, nombre, rol, estado y contrasena si fue capturada."
                title="Modificar usuario"
                variant="secondary"
              >
                Guardar cambios
              </ConfirmActionButton>
            </form>
          ])}
        />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Auditoría reciente</h2>
        <DataTable
          headers={["Fecha", "Usuario", "Acción", "Tabla", "Registro"]}
          rows={(logs as any[]).map((log) => [
            new Date(log.created_at).toLocaleString("es-MX"),
            log.users_profile?.email ?? "Sistema",
            log.action_type,
            log.table_name,
            log.record_id
          ])}
        />
      </section>
    </>
  );
}
