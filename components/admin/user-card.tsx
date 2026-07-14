import { Save } from "lucide-react";
import { updateUserAction, updateUserFeedbackAction } from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataCard } from "@/components/ui/data-card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type AdminUser = {
  id: string;
  email: string;
  display_name: string;
  role_code: string;
  active: boolean;
};

const detailsClass =
  "rounded-md border border-line bg-panel [&>summary]:focus-ring [&>summary]:cursor-pointer [&>summary]:inline-flex [&>summary]:min-h-11 [&>summary]:items-center [&>summary]:gap-2 [&>summary]:rounded-md [&>summary]:border [&>summary]:border-line [&>summary]:bg-background [&>summary]:px-3 [&>summary]:py-1.5 [&>summary]:text-xs [&>summary]:font-semibold [&>summary]:text-ink [&>summary]:transition [&>summary]:hover:bg-accent [&>summary]:marker:hidden";

export function UserCard({ user }: { user: AdminUser }) {
  const roleLabel = user.role_code === "admin" ? "Administrador" : "Coordinador";
  return (
    <DataCard
      actions={
        <div className="flex w-full flex-col gap-2">
          <details className={detailsClass}>
            <summary>
              <Save className="h-3 w-3" aria-hidden />
              Modificar usuario
            </summary>
            <form action={updateUserAction} className="mt-3 space-y-2">
              <input name="user_id" type="hidden" value={user.id} />
              <label className="block text-xs font-semibold text-muted">
                Correo
                <Input
                  className="mt-1 h-10"
                  defaultValue={user.email}
                  name="email"
                  required
                  type="email"
                />
              </label>
              <label className="block text-xs font-semibold text-muted">
                Nombre
                <Input
                  className="mt-1 h-10"
                  defaultValue={user.display_name}
                  name="display_name"
                  required
                />
              </label>
              <label className="block text-xs font-semibold text-muted">
                Rol
                <Select
                  className="mt-1 h-10"
                  defaultValue={user.role_code}
                  name="role_code"
                  required
                >
                  <option value="coordinator">Coordinador</option>
                  <option value="admin">Administrador</option>
                </Select>
              </label>
              <label className="block text-xs font-semibold text-muted">
                Estado
                <Select
                  className="mt-1 h-10"
                  defaultValue={user.active ? "true" : "false"}
                  name="active"
                  required
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </Select>
              </label>
              <label className="block text-xs font-semibold text-muted">
                Nueva contraseña
                <Input
                  className="mt-1 h-10"
                  name="password"
                  placeholder="Dejar vacío para mantener"
                  type="password"
                />
              </label>
              <ConfirmActionButton
                action={updateUserFeedbackAction}
                affectedName={user.email}
                className="h-10 w-full"
                confirmLabel="Guardar cambios"
                description="Se actualizarán correo, nombre, rol, estado y contraseña si fue capturada."
                title="Modificar usuario"
                variant="secondary"
              >
                <Save className="h-4 w-4" aria-hidden />
                Guardar cambios
              </ConfirmActionButton>
            </form>
          </details>
        </div>
      }
      badge={
        <Badge tone={user.role_code === "admin" ? "brand" : "info"}>{roleLabel}</Badge>
      }
      fields={[
        { label: "Correo", value: user.email },
        { label: "Nombre", value: user.display_name },
        {
          label: "Estado",
          value: (
            <Badge tone={user.active ? "success" : "warning"}>
              {user.active ? "Activo" : "Inactivo"}
            </Badge>
          )
        }
      ]}
      subtitle={user.email}
      title={user.display_name}
    />
  );
}
