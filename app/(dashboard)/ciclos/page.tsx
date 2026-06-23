export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { CalendarPlus, CheckCircle2, Inbox, PenLine, Save, Zap } from "lucide-react";
import { activateCycleAction, archiveCycleAction, createCycleAction, finalizeCycleAction, updateCycleAction } from "@/app/(dashboard)/actions/ciclos";
import { SectionHeader } from "@/components/section-header";
import { ActionStateForm } from "@/components/ui/action-state-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { isAdmin } from "@/lib/permissions";

export default async function CiclosPage() {
  const profile = await requireActiveProfileOrRedirect();
  if (!isAdmin(profile?.role_code)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: cycles = [] } = await supabase
    .from("academic_cycles")
    .select("id, code, name, starts_at, ends_at, status")
    .order("code");

  return (
    <>
      <SectionHeader eyebrow="Admin" title="Ciclos escolares">
        <Badge tone="info">Gestión de periodos académicos</Badge>
      </SectionHeader>

      <section className="mb-6 rounded-md border border-line bg-card p-4 shadow-subtle">
        <h3 className="mb-3 text-sm font-semibold text-ink">Crear ciclo escolar</h3>
        <ActionStateForm action={createCycleAction} className="grid gap-3 md:grid-cols-[1fr_1fr_150px_150px_auto]">
          <label className="text-sm font-medium text-ink">
            Código
            <Input className="mt-1" name="code" placeholder="26-2" required />
          </label>
          <label className="text-sm font-medium text-ink">
            Nombre
            <Input className="mt-1" name="name" placeholder="Ciclo escolar 26-2" required />
          </label>
          <label className="text-sm font-medium text-ink">
            Fecha inicio
            <Input className="mt-1" name="starts_at" type="date" />
          </label>
          <label className="text-sm font-medium text-ink">
            Fecha fin
            <Input className="mt-1" name="ends_at" type="date" />
          </label>
          <div className="flex items-end">
            <Button className="h-10 w-full" type="submit">
              <CalendarPlus className="h-4 w-4" />
              Crear ciclo
            </Button>
          </div>
        </ActionStateForm>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-ink">Ciclos registrados</h3>
        <DataTable
          emptyLabel="No hay ciclos escolares registrados."
          headers={["Código", "Nombre", "Inicio", "Fin", "Estado", "Editar", "Acciones"]}
          rows={(cycles as any[]).map((cycle) => [
            cycle.code,
            cycle.name,
            cycle.starts_at ? new Date(cycle.starts_at).toLocaleDateString("es-MX") : "Sin fecha",
            cycle.ends_at ? new Date(cycle.ends_at).toLocaleDateString("es-MX") : "Sin fecha",
            <Badge
              key="status"
              tone={
                cycle.status === "active" ? "success" :
                cycle.status === "draft" ? "neutral" :
                cycle.status === "finalized" ? "info" : "warning"
              }
            >
              {cycle.status === "active" ? "Activo" :
               cycle.status === "draft" ? "Borrador" :
               cycle.status === "finalized" ? "Finalizado" : "Archivado"}
            </Badge>,
            <ActionStateForm action={updateCycleAction} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]" key={`edit-${cycle.id}`}>
              <input name="cycle_id" type="hidden" value={cycle.id} />
              <Input className="h-8" defaultValue={cycle.name} name="name" />
              <Input className="h-8" defaultValue={cycle.starts_at ?? ""} name="starts_at" type="date" />
              <Input className="h-8" defaultValue={cycle.ends_at ?? ""} name="ends_at" type="date" />
              <ConfirmActionButton
                affectedName={cycle.name}
                className="h-8 px-3 text-xs"
                confirmLabel="Guardar cambios"
                description="Se actualizara el nombre y fechas del ciclo escolar."
                title="Modificar ciclo"
                variant="secondary"
              >
                <Save className="h-3 w-3" />
                Guardar
              </ConfirmActionButton>
            </ActionStateForm>,
            <div className="flex flex-wrap gap-1" key="actions">
              {cycle.status === "draft" ? (
                <form action={activateCycleAction}>
                  <input name="cycle_id" type="hidden" value={cycle.id} />
                  <ConfirmActionButton
                    affectedName={cycle.name}
                    className="h-8 px-3 text-xs"
                    confirmLabel="Activar ciclo"
                    description={`Se activara el ciclo ${cycle.name}. Si hay otro ciclo activo, se finalizara automaticamente.`}
                    title="Activar ciclo escolar"
                  >
                    <Zap className="h-3 w-3" />
                    Activar
                  </ConfirmActionButton>
                </form>
              ) : null}
              {cycle.status === "active" ? (
                <form action={finalizeCycleAction}>
                  <input name="cycle_id" type="hidden" value={cycle.id} />
                  <ConfirmActionButton
                    affectedName={cycle.name}
                    className="h-8 px-3 text-xs"
                    confirmLabel="Finalizar ciclo"
                    description={`Se finalizara el ciclo ${cycle.name}. No podra volver a activarse sin intervencion.`}
                    title="Finalizar ciclo escolar"
                    variant="secondary"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Finalizar
                  </ConfirmActionButton>
                </form>
              ) : null}
              {cycle.status === "finalized" ? (
                <form action={archiveCycleAction}>
                  <input name="cycle_id" type="hidden" value={cycle.id} />
                  <ConfirmActionButton
                    affectedName={cycle.name}
                    className="h-8 px-3 text-xs"
                    confirmLabel="Archivar ciclo"
                    description={`Se archivara el ciclo ${cycle.name}.`}
                    title="Archivar ciclo escolar"
                    variant="secondary"
                  >
                    <Inbox className="h-3 w-3" />
                    Archivar
                  </ConfirmActionButton>
                </form>
              ) : null}
            </div>
          ])}
        />
      </section>
    </>
  );
}
