import { RotateCcw, Save, Trash2 } from "lucide-react";
import {
  setSubjectActiveAction,
  setSubjectActiveFeedbackAction,
  updateSubjectAction,
  updateSubjectFeedbackAction
} from "@/app/(dashboard)/actions";
import { ProfileCheckboxGroup } from "@/components/forms/profile-checkbox-group";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionButton } from "@/components/ui/confirm-action-button";
import { DataCard } from "@/components/ui/data-card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatHours } from "@/lib/utils";

export type SubjectProfileOption = {
  code: string;
  name?: string | null;
};

export type Subject = {
  id: string;
  name: string;
  quarter: number;
  default_hours: number;
  active: boolean;
  profiles: string[];
};

const detailsClass =
  "rounded-md border border-line bg-panel [&>summary]:focus-ring [&>summary]:cursor-pointer [&>summary]:inline-flex [&>summary]:min-h-11 [&>summary]:items-center [&>summary]:gap-2 [&>summary]:rounded-md [&>summary]:border [&>summary]:border-line [&>summary]:bg-background [&>summary]:px-3 [&>summary]:py-1.5 [&>summary]:text-xs [&>summary]:font-semibold [&>summary]:text-ink [&>summary]:transition [&>summary]:hover:bg-accent [&>summary]:marker:hidden";

export function SubjectCard({
  subject,
  careerId,
  profileOptions
}: {
  subject: Subject;
  careerId: string;
  profileOptions: SubjectProfileOption[];
}) {
  const statusLabel = subject.active ? "Activa" : "Inactiva";
  return (
    <DataCard
      actions={
        <div className="flex w-full flex-col gap-2">
          <details className={detailsClass}>
            <summary>
              <Save className="h-3 w-3" aria-hidden />
              Modificar materia
            </summary>
            <form action={updateSubjectAction} className="mt-3 space-y-2">
              <input name="career_id" type="hidden" value={careerId} />
              <input name="subject_id" type="hidden" value={subject.id} />
              <label className="block text-xs font-semibold text-muted">
                Nombre
                <Input
                  className="mt-1 h-10"
                  defaultValue={subject.name}
                  name="name"
                  required
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-semibold text-muted">
                  Cuatrimestre
                  <Select
                    className="mt-1 h-10"
                    defaultValue={subject.quarter}
                    name="quarter"
                    required
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((quarter) => (
                      <option key={quarter} value={quarter}>
                        {quarter}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Carga
                  <Input
                    className="mt-1 h-10"
                    defaultValue={subject.default_hours}
                    min={0.5}
                    name="default_hours"
                    required
                    step={0.5}
                    type="number"
                  />
                </label>
              </div>
              <div className="text-xs font-semibold text-muted">Perfiles requeridos</div>
              <ProfileCheckboxGroup
                maxHeight="max-h-40"
                profiles={profileOptions}
                selected={subject.profiles}
              />
              <ConfirmActionButton
                action={updateSubjectFeedbackAction}
                affectedName={subject.name}
                className="h-10 w-full"
                confirmLabel="Guardar materia"
                description="Se actualizarán nombre, cuatrimestre, carga horaria y perfiles requeridos de la materia."
                title="Modificar materia"
                variant="secondary"
              >
                <Save className="h-4 w-4" aria-hidden />
                Guardar materia
              </ConfirmActionButton>
            </form>
          </details>

          <form action={setSubjectActiveAction}>
            <input name="career_id" type="hidden" value={careerId} />
            <input name="subject_id" type="hidden" value={subject.id} />
            <input name="active" type="hidden" value={subject.active ? "false" : "true"} />
            <ConfirmActionButton
              action={setSubjectActiveFeedbackAction}
              affectedName={subject.name}
              className="h-10 w-full"
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
              {subject.active ? <Trash2 className="h-4 w-4" aria-hidden /> : <RotateCcw className="h-4 w-4" aria-hidden />}
              {subject.active ? "Desactivar" : "Reactivar"}
            </ConfirmActionButton>
          </form>
        </div>
      }
      badge={<Badge tone={subject.active ? "success" : "warning"}>{statusLabel}</Badge>}
      fields={[
        { label: "Cuatrimestre", value: subject.quarter },
        { label: "Carga semanal", value: formatHours(subject.default_hours) },
        {
          label: "Perfil requerido",
          value:
            subject.profiles.length === 0 ? (
              <span className="text-muted-foreground">Sin perfil</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {subject.profiles.map((code) => (
                  <Badge key={code} tone="info">
                    {code}
                  </Badge>
                ))}
              </div>
            )
        }
      ]}
      title={subject.name}
    />
  );
}
