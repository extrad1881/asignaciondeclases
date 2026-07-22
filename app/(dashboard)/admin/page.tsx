import { redirect } from "next/navigation";
import { SectionHeader } from "@/components/section-header";
import { UserCard, type AdminUser } from "@/components/admin/user-card";
import {
  assignCoordinatorCareerAction,
  assignCoordinatorCareerFeedbackAction,
  assignCoordinatorTeacherAction,
  assignCoordinatorTeacherFeedbackAction,
  createUserStateAction,
  updateUserFeedbackAction
} from "@/app/(dashboard)/actions";
import { ActionStateForm } from "@/components/ui/action-state-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await requireActiveProfileOrRedirect();
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

  const users: AdminUser[] = (profiles ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    display_name: u.display_name ?? "",
    role_code: u.role_code ?? "coordinator",
    active: Boolean(u.active)
  }));

  return (
    <>
      <SectionHeader eyebrow="Administración" title="Panel de administración" />
      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ActionStateForm action={createUserStateAction} className="grid gap-3 rounded-md border border-line bg-card p-4 shadow-subtle">
          <h2 className="text-lg font-semibold text-ink">Crear usuario</h2>
          <label className="grid gap-1 text-sm font-medium text-ink">
            Nombre
            <Input name="display_name" placeholder="Nombre" required />
          </label>
          <label className="grid gap-1 text-sm font-medium text-ink">
            Correo
            <Input name="email" placeholder="correo@institucion.edu" required type="email" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-ink">
            Contraseña temporal
            <Input name="password" placeholder="Contraseña temporal" required type="password" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-ink">
            Rol
            <Select name="role_code" required>
              <option value="coordinator">Coordinador</option>
              <option value="admin">Administrador</option>
            </Select>
          </label>
          <Button type="submit">Crear</Button>
        </ActionStateForm>

        <form action={assignCoordinatorCareerAction} className="grid gap-3 rounded-md border border-line bg-card p-4 shadow-subtle">
          <h2 className="text-lg font-semibold text-ink">Asignar carrera</h2>
          <Select name="coordinator_id" required>
            {(coordinators ?? []).map((coordinator) => (
              <option key={coordinator.id} value={coordinator.id}>{coordinator.name}</option>
            ))}
          </Select>
          <Select name="career_id" required>
            {(careers ?? []).map((career) => (
              <option key={career.id} value={career.id}>{career.code} · {career.name}</option>
            ))}
          </Select>
          <ConfirmActionButton
            action={assignCoordinatorCareerFeedbackAction}
            confirmLabel="Asignar carrera"
            description="Se vinculará la carrera seleccionada al coordinador elegido."
            title="Asignar carrera a coordinador"
          >
            Asignar
          </ConfirmActionButton>
        </form>

        <form action={assignCoordinatorTeacherAction} className="grid gap-3 rounded-md border border-line bg-card p-4 shadow-subtle">
          <h2 className="text-lg font-semibold text-ink">Asignar docente</h2>
          <Select name="coordinator_id" required>
            {(coordinators ?? []).map((coordinator) => (
              <option key={coordinator.id} value={coordinator.id}>{coordinator.name}</option>
            ))}
          </Select>
          <Select name="teacher_id" required>
            {(teachers ?? []).map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
            ))}
          </Select>
          <ConfirmActionButton
            action={assignCoordinatorTeacherFeedbackAction}
            confirmLabel="Asignar docente"
            description="Se vinculará el docente seleccionado al coordinador elegido."
            title="Asignar docente a coordinador"
          >
            Asignar
          </ConfirmActionButton>
        </form>
      </section>
      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-ink">Usuarios</h2>
        <ResponsiveTable
          cards={
            <ul className="grid gap-3 sm:grid-cols-2">
              {users.map((user) => (
                <li key={user.id}>
                  <UserCard user={user} />
                </li>
              ))}
            </ul>
          }
          table={
            <DataTable
              headers={["Correo", "Nombre", "Rol", "Estado", "Modificar"]}
              rows={users.map((user) => [
                user.email,
                user.display_name,
                <Badge key="role" tone={user.role_code === "admin" ? "brand" : "info"}>
                  {user.role_code === "admin" ? "Administrador" : "Coordinador"}
                </Badge>,
                <Badge key="state" tone={user.active ? "success" : "warning"}>
                  {user.active ? "Activo" : "Inactivo"}
                </Badge>,
                <form
                  action={updateUserAction}
                  className="grid min-w-[520px] gap-2"
                  key={user.id}
                >
                  <input name="user_id" type="hidden" value={user.id} />
                  <div className="grid gap-2 md:grid-cols-2">
                    <Input defaultValue={user.email} name="email" required type="email" />
                    <Input defaultValue={user.display_name} name="display_name" required />
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <Select defaultValue={user.role_code} name="role_code" required>
                      <option value="coordinator">Coordinador</option>
                      <option value="admin">Administrador</option>
                    </Select>
                    <Select defaultValue={user.active ? "true" : "false"} name="active" required>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </Select>
                    <Input name="password" placeholder="Nueva contraseña" type="password" />
                  </div>
                  <ConfirmActionButton
                    action={updateUserFeedbackAction}
                    affectedName={user.email}
                    className="h-8 px-3"
                    confirmLabel="Guardar cambios"
                    description="Se actualizarán correo, nombre, rol, estado y contraseña si fue capturada."
                    title="Modificar usuario"
                    variant="secondary"
                  >
                    Guardar cambios
                  </ConfirmActionButton>
                </form>
              ])}
            />
          }
        />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Auditoría reciente</h2>
        <DataTable
          headers={["Fecha", "Usuario", "Acción", "Tabla", "Registro"]}
          rows={(logs ?? []).map((log) => [
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

import { updateUserAction } from "@/app/(dashboard)/actions";
