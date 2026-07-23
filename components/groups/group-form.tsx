"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { MODALITIES, SHIFTS } from "@/lib/constants";
import { initialActionState } from "@/lib/actions/action-state";
import { useActionFeedback } from "@/components/ui/action-feedback";
import { ActionAlert } from "@/components/ui/action-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createGroupStateAction } from "@/app/(dashboard)/actions";

type Option = {
  id: string;
  name: string;
  code?: string;
  quarter?: number;
  career_id?: string;
  default_hours?: number | null;
};

type ProfileOption = {
  code: string;
  name: string;
};

type CohortOption = {
  id: string;
  name: string;
  career_id: string;
  current_quarter: number;
  modality: string;
  shift: string;
};

export function GroupForm({
  cycles,
  careers,
  classrooms,
  subjects,
  profiles,
  cohorts = [],
  canCreateExternalSubjects = false
}: {
  cycles: Option[];
  careers: Option[];
  classrooms: Option[];
  subjects: Option[];
  profiles: ProfileOption[];
  cohorts?: CohortOption[];
  canCreateExternalSubjects?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createGroupStateAction, initialActionState);
  const [careerId, setCareerId] = useState(careers[0]?.id ?? "");
  const [quarter, setQuarter] = useState(1);
  const [modality, setModality] = useState<string>(MODALITIES[0]?.value ?? "escolarizado");
  const [shift, setShift] = useState<string>(SHIFTS[0]?.value ?? "matutino");
  const [includeOtherQuarters, setIncludeOtherQuarters] = useState(false);
  const [externalSubjectKeys, setExternalSubjectKeys] = useState<string[]>([]);
  const [cohortId, setCohortId] = useState("");
  const [showCompletedSubjects, setShowCompletedSubjects] = useState(false);
  const [completedSubjectIds, setCompletedSubjectIds] = useState<Set<string>>(new Set());
  useActionFeedback(state);

  useEffect(() => {
    if (state.success && state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [router, state.redirectTo, state.success]);

  const visibleCohorts = useMemo(() => {
    if (!cohorts.length) return [];
    return cohorts.filter((c) => c.career_id === careerId);
  }, [careerId, cohorts]);

  const selectedCohort = useMemo(
    () => cohorts.find((c) => c.id === cohortId),
    [cohortId, cohorts]
  );

  const subjectsBeforeCurrentQuarter = useMemo(() => {
    if (!selectedCohort || quarter <= 1) return [];
    return subjects.filter(
      (subject) => subject.career_id === careerId && subject.quarter && subject.quarter < quarter
    );
  }, [careerId, quarter, selectedCohort, subjects]);

  const subjectsByQuarter = useMemo(() => {
    const map = new Map<number, Option[]>();
    for (const subject of subjectsBeforeCurrentQuarter) {
      const q = subject.quarter ?? 0;
      if (!map.has(q)) map.set(q, []);
      map.get(q)!.push(subject);
    }
    return map;
  }, [subjectsBeforeCurrentQuarter]);

  function toggleCompletedSubject(subjectId: string) {
    setCompletedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
  }

  const visibleSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      if (subject.career_id !== careerId) return false;
      if (completedSubjectIds.has(subject.id)) return false;
      if (includeOtherQuarters) return true;
      return subject.quarter === quarter;
    });
  }, [careerId, completedSubjectIds, includeOtherQuarters, quarter, subjects]);

  function addExternalSubject() {
    setExternalSubjectKeys((current) => [...current, `${Date.now()}-${current.length}`]);
  }

  function removeExternalSubject(key: string) {
    setExternalSubjectKeys((current) => current.filter((item) => item !== key));
  }

  return (
    <form action={formAction} className="grid gap-5 pb-24 md:pb-0">
      <section className="grid gap-4 rounded-md border border-line bg-card p-4 shadow-subtle md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-medium text-ink">
          Ciclo escolar
          <Select className="mt-1" name="academic_cycle_id" required>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.code ?? cycle.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-ink">
          Carrera
          <Select
            className="mt-1"
            name="career_id"
            onChange={(event) => {
              setCareerId(event.target.value);
              setCohortId("");
              setCompletedSubjectIds(new Set());
            }}
            required
            value={careerId}
          >
            {careers.map((career) => (
              <option key={career.id} value={career.id}>
                {career.code ? `${career.code} · ${career.name}` : career.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-ink">
          Cuatrimestre
          <Select
            className="mt-1"
            name="quarter"
            onChange={(event) => {
              const nextQuarter = Number(event.target.value);
              setQuarter(nextQuarter);
              setCompletedSubjectIds((current) => new Set(
                Array.from(current).filter((subjectId) => {
                  const subject = subjects.find((item) => item.id === subjectId);
                  return Boolean(subject?.quarter && subject.quarter < nextQuarter);
                })
              ));
            }}
            value={quarter}
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-ink">
          Modalidad
          <Select
            className="mt-1"
            name="modality"
            onChange={(event) => setModality(event.target.value)}
            required
            value={modality}
          >
            {MODALITIES.map((modality) => (
              <option key={modality.value} value={modality.value}>
                {modality.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-ink">
          Turno
          <Select
            className="mt-1"
            name="shift"
            onChange={(event) => setShift(event.target.value)}
            required
            value={shift}
          >
            {SHIFTS.map((shift) => (
              <option key={shift.value} value={shift.value}>
                {shift.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-ink">
          Grupo
          <Input className="mt-1" name="name" placeholder="Ej. SISCOM 1A" required />
        </label>
        <label className="text-sm font-medium text-ink">
          Aula
          <Select className="mt-1" name="classroom_id">
            <option value="">Sin aula fija</option>
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </Select>
        </label>
        {cohorts.length > 0 ? (
          <label className="text-sm font-medium text-ink">
            Cohorte para inicializar (opcional)
            <Select
              className="mt-1"
              name="cohort_group_id"
              onChange={(event) => {
                const nextCohortId = event.target.value;
                const cohort = cohorts.find((item) => item.id === nextCohortId);
                setCohortId(nextCohortId);
                setCompletedSubjectIds(new Set());

                if (cohort) {
                  setQuarter(cohort.current_quarter);
                  setModality(cohort.modality);
                  setShift(cohort.shift);
                  setShowCompletedSubjects(cohort.current_quarter > 1);
                } else {
                  setShowCompletedSubjects(false);
                }
              }}
              value={cohortId}
            >
              <option value="">Sin cohorte</option>
              {visibleCohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.name} (Q{cohort.current_quarter})
                </option>
              ))}
            </Select>
            <span className="mt-1 block text-xs font-normal text-muted">
              Solo se vincula el primer grupo; los siguientes se crearán al activar cada ciclo.
            </span>
          </label>
        ) : null}
      </section>

      <section className="rounded-md border border-line bg-card p-4 shadow-subtle">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Materias del grupo</h2>
            <p className="text-sm text-muted">
              Puedes incluir materias de otros cuatrimestres cuando sea necesario.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              checked={includeOtherQuarters}
              className="h-4 w-4 accent-brand"
              onChange={(event) => setIncludeOtherQuarters(event.target.checked)}
              type="checkbox"
            />
            Ver todos los cuatrimestres
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleSubjects.map((subject) => (
            <label
              className="grid gap-2 rounded-md border border-line bg-panel p-3 text-sm"
              key={subject.id}
            >
              <span className="flex items-start gap-2 font-medium text-ink">
                <input className="mt-1 h-4 w-4 accent-brand" name="subject_ids" type="checkbox" value={subject.id} />
                {subject.name}
              </span>
              <span className="ml-6 text-xs text-muted">Cuatrimestre {subject.quarter}</span>
              <span className="ml-6 flex items-center gap-2 text-xs text-muted">
                Horas
                <Input
                  className="h-8 max-w-24"
                  min={1}
                  name={`hours_${subject.id}`}
                  type="number"
                  value={subject.default_hours ?? 5}
                  readOnly
                />
              </span>
            </label>
          ))}
        </div>
        {visibleSubjects.length === 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No hay materias importadas para esta combinación.
          </div>
        ) : null}
      </section>

      {externalSubjectKeys.length > 0 ? (
        <section className="rounded-md border border-line bg-card p-4 shadow-subtle">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-ink">Materias externas</h2>
            <p className="text-sm text-muted">
              Estas materias se guardan en el catálogo de la carrera seleccionada.
            </p>
          </div>
          <div className="grid gap-3">
            {externalSubjectKeys.map((key) => (
              <div
                className="grid gap-3 rounded-md border border-line bg-panel p-3 md:grid-cols-[1fr_130px_120px_180px_auto]"
                key={key}
              >
                <label className="text-sm font-medium text-ink">
                  Materia
                  <Input className="mt-1" name="external_subject_name" placeholder="Nombre de la materia" required />
                </label>
                <label className="text-sm font-medium text-ink">
                  Cuatrimestre
                  <Select className="mt-1" defaultValue={quarter} name="external_subject_quarter" required>
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="text-sm font-medium text-ink">
                  Horas
                  <Input
                    className="mt-1"
                    defaultValue={5}
                    min={0.5}
                    name="external_subject_hours"
                    required
                    step={0.5}
                    type="number"
                  />
                </label>
                <label className="text-sm font-medium text-ink">
                  Perfil
                  <Select className="mt-1" name="external_subject_profile_code">
                    <option value="">Sin perfil</option>
                    {profiles.map((profile) => (
                      <option key={profile.code} value={profile.code}>
                        {profile.code}
                      </option>
                    ))}
                  </Select>
                </label>
                <div className="flex items-end">
                  <Button
                    aria-label="Quitar materia externa"
                    className="w-full md:w-10 md:px-0"
                    onClick={() => removeExternalSubject(key)}
                    title="Quitar materia externa"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {selectedCohort && subjectsBeforeCurrentQuarter.length > 0 ? (
        <section className="rounded-md border border-line bg-card p-4 shadow-subtle">
          <button
            className="flex w-full items-center justify-between text-left"
            onClick={() => setShowCompletedSubjects(!showCompletedSubjects)}
            type="button"
          >
            <div>
              <h2 className="text-lg font-semibold text-ink">Materias ya cursadas</h2>
              <p className="text-sm text-muted">
                Marca las materias que esta cohorte ya tomó en cuatrimestres anteriores. No podrán agregarse nuevamente al grupo.
              </p>
            </div>
            <span className="flex items-center gap-2 text-sm text-muted">
              {completedSubjectIds.size > 0 ? `${completedSubjectIds.size} seleccionadas` : "Sin selección"}
              {showCompletedSubjects ? "▲" : "▼"}
            </span>
          </button>
          {showCompletedSubjects ? (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setCompletedSubjectIds(new Set(subjectsBeforeCurrentQuarter.map((subject) => subject.id)))}
                  type="button"
                  variant="secondary"
                >
                  Marcar todas las anteriores
                </Button>
                <Button
                  disabled={completedSubjectIds.size === 0}
                  onClick={() => setCompletedSubjectIds(new Set())}
                  type="button"
                  variant="ghost"
                >
                  Limpiar selección
                </Button>
              </div>
              {Array.from(subjectsByQuarter.entries())
                .sort(([a], [b]) => a - b)
                .map(([q, qSubjects]) => (
                  <div key={q}>
                    <h3 className="mb-2 text-xs font-semibold uppercase text-muted">Cuatrimestre {q}</h3>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {qSubjects.map((subject) => (
                        <label
                          className="flex items-center gap-2 rounded-md border border-line bg-panel p-2 text-sm"
                          key={subject.id}
                        >
                          <input
                            checked={completedSubjectIds.has(subject.id)}
                            className="h-4 w-4 accent-brand"
                            onChange={() => toggleCompletedSubject(subject.id)}
                            type="checkbox"
                          />
                          {subject.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : null}
          {Array.from(completedSubjectIds).map((subjectId) => (
            <input key={`completed-${subjectId}`} name="completed_subject_ids" type="hidden" value={subjectId} />
          ))}
        </section>
      ) : null}

      <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t border-line bg-card/95 px-4 py-3 shadow-panel backdrop-blur supports-[backdrop-filter]:bg-card/80 md:static md:mx-0 md:mt-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-0">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-2">
          <ActionAlert className="md:mr-auto" state={state} />
          {canCreateExternalSubjects ? (
            <Button disabled={pending} onClick={addExternalSubject} type="button" variant="secondary">
              <Plus className="h-4 w-4" />
              Materia externa
            </Button>
          ) : null}
          <Button disabled={pending} type="submit">
            <Save className="h-4 w-4" />
            {pending ? "Guardando..." : "Guardar grupo"}
          </Button>
        </div>
      </div>
    </form>
  );
}
