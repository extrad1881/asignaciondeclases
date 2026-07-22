import { CalendarPlus, CheckCircle2, Inbox, Save, Zap } from "lucide-react";
import {
  activateCycleStateAction,
  archiveCycleStateAction,
  createCycleAction,
  finalizeCycleStateAction,
  updateCycleAction
} from "@/app/(dashboard)/actions/ciclos";
import { ActionStateForm } from "@/components/ui/action-state-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataCard } from "@/components/ui/data-card";
import { Input } from "@/components/ui/input";

export type Cycle = {
  id: string;
  code: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
};

const statusLabel: Record<string, { label: string; tone: "success" | "info" | "warning" | "neutral" }> = {
  active: { label: "Activo", tone: "success" },
  draft: { label: "Borrador", tone: "neutral" },
  finalized: { label: "Finalizado", tone: "info" },
  archived: { label: "Archivado", tone: "warning" }
};

const detailsClass =
  "rounded-md border border-line bg-panel [&>summary]:focus-ring [&>summary]:cursor-pointer [&>summary]:inline-flex [&>summary]:min-h-11 [&>summary]:items-center [&>summary]:gap-2 [&>summary]:rounded-md [&>summary]:border [&>summary]:border-line [&>summary]:bg-background [&>summary]:px-3 [&>summary]:py-1.5 [&>summary]:text-xs [&>summary]:font-semibold [&>summary]:text-ink [&>summary]:transition [&>summary]:hover:bg-accent [&>summary]:marker:hidden";

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

export function CycleCard({ cycle }: { cycle: Cycle }) {
  const status = statusLabel[cycle.status] ?? { label: cycle.status, tone: "neutral" as const };
  return (
    <DataCard
      actions={
        <div className="flex w-full flex-col gap-2">
          <details className={detailsClass}>
            <summary>
              <Save className="h-3 w-3" aria-hidden />
              Editar fechas
            </summary>
            <ActionStateForm action={updateCycleAction} className="mt-3 space-y-2">
              <input name="cycle_id" type="hidden" value={cycle.id} />
              <Input className="h-10" defaultValue={cycle.name} name="name" required />
              <Input
                className="h-10"
                defaultValue={cycle.starts_at ?? ""}
                name="starts_at"
                type="date"
              />
              <Input
                className="h-10"
                defaultValue={cycle.ends_at ?? ""}
                name="ends_at"
                type="date"
              />
              <ConfirmActionButton
                affectedName={cycle.name}
                className="h-10 w-full"
                confirmLabel="Guardar cambios"
                description="Se actualizarán el nombre y fechas del ciclo escolar."
                title="Modificar ciclo"
                variant="secondary"
              >
                <Save className="h-4 w-4" aria-hidden />
                Guardar
              </ConfirmActionButton>
            </ActionStateForm>
          </details>

          {cycle.status === "draft" ? (
            <ActionStateForm action={activateCycleStateAction}>
              <input name="cycle_id" type="hidden" value={cycle.id} />
              <ConfirmActionButton
                affectedName={cycle.name}
                className="h-10 w-full"
                confirmLabel="Activar ciclo"
                description={`Se activará el ciclo ${cycle.name}, se finalizará el anterior y se crearán los grupos siguientes de todas las cohortes inicializadas.`}
                title="Activar ciclo escolar"
              >
                <Zap className="h-4 w-4" aria-hidden />
                Activar y generar grupos
              </ConfirmActionButton>
            </ActionStateForm>
          ) : null}
          {cycle.status === "active" ? (
            <ActionStateForm action={finalizeCycleStateAction}>
              <input name="cycle_id" type="hidden" value={cycle.id} />
              <ConfirmActionButton
                affectedName={cycle.name}
                className="h-10 w-full"
                confirmLabel="Finalizar ciclo"
                description={`Se finalizará el ciclo ${cycle.name}. No podrá volver a activarse sin intervención.`}
                title="Finalizar ciclo escolar"
                variant="secondary"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Finalizar
              </ConfirmActionButton>
            </ActionStateForm>
          ) : null}
          {cycle.status === "finalized" ? (
            <ActionStateForm action={archiveCycleStateAction}>
              <input name="cycle_id" type="hidden" value={cycle.id} />
              <ConfirmActionButton
                affectedName={cycle.name}
                className="h-10 w-full"
                confirmLabel="Archivar ciclo"
                description={`Se archivará el ciclo ${cycle.name}.`}
                title="Archivar ciclo escolar"
                variant="secondary"
              >
                <Inbox className="h-4 w-4" aria-hidden />
                Archivar
              </ConfirmActionButton>
            </ActionStateForm>
          ) : null}
        </div>
      }
      badge={<Badge tone={status.tone}>{status.label}</Badge>}
      fields={[
        { label: "Código", value: cycle.code },
        { label: "Inicio", value: formatDate(cycle.starts_at) },
        { label: "Fin", value: formatDate(cycle.ends_at) }
      ]}
      title={cycle.name}
    />
  );
}

export function CycleFormFields() {
  return (
    <ActionStateForm
      action={createCycleAction}
      className="grid gap-3 md:grid-cols-[1fr_1fr_150px_150px_auto]"
    >
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
          <CalendarPlus className="h-4 w-4" aria-hidden />
          Crear ciclo
        </Button>
      </div>
    </ActionStateForm>
  );
}
