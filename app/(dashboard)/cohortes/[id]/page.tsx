export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { GitBranch, CheckCircle2, Save, Trash2 } from "lucide-react";
import {
  advanceCohortAction,
  archiveCohortStateAction,
  completeCohortStateAction,
  permanentDeleteCohortStateAction,
  updateCohortManualHistoryStateAction
} from "@/app/(dashboard)/actions/cohortes";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { ActionStateForm } from "@/components/ui/action-state-form";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataTable } from "@/components/ui/data-table";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { fetchAllRows } from "@/lib/supabase/pagination";
import { isAdmin } from "@/lib/permissions";

export default async function CohortDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await requireActiveProfileOrRedirect();

  const { data: cohort } = await supabase
    .from("cohort_groups")
    .select("id, name, career_id, modality, shift, current_quarter, status, careers(code, name)")
    .eq("id", id)
    .single();

  if (!cohort) notFound();

  const { data: groups = [] } = await supabase
    .from("groups")
    .select("id, name, quarter, status, academic_cycles(code)")
    .eq("cohort_group_id", cohort.id)
    .order("quarter");

  const { data: history = [] } = await supabase
    .from("cohort_subject_history")
    .select("id, subject_id, quarter, group_id, subjects(name, quarter, hours_per_week:default_hours)")
    .eq("cohort_group_id", cohort.id)
    .order("quarter")
    .order("subject_id");

  const cohortSubjects = await fetchAllRows(
    (from, to) =>
      supabase
        .from("subjects")
        .select("id, name, quarter, active")
        .eq("career_id", cohort.career_id)
        .order("quarter")
        .order("name")
        .order("id")
        .range(from, to),
    { label: "Materias de la cohorte" }
  );

  const cohortGroups = groups ?? [];
  const cohortHistory = history ?? [];
  const manualHistorySubjectIds = new Set(
    cohortHistory.filter((row) => row.group_id === null).map((row) => row.subject_id)
  );
  const groupHistorySubjectIds = new Set(
    cohortHistory.filter((row) => row.group_id !== null).map((row) => row.subject_id)
  );
  const editableHistorySubjects = cohortSubjects.filter(
    (subject) => Number(subject.quarter) < Number(cohort.current_quarter)
  );
  const canEditHistory = cohort.status === "active" || isAdmin(profile.role_code);
  type HistoryRow = (typeof cohortHistory)[number];
  const historyByQuarter = new Map<number, HistoryRow[]>();
  for (const row of cohortHistory) {
    const q = Number(row.quarter);
    if (!historyByQuarter.has(q)) historyByQuarter.set(q, []);
    historyByQuarter.get(q)!.push(row);
  }

  const maxQuarter = Math.max(cohort.current_quarter, 1);

  return (
    <>
      <SectionHeader eyebrow="Cohorte" title={cohort.name}>
        <div className="flex items-center gap-2">
          <Badge tone={cohort.status === "active" ? "success" : cohort.status === "completed" ? "info" : "neutral"}>
            {cohort.status === "active" ? "Activa" : cohort.status === "completed" ? "Completada" : "Archivada"}
          </Badge>
          <Badge tone="brand">Q{cohort.current_quarter}</Badge>
          <Badge tone="info">{cohort.careers?.code}</Badge>
        </div>
      </SectionHeader>

      <section className="mb-5 grid gap-3 rounded-md border border-line bg-card p-4 text-sm shadow-subtle md:grid-cols-4">
        <p><span className="font-semibold">Carrera:</span> {cohort.careers?.name}</p>
        <p><span className="font-semibold">Modalidad:</span> {cohort.modality}</p>
        <p><span className="font-semibold">Turno:</span> {cohort.shift === "matutino" ? "Matutino" : "Vespertino"}</p>
        <p><span className="font-semibold">Grupos:</span> {cohortGroups.length}</p>
      </section>

      {cohort.status === "active" ? (
        <section className="mb-5 flex flex-wrap gap-2 rounded-md border border-line bg-card p-3 shadow-subtle">
          <span className="mr-2 self-center text-xs font-semibold uppercase text-muted">Acciones:</span>
          <ActionStateForm action={advanceCohortAction}>
            <input name="cohort_id" type="hidden" value={cohort.id} />
            <ConfirmActionButton
              affectedName={cohort.name}
              className="h-9 px-3 text-xs"
              confirmLabel="Generar grupo pendiente"
              description="Acción de recuperación: solo se creará el siguiente grupo si aún falta en el ciclo activo. No genera duplicados."
              title="Recuperar automatización de cohorte"
            >
              <GitBranch className="h-3 w-3" />
              Generar grupo pendiente
            </ConfirmActionButton>
          </ActionStateForm>
          {isAdmin(profile.role_code) ? (
            <ActionStateForm action={completeCohortStateAction}>
              <input name="cohort_id" type="hidden" value={cohort.id} />
              <ConfirmActionButton
                affectedName={cohort.name}
                className="h-9 px-3 text-xs"
                confirmLabel="Completar cohorte"
                description="Se marcará la cohorte como completada."
                title="Completar cohorte"
                variant="secondary"
              >
                <CheckCircle2 className="h-3 w-3" />
                Completar
              </ConfirmActionButton>
            </ActionStateForm>
          ) : null}
        </section>
      ) : null}

      {cohort.status === "completed" && isAdmin(profile?.role_code) ? (
        <section className="mb-5 flex flex-wrap gap-2 rounded-md border border-line bg-card p-3 shadow-subtle">
          <ActionStateForm action={archiveCohortStateAction}>
            <input name="cohort_id" type="hidden" value={cohort.id} />
            <ConfirmActionButton
              affectedName={cohort.name}
              className="h-9 px-3 text-xs"
              confirmLabel="Archivar cohorte"
              description="Se archivara la cohorte."
              title="Archivar cohorte"
              variant="secondary"
            >
              Archivar
            </ConfirmActionButton>
          </ActionStateForm>
        </section>
      ) : null}

      {isAdmin(profile.role_code) ? (
        <section className="mb-5 rounded-md border border-red-200 bg-red-50 p-3">
          <h2 className="text-sm font-semibold text-red-900">Zona de peligro</h2>
          <p className="mt-1 text-xs text-red-800">
            Elimina la cohorte y su historial de forma irreversible. Los grupos académicos se conservarán desvinculados.
          </p>
          <ActionStateForm action={permanentDeleteCohortStateAction} className="mt-3">
            <input name="cohort_id" type="hidden" value={cohort.id} />
            <input name="redirect_to" type="hidden" value="/cohortes" />
            <ConfirmActionButton
              affectedName={cohort.name}
              className="h-9 px-3 text-xs"
              confirmLabel="Eliminar permanentemente"
              danger
              description="Se eliminarán la cohorte y su historial. Los grupos vinculados se conservarán, pero dejarán de pertenecer a esta cohorte. Esta acción no se puede deshacer."
              title="Eliminar cohorte permanentemente"
            >
              <Trash2 className="h-3 w-3" />
              Eliminar permanentemente
            </ConfirmActionButton>
          </ActionStateForm>
        </section>
      ) : null}

      <section className="mb-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Grupos de esta cohorte</h2>
        <DataTable
          emptyLabel="No hay grupos vinculados a esta cohorte."
          headers={["Cuatrimestre", "Grupo", "Ciclo", "Estado"]}
          rows={cohortGroups.map((group) => [
            `Q${group.quarter}`,
            <Link className="font-medium text-brand hover:text-brandDeep" href={`/grupos/${group.id}`} key="link">
              {group.name}
            </Link>,
            group.academic_cycles?.code ?? "Sin ciclo",
            <Badge
              key="status"
              tone={group.status === "final" ? "success" : group.status === "draft" ? "neutral" : "info"}
            >
              {group.status === "draft" ? "Borrador" :
               group.status === "review" ? "Revisión" :
               group.status === "final" ? "Finalizado" : group.status}
            </Badge>
          ])}
        />
      </section>

      <section className="mb-5 rounded-md border border-line bg-card p-4 shadow-subtle">
        <h2 className="text-sm font-semibold text-ink">Modificar materias ya cursadas</h2>
        <p className="mt-1 text-sm text-muted">
          Agrega o quita registros manuales. Las materias provenientes de un grupo real se muestran bloqueadas y se conservan.
        </p>
        {!canEditHistory ? (
          <p className="mt-3 rounded-md border border-line bg-panel px-3 py-2 text-sm text-muted">
            Solo el administrador puede corregir el historial de una cohorte que ya no está activa.
          </p>
        ) : editableHistorySubjects.length === 0 ? (
          <p className="mt-3 rounded-md border border-line bg-panel px-3 py-2 text-sm text-muted">
            La cohorte está en Q1; todavía no existen materias de cuatrimestres anteriores para registrar.
          </p>
        ) : (
          <ActionStateForm
            action={updateCohortManualHistoryStateAction}
            className="mt-4 space-y-4"
          >
            <input name="cohort_id" type="hidden" value={cohort.id} />
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {editableHistorySubjects.map((subject) => {
                const registeredByGroup = groupHistorySubjectIds.has(subject.id);
                return (
                  <label
                    className="flex min-h-12 items-center gap-2 rounded-md border border-line bg-panel p-3 text-sm"
                    key={subject.id}
                  >
                    <input
                      className="h-4 w-4 accent-brand"
                      defaultChecked={registeredByGroup || manualHistorySubjectIds.has(subject.id)}
                      disabled={registeredByGroup}
                      name={registeredByGroup ? undefined : "subject_ids"}
                      type="checkbox"
                      value={subject.id}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink">{subject.name}</span>
                      <span className="text-xs text-muted">Cuatrimestre {subject.quarter}</span>
                    </span>
                    {registeredByGroup ? <Badge tone="info">Por grupo</Badge> : null}
                    {!subject.active ? <Badge tone="neutral">Inactiva</Badge> : null}
                  </label>
                );
              })}
            </div>
            <Button type="submit">
              <Save className="h-4 w-4" />
              Guardar materias cursadas
            </Button>
          </ActionStateForm>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Historial de materias cursadas</h2>
        {Array.from({ length: maxQuarter }, (_, i) => i + 1).map((quarter) => {
          const qHistory = historyByQuarter.get(quarter) ?? [];
          if (qHistory.length === 0) return null;
          return (
            <div className="mb-4" key={quarter}>
              <h3 className="mb-2 text-xs font-semibold uppercase text-muted">Cuatrimestre {quarter}</h3>
              <DataTable
                emptyLabel="Sin materias registradas."
                headers={["Materia", "Grupo origen"]}
                rows={qHistory.map((row) => [
                  row.subjects?.name ?? row.subject_id,
                  row.group_id ? (
                    <Link className="text-brand hover:text-brandDeep" href={`/grupos/${row.group_id}`} key="group">
                      Ver grupo
                    </Link>
                  ) : "Registro manual"
                ])}
              />
            </div>
          );
        })}
        {cohortHistory.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay materias registradas en el historial.</p>
        ) : null}
      </section>
    </>
  );
}
