import Link from "next/link";
import { GitBranch, Trash2 } from "lucide-react";
import {
  advanceCohortAction,
  archiveCohortStateAction,
  completeCohortStateAction,
  permanentDeleteCohortStateAction
} from "@/app/(dashboard)/actions/cohortes";
import { SectionHeader } from "@/components/section-header";
import { CohortCard, CohortFormFields } from "@/components/cohortes/cohort-card";
import { ActionStateForm } from "@/components/ui/action-state-form";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataTable } from "@/components/ui/data-table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { MODALITIES, SHIFTS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";

export const dynamic = "force-dynamic";

export default async function CohortesPage() {
  const profile = await requireActiveProfileOrRedirect();
  const supabase = await createClient();
  const canAdministerCohorts = profile.role_code === "admin";

  const { data: cohorts = [] } = await supabase
    .from("cohort_groups")
    .select("id, name, career_id, modality, shift, current_quarter, status, careers(code, name)")
    .order("name");

  const { data: careers = [] } = await supabase
    .from("careers")
    .select("id, code, name")
    .eq("active", true)
    .order("code");

  const cohortItems = (cohorts ?? []).map((cohort) => ({
    id: cohort.id,
    name: cohort.name as string,
    career_name: (cohort.careers?.name ?? cohort.career_id) as string,
    modality: (MODALITIES.find((m) => m.value === cohort.modality)?.label ?? (cohort.modality as string)) as string,
    shift: cohort.shift as string,
    current_quarter: Number(cohort.current_quarter),
    status: cohort.status as string
  }));

  return (
    <>
      <SectionHeader
        eyebrow="Cohortes"
        title="Grupos padre"
        description="Captura el primer grupo una sola vez. Después, cada activación de ciclo crea automáticamente el grupo del siguiente cuatrimestre."
      >
        <Badge tone="info">Generación automática por ciclo</Badge>
      </SectionHeader>

      <section className="mb-6 rounded-md border border-line bg-card p-4 shadow-subtle">
        <h2 className="mb-3 text-sm font-semibold text-ink">Crear cohorte</h2>
        <CohortFormFields careers={(careers ?? []).map((c) => ({ id: c.id, code: c.code, name: c.name }))} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Cohortes activas</h2>
        <ResponsiveTable
          cards={
            <ul className="grid gap-3 sm:grid-cols-2">
              {cohortItems.map((cohort: { id: string; name: string; career_name: string; modality: string; shift: string; current_quarter: number; status: string }) => (
                <li key={cohort.id}>
                  <CohortCard cohort={cohort} canAdminister={canAdministerCohorts} />
                </li>
              ))}
            </ul>
          }
          table={
            <DataTable
              emptyLabel="No hay cohortes creadas todavía."
              headers={["Cohorte", "Carrera", "Modalidad", "Turno", "Cuatrimestre", "Estado", "Acciones"]}
              rows={(cohorts ?? []).map((cohort) => [
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
                          confirmLabel="Generar grupo pendiente"
                          description="Acción de recuperación: solo se creará un grupo si falta en el ciclo activo. No genera duplicados."
                          title="Recuperar automatización de cohorte"
                        >
                          <GitBranch className="h-3 w-3" />
                          Generar pendiente
                        </ConfirmActionButton>
                      </ActionStateForm>
                      {canAdministerCohorts ? (
                        <ActionStateForm action={completeCohortStateAction}>
                          <input name="cohort_id" type="hidden" value={cohort.id} />
                          <ConfirmActionButton
                            affectedName={cohort.name}
                            className="h-8 px-3 text-xs"
                            confirmLabel="Completar cohorte"
                            description={`Se marcará la cohorte ${cohort.name} como completada.`}
                            title="Completar cohorte"
                            variant="secondary"
                          >
                            Completar
                          </ConfirmActionButton>
                        </ActionStateForm>
                      ) : null}
                    </>
                  ) : null}
                  {cohort.status === "completed" && canAdministerCohorts ? (
                    <ActionStateForm action={archiveCohortStateAction}>
                      <input name="cohort_id" type="hidden" value={cohort.id} />
                      <ConfirmActionButton
                        affectedName={cohort.name}
                        className="h-8 px-3 text-xs"
                        confirmLabel="Archivar cohorte"
                        description={`Se archivará la cohorte ${cohort.name}.`}
                        title="Archivar cohorte"
                        variant="secondary"
                      >
                        Archivar
                      </ConfirmActionButton>
                    </ActionStateForm>
                  ) : null}
                  {canAdministerCohorts ? (
                    <ActionStateForm action={permanentDeleteCohortStateAction}>
                      <input name="cohort_id" type="hidden" value={cohort.id} />
                      <ConfirmActionButton
                        affectedName={cohort.name}
                        className="h-8 px-3 text-xs"
                        confirmLabel="Eliminar permanentemente"
                        danger
                        description="Se eliminarán la cohorte y su historial. Los grupos vinculados se conservarán, pero dejarán de pertenecer a esta cohorte. Esta acción no se puede deshacer."
                        title="Eliminar cohorte permanentemente"
                      >
                        <Trash2 className="h-3 w-3" />
                        Eliminar permanentemente
                      </ConfirmActionButton>
                    </ActionStateForm>
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
