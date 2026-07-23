import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Save } from "lucide-react";
import {
  createSubjectStateAction,
  setSubjectActiveAction,
  setSubjectActiveFeedbackAction,
  updateSubjectAction,
  updateSubjectFeedbackAction
} from "@/app/(dashboard)/actions";
import { SectionHeader } from "@/components/section-header";
import { SubjectCard } from "@/components/carreras/subject-card";
import { ProfileCheckboxGroup } from "@/components/forms/profile-checkbox-group";
import { ActionStateForm } from "@/components/ui/action-state-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { isAdmin } from "@/lib/permissions";
import { isValidProfileCode } from "@/lib/profiles";
import { formatHours } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CareerSubjectsPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireActiveProfileOrRedirect();
  if (!isAdmin(profile?.role_code)) redirect("/carreras");

  const { id } = await params;
  const supabase = await createClient();
  const [
    { data: career },
    { data: subjects = [] },
    { data: profiles = [] }
  ] = await Promise.all([
    supabase.from("careers").select("id, code, name, active").eq("id", id).single(),
    supabase
      .from("subjects")
      .select("id, name, quarter, default_hours, active, class_requirements(profile_code)")
      .eq("career_id", id)
      .order("quarter")
      .order("name"),
    supabase.from("teacher_profiles").select("code, name").order("code")
  ]);

  if (!career) notFound();

  const subjectRows = subjects ?? [];
  const profileOptions = (profiles ?? []).filter((teacherProfile) => isValidProfileCode(teacherProfile.code));

  const subjectItems = subjectRows.map((subject) => ({
    id: subject.id,
    name: subject.name,
    quarter: subject.quarter,
    default_hours: Number(subject.default_hours ?? 0),
    active: Boolean(subject.active),
    profiles: (subject.class_requirements ?? [])
      .map((req) => req.profile_code)
      .filter(isValidProfileCode)
  }));

  return (
    <>
      <SectionHeader eyebrow="Carrera" title={`Asignaturas de ${career.code}`}>
        <Link href="/carreras">
          <Button type="button" variant="secondary">
            Volver
          </Button>
        </Link>
      </SectionHeader>

      <section className="mb-6 rounded-md border border-line bg-card p-4 shadow-subtle">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-ink">Agregar materia</h2>
          <p className="text-sm text-muted">{career.name}</p>
        </div>
        <ActionStateForm
          action={createSubjectStateAction}
          alertClassName="md:col-span-full"
          className="grid gap-3 md:grid-cols-[1fr_130px_130px_minmax(260px,1fr)_auto]"
        >
          <input name="career_id" type="hidden" value={career.id} />
          <label className="text-sm font-medium text-ink">
            Materia
            <Input className="mt-1" name="name" placeholder="Nombre de la materia" required />
          </label>
          <label className="text-sm font-medium text-ink">
            Cuatrimestre
            <Select className="mt-1" defaultValue={1} name="quarter" required>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((quarter) => (
                <option key={quarter} value={quarter}>
                  {quarter}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium text-ink">
            Horas
            <Input className="mt-1" defaultValue={5} min={0.5} name="default_hours" required step={0.5} type="number" />
          </label>
          <div className="text-sm font-medium text-ink">
            Perfil requerido
            <div className="mt-1">
              <ProfileCheckboxGroup profiles={profileOptions} />
            </div>
          </div>
          <div className="flex items-end">
            <Button className="w-full" type="submit">
              <Save className="h-4 w-4" aria-hidden />
              Agregar
            </Button>
          </div>
        </ActionStateForm>
      </section>

      {subjectItems.length === 0 ? (
        <EmptyState
          description="Agrega la primera materia para empezar a configurar grupos y asignaciones."
          title="Esta carrera no tiene materias todavía."
        />
      ) : (
        <ResponsiveTable
          cards={
            <ul className="grid gap-3 sm:grid-cols-2">
              {subjectItems.map((subject) => (
                <li key={subject.id}>
                  <SubjectCard careerId={career.id} profileOptions={profileOptions} subject={subject} />
                </li>
              ))}
            </ul>
          }
          table={
            <DataTable
              emptyLabel="Esta carrera no tiene materias todavía."
              headers={["Materia", "Cuatrimestre", "Carga", "Perfil", "Estado", "Modificar", "Acciones"]}
              rows={subjectRows.map((subject) => [
                <span className="font-medium text-ink" key="name">
                  {subject.name}
                </span>,
                subject.quarter,
                formatHours(subject.default_hours),
                <div className="flex flex-wrap gap-1" key="profiles">
                  {((subject.class_requirements ?? []).filter((item) => isValidProfileCode(item.profile_code))).length === 0 ? (
                    <span className="text-muted-foreground">Sin perfil</span>
                  ) : (
                    (subject.class_requirements ?? []).filter((item) => isValidProfileCode(item.profile_code)).map((item) => (
                      <Badge key={item.profile_code} tone="info">
                        {item.profile_code}
                      </Badge>
                    ))
                  )}
                </div>,
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
                    subject.active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                  key="state"
                >
                  {subject.active ? "Activa" : "Inactiva"}
                </span>,
                <form
                  action={updateSubjectAction}
                  className="grid min-w-[360px] gap-2"
                  key="edit"
                >
                  <input name="career_id" type="hidden" value={career.id} />
                  <input name="subject_id" type="hidden" value={subject.id} />
                  <Input defaultValue={subject.name} name="name" required />
                  <div className="grid gap-2 md:grid-cols-2">
                    <Select defaultValue={subject.quarter} name="quarter" required>
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((quarter) => (
                        <option key={quarter} value={quarter}>
                          Cuatrimestre {quarter}
                        </option>
                      ))}
                    </Select>
                    <Input defaultValue={subject.default_hours} min={0.5} name="default_hours" required step={0.5} type="number" />
                  </div>
                  <ProfileCheckboxGroup
                    maxHeight="max-h-36"
                    profiles={profileOptions}
                    selected={(subject.class_requirements ?? [])
                      .map((item) => item.profile_code)
                      .filter(isValidProfileCode)}
                  />
                  <ConfirmActionButton
                    action={updateSubjectFeedbackAction}
                    affectedName={subject.name}
                    className="h-8 px-3"
                    confirmLabel="Guardar materia"
                    description="Se actualizarán nombre, cuatrimestre, carga horaria y perfiles requeridos de la materia."
                    title="Modificar materia"
                    variant="secondary"
                  >
                    Guardar
                  </ConfirmActionButton>
                </form>,
                <form action={setSubjectActiveAction} key="active">
                  <input name="career_id" type="hidden" value={career.id} />
                  <input name="subject_id" type="hidden" value={subject.id} />
                  <input name="active" type="hidden" value={subject.active ? "false" : "true"} />
                  <ConfirmActionButton
                    action={setSubjectActiveFeedbackAction}
                    affectedName={subject.name}
                    className="h-8 px-3"
                    confirmLabel={subject.active ? "Desactivar materia" : "Reactivar materia"}
                    danger={subject.active}
                    description={
                      subject.active
                        ? "La materia dejará de estar disponible para nuevas configuraciones."
                        : "La materia volverá a estar disponible."
                    }
                    title={subject.active ? "Desactivar materia" : "Reactivar materia"}
                    variant={subject.active ? "danger" : "secondary"}
                  >
                    {subject.active ? "Quitar" : "Reactivar"}
                  </ConfirmActionButton>
                </form>
              ])}
            />
          }
        />
      )}
    </>
  );
}
