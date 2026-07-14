import { CheckCircle2, Inbox, Save, Zap } from "lucide-react";
import { redirect } from "next/navigation";
import { SectionHeader } from "@/components/section-header";
import { CycleCard, CycleFormFields } from "@/components/ciclos/cycle-card";
import { ActionStateForm } from "@/components/ui/action-state-form";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import {
  activateCycleAction,
  archiveCycleAction,
  finalizeCycleAction,
  updateCycleAction
} from "@/app/(dashboard)/actions";
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

  const cycleItems = (cycles ?? []).map((cycle: any) => ({
    id: cycle.id,
    code: cycle.code as string,
    name: cycle.name as string,
    starts_at: (cycle.starts_at as string | null) ?? null,
    ends_at: (cycle.ends_at as string | null) ?? null,
    status: cycle.status as string
  }));

  return (
    <>
      <SectionHeader eyebrow="Admin" title="Ciclos escolares">
        <Badge tone="info">Gestión de periodos académicos</Badge>
      </SectionHeader>

      <section className="mb-6 rounded-md border border-line bg-card p-4 shadow-subtle">
        <h2 className="mb-3 text-sm font-semibold text-ink">Crear ciclo escolar</h2>
        <CycleFormFields />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Ciclos registrados</h2>
        <ResponsiveTable
          cards={
            <ul className="grid gap-3 sm:grid-cols-2">
              {cycleItems.map((cycle) => (
                <li key={cycle.id}>
                  <CycleCard cycle={cycle} />
                </li>
              ))}
            </ul>
          }
          table={
            <DataTable
              emptyLabel="No hay ciclos escolares registrados."
              headers={["Código", "Nombre", "Inicio", "Fin", "Estado", "Editar", "Acciones"]}
              rows={(cycles ?? []).map((cycle: any) => [
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
                <ActionStateForm action={updateCycleAction} className="grid min-w-[480px] gap-2" key={`edit-${cycle.id}`}>
                  <input name="cycle_id" type="hidden" value={cycle.id} />
                  <div className="grid gap-2 md:grid-cols-3">
                    <Input className="h-8" defaultValue={cycle.name} name="name" required />
                    <Input className="h-8" defaultValue={cycle.starts_at ?? ""} name="starts_at" type="date" />
                    <Input className="h-8" defaultValue={cycle.ends_at ?? ""} name="ends_at" type="date" />
                  </div>
                  <ConfirmActionButton
                    affectedName={cycle.name}
                    className="h-8 px-3 text-xs"
                    confirmLabel="Guardar cambios"
                    description="Se actualizarán el nombre y fechas del ciclo escolar."
                    title="Modificar ciclo"
                    variant="secondary"
                  >
                    <Save className="h-3 w-3" aria-hidden />
                    Guardar
                  </ConfirmActionButton>
                </ActionStateForm>,
                <div className="flex flex-wrap gap-1" key={`actions-${cycle.id}`}>
                  {cycle.status === "draft" ? (
                    <form action={activateCycleAction}>
                      <input name="cycle_id" type="hidden" value={cycle.id} />
                      <ConfirmActionButton
                        affectedName={cycle.name}
                        className="h-8 px-3 text-xs"
                        confirmLabel="Activar ciclo"
                        description={`Se activará el ciclo ${cycle.name}. Si hay otro ciclo activo, se finalizará automáticamente.`}
                        title="Activar ciclo escolar"
                      >
                        <Zap className="h-3 w-3" aria-hidden />
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
                        description={`Se finalizará el ciclo ${cycle.name}. No podrá volver a activarse sin intervención.`}
                        title="Finalizar ciclo escolar"
                        variant="secondary"
                      >
                        <CheckCircle2 className="h-3 w-3" aria-hidden />
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
                        description={`Se archivará el ciclo ${cycle.name}.`}
                        title="Archivar ciclo escolar"
                        variant="secondary"
                      >
                        <Inbox className="h-3 w-3" aria-hidden />
                        Archivar
                      </ConfirmActionButton>
                    </form>
                  ) : null}
                </div>
              ])}
            />
          }
        />
      </section>
    </>
  );
}
