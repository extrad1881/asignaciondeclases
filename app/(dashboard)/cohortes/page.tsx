export const dynamic = "force-dynamic";
import Link from "next/link";
import { GitBranch, Plus } from "lucide-react";
import { createCohortAction, advanceCohortAction, completeCohortAction, archiveCohortAction } from "@/app/(dashboard)/actions/cohortes";
import { SectionHeader } from "@/components/section-header";
import { ActionStateForm } from "@/components/ui/action-state-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MODALITIES, SHIFTS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";

export default async function CohortesPage() {
  const profile = await requireActiveProfileOrRedirect();
  const supabase = await createClient();

  const { data: cohorts = [] } = await (supabase as any)
    .from("cohort_groups")
    .select("id, name, career_id, modality, shift, current_quarter, status, careers(code, name)")
    .order("name");

  const { data: careers = [] } = await supabase
    .from("careers")
    .select("id, code, name")
    .eq("active", true)
    .order("code");

  return (
    <>
      <SectionHeader eyebrow="Cohortes" title="Grupos padre">
        <Badge tone="info">Seguimiento curricular por cuatrimestre</Badge>
      </SectionHeader>

      <section className="mb-6 rounded-md border border-line bg-card p-4 shadow-subtle">
        <h3 className="mb-3 text-sm font-semibold text-ink">Crear cohorte</h3>
        <ActionStateForm action={createCohortAction} className="grid gap-3 md:grid-cols-[1fr_1fr_150px_150px_auto]">
          <label className="text-sm font-medium text-ink">
            Nombre
            <Input className="mt-1" name="name" placeholder="Derecho Generación 2026" required />
          </label>
          <label className="text-sm font-medium text-ink">
            Carrera
            <Select className="mt-1" name="career_id" required>
              <option value="">Selecciona carrera</option>
              {(careers as any[]).map((career) => (
                <option key={career.id} value={career.id}>{career.code} - {career.name}</option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium text-ink">
            Modalidad
            <Select className="mt-1" name="modality" required>
              {MODALITIES.map((mod) => (
                <option key={mod.value} value={mod.value}>{mod.label}</option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium text-ink">
            Turno
            <Select className="mt-1" name="shift" required>
              {SHIFTS.map((shift) => (
                <option key={shift.value} value={shift.value}>{shift.label}</option>
              ))}
            </Select>
          </label>
          <div className="flex items-end">
            <Button className="h-10 w-full" type="submit">
              <Plus className="h-4 w-4" />
              Crear cohorte
            </Button>
          </div>
        </ActionStateForm>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-ink">Cohortes activas</h3>
        <DataTable
          emptyLabel="No hay cohortes creadas todavia."
          headers={["Cohorte", "Carrera", "Modalidad", "Turno", "Cuatrimestre", "Estado", "Acciones"]}
          rows={(cohorts as any[]).map((cohort) => [
            <Link className="font-medium text-brand hover:text-brandDeep" href={`/cohortes/${cohort.id}`} key="name">
              {cohort.name}
            </Link>,
            cohort.careers?.name ?? cohort.career_id,
            cohort.modality,
            cohort.shift === "matutino" ? "Matutino" : "Vespertino",
            <Badge key="quarter" tone="brand">Q{cohort.current_quarter}</Badge>,
            <Badge
              key="status"
              tone={cohort.status === "active" ? "success" : cohort.status === "completed" ? "info" : "neutral"}
            >
              {cohort.status === "active" ? "Activa" : cohort.status === "completed" ? "Completada" : "Archivada"}
            </Badge>,
            <div className="flex flex-wrap gap-1" key="actions">
              {cohort.status === "active" ? (
                <>
                  <ActionStateForm action={advanceCohortAction}>
                    <input name="cohort_id" type="hidden" value={cohort.id} />
                    <ConfirmActionButton
                      affectedName={cohort.name}
                      className="h-8 px-3 text-xs"
                      confirmLabel="Avanzar cuatrimestre"
                      description={`Se avanzara la cohorte al cuatrimestre ${Number(cohort.current_quarter) + 1}. Se creara un nuevo grupo automaticamente con las materias pendientes.`}
                      title="Avanzar cohorte"
                    >
                      <GitBranch className="h-3 w-3" />
                      Avanzar
                    </ConfirmActionButton>
                  </ActionStateForm>
                  <form action={completeCohortAction}>
                    <input name="cohort_id" type="hidden" value={cohort.id} />
                    <ConfirmActionButton
                      affectedName={cohort.name}
                      className="h-8 px-3 text-xs"
                      confirmLabel="Completar cohorte"
                      description={`Se marcara la cohorte ${cohort.name} como completada.`}
                      title="Completar cohorte"
                      variant="secondary"
                    >
                      Completar
                    </ConfirmActionButton>
                  </form>
                </>
              ) : null}
              {cohort.status === "completed" ? (
                <form action={archiveCohortAction}>
                  <input name="cohort_id" type="hidden" value={cohort.id} />
                  <ConfirmActionButton
                    affectedName={cohort.name}
                    className="h-8 px-3 text-xs"
                    confirmLabel="Archivar cohorte"
                    description={`Se archivara la cohorte ${cohort.name}.`}
                    title="Archivar cohorte"
                    variant="secondary"
                  >
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
