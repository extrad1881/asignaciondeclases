import { GitBranch, Plus } from "lucide-react";
import { ActionStateForm } from "@/components/ui/action-state-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataCard } from "@/components/ui/data-card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  advanceCohortAction,
  completeCohortStateAction,
  createCohortAction
} from "@/app/(dashboard)/actions/cohortes";

export type Cohort = {
  id: string;
  name: string;
  career_name: string;
  modality: string;
  shift: string;
  current_quarter: number;
  status: string;
};

const detailsClass =
  "rounded-md border border-line bg-panel [&>summary]:focus-ring [&>summary]:cursor-pointer [&>summary]:inline-flex [&>summary]:min-h-11 [&>summary]:items-center [&>summary]:gap-2 [&>summary]:rounded-md [&>summary]:border [&>summary]:border-line [&>summary]:bg-background [&>summary]:px-3 [&>summary]:py-1.5 [&>summary]:text-xs [&>summary]:font-semibold [&>summary]:text-ink [&>summary]:transition [&>summary]:hover:bg-accent [&>summary]:marker:hidden";

const statusLabel: Record<string, { label: string; tone: "success" | "info" | "neutral" }> = {
  active: { label: "Activa", tone: "success" },
  completed: { label: "Completada", tone: "info" },
  archived: { label: "Archivada", tone: "neutral" }
};

export function CohortCard({ cohort, canAdminister }: { cohort: Cohort; canAdminister: boolean }) {
  const status = statusLabel[cohort.status] ?? { label: cohort.status, tone: "neutral" as const };
  const shiftLabel = cohort.shift === "matutino" ? "Matutino" : "Vespertino";
  return (
    <DataCard
      actions={
        cohort.status === "active" ? (
          <div className="flex w-full flex-col gap-2">
            <ActionStateForm action={advanceCohortAction}>
              <input name="cohort_id" type="hidden" value={cohort.id} />
              <ConfirmActionButton
                affectedName={cohort.name}
                className="h-10 w-full"
                confirmLabel="Generar grupo pendiente"
                description="Acción de recuperación: solo se creará un grupo si esta cohorte todavía no tiene uno en el ciclo activo. Nunca crea duplicados."
                title="Recuperar automatización de cohorte"
              >
                <GitBranch className="h-4 w-4" aria-hidden />
                Generar grupo pendiente
              </ConfirmActionButton>
            </ActionStateForm>
            {canAdminister ? (
              <ActionStateForm action={completeCohortStateAction}>
                <input name="cohort_id" type="hidden" value={cohort.id} />
                <ConfirmActionButton
                  affectedName={cohort.name}
                  className="h-10 w-full"
                  confirmLabel="Completar cohorte"
                  description={`Se marcará la cohorte ${cohort.name} como completada.`}
                  title="Completar cohorte"
                  variant="secondary"
                >
                  Completar
                </ConfirmActionButton>
              </ActionStateForm>
            ) : null}
          </div>
        ) : null
      }
      badge={<Badge tone={status.tone}>{status.label}</Badge>}
      fields={[
        { label: "Carrera", value: cohort.career_name },
        { label: "Modalidad", value: cohort.modality },
        { label: "Turno", value: shiftLabel },
        { label: "Cuatrimestre", value: <Badge tone="brand">Q{cohort.current_quarter}</Badge> }
      ]}
      title={cohort.name}
    />
  );
}

export function CohortFormFields({ careers }: { careers: Array<{ id: string; code: string; name: string }> }) {
  return (
    <ActionStateForm
      action={createCohortAction}
      className="grid gap-3 md:grid-cols-[1fr_1fr_150px_150px_auto]"
    >
      <label className="text-sm font-medium text-ink">
        Nombre
        <Input className="mt-1" name="name" placeholder="Derecho Generación 2026" required />
      </label>
      <label className="text-sm font-medium text-ink">
        Carrera
        <Select className="mt-1" name="career_id" required>
          <option value="">Selecciona carrera</option>
          {careers.map((career) => (
            <option key={career.id} value={career.id}>
              {career.code} - {career.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="text-sm font-medium text-ink">
        Modalidad
        <Select className="mt-1" name="modality" required>
          <option value="escolarizado">Escolarizado</option>
          <option value="modular">Modular</option>
          <option value="virtual_modular">Virtual modular</option>
          <option value="maestrias">Maestrías</option>
          <option value="sabatino">Sabatino</option>
        </Select>
      </label>
      <label className="text-sm font-medium text-ink">
        Turno
        <Select className="mt-1" name="shift" required>
          <option value="matutino">Matutino</option>
          <option value="vespertino">Vespertino</option>
        </Select>
      </label>
      <div className="flex items-end">
        <Button className="h-10 w-full" type="submit">
          <Plus className="h-4 w-4" aria-hidden />
          Crear cohorte
        </Button>
      </div>
    </ActionStateForm>
  );
}
