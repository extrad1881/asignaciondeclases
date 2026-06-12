"use client";

import { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { MODALITIES, SHIFTS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createGroupAction } from "@/app/(dashboard)/actions";

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

export function GroupForm({
  cycles,
  careers,
  classrooms,
  subjects,
  profiles,
  canCreateExternalSubjects = false
}: {
  cycles: Option[];
  careers: Option[];
  classrooms: Option[];
  subjects: Option[];
  profiles: ProfileOption[];
  canCreateExternalSubjects?: boolean;
}) {
  const [careerId, setCareerId] = useState(careers[0]?.id ?? "");
  const [quarter, setQuarter] = useState(1);
  const [includeOtherQuarters, setIncludeOtherQuarters] = useState(false);
  const [externalSubjectKeys, setExternalSubjectKeys] = useState<string[]>([]);

  const visibleSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      if (subject.career_id !== careerId) return false;
      if (includeOtherQuarters) return true;
      return subject.quarter === quarter;
    });
  }, [careerId, includeOtherQuarters, quarter, subjects]);

  function addExternalSubject() {
    setExternalSubjectKeys((current) => [...current, `${Date.now()}-${current.length}`]);
  }

  function removeExternalSubject(key: string) {
    setExternalSubjectKeys((current) => current.filter((item) => item !== key));
  }

  return (
    <form action={createGroupAction} className="grid gap-5">
      <section className="grid gap-4 rounded-md border border-line bg-white p-4 shadow-subtle md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-medium text-slate-700">
          Ciclo escolar
          <Select className="mt-1" name="academic_cycle_id" required>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.code ?? cycle.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Carrera
          <Select
            className="mt-1"
            name="career_id"
            onChange={(event) => setCareerId(event.target.value)}
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
        <label className="text-sm font-medium text-slate-700">
          Cuatrimestre
          <Select
            className="mt-1"
            name="quarter"
            onChange={(event) => setQuarter(Number(event.target.value))}
            value={quarter}
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Modalidad
          <Select className="mt-1" name="modality" required>
            {MODALITIES.map((modality) => (
              <option key={modality.value} value={modality.value}>
                {modality.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Turno
          <Select className="mt-1" name="shift" required>
            {SHIFTS.map((shift) => (
              <option key={shift.value} value={shift.value}>
                {shift.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Grupo
          <Input className="mt-1" name="name" placeholder="Ej. SISCOM 1A" required />
        </label>
        <label className="text-sm font-medium text-slate-700">
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
      </section>

      <section className="rounded-md border border-line bg-white p-4 shadow-subtle">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Materias del grupo</h2>
            <p className="text-sm text-slate-600">
              Puedes incluir materias de otros cuatrimestres cuando sea necesario.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
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
              className="grid gap-2 rounded-md border border-line bg-slate-50 p-3 text-sm"
              key={subject.id}
            >
              <span className="flex items-start gap-2 font-medium text-ink">
                <input className="mt-1 h-4 w-4 accent-brand" name="subject_ids" type="checkbox" value={subject.id} />
                {subject.name}
              </span>
              <span className="ml-6 text-xs text-slate-500">Cuatrimestre {subject.quarter}</span>
              <span className="ml-6 flex items-center gap-2 text-xs text-slate-600">
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
        <section className="rounded-md border border-line bg-white p-4 shadow-subtle">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-ink">Materias externas</h2>
            <p className="text-sm text-slate-600">
              Estas materias se guardan en el catálogo de la carrera seleccionada.
            </p>
          </div>
          <div className="grid gap-3">
            {externalSubjectKeys.map((key) => (
              <div
                className="grid gap-3 rounded-md border border-line bg-slate-50 p-3 md:grid-cols-[1fr_130px_120px_180px_auto]"
                key={key}
              >
                <label className="text-sm font-medium text-slate-700">
                  Materia
                  <Input className="mt-1" name="external_subject_name" placeholder="Nombre de la materia" required />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Cuatrimestre
                  <Select className="mt-1" defaultValue={quarter} name="external_subject_quarter" required>
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="text-sm font-medium text-slate-700">
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
                <label className="text-sm font-medium text-slate-700">
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

      <div className="flex justify-end gap-2">
        {canCreateExternalSubjects ? (
          <Button onClick={addExternalSubject} type="button" variant="secondary">
            <Plus className="h-4 w-4" />
            Materia externa
          </Button>
        ) : null}
        <Button type="submit">
          <Save className="h-4 w-4" />
          Guardar grupo
        </Button>
      </div>
    </form>
  );
}
