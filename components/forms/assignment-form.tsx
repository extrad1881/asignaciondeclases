"use client";

import { useActionState, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { createAssignmentStateAction } from "@/app/(dashboard)/actions";
import { initialActionState } from "@/lib/actions/action-state";
import { useActionFeedback } from "@/components/ui/action-feedback";
import { ActionAlert } from "@/components/ui/action-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { WEEKDAYS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Option = {
  id: string;
  label: string;
};

type GroupSubjectOption = Option & {
  requiredProfiles: string[];
  loadHours?: number;
};

type TeacherOption = Option & {
  profileCodes: string[];
};

type ScheduleBlockOption = Option & {
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  isCustom?: boolean;
};

type AssignmentPreview = {
  id: string;
  scheduleBlockId: string;
  subjectName?: string | null;
  teacherName?: string | null;
};

type TimeRow = {
  key: string;
  startsAt: string;
  endsAt: string;
  kind: "class" | "break";
};

function formatTime(value: string) {
  return value.slice(0, 5);
}

function buildTimeRows(blocks: ScheduleBlockOption[]): TimeRow[] {
  const classRows = Array.from(
    new Map(
      blocks
        .map((block) => ({
          key: `${formatTime(block.startsAt)}-${formatTime(block.endsAt)}`,
          startsAt: formatTime(block.startsAt),
          endsAt: formatTime(block.endsAt),
          kind: "class" as const
        }))
        .map((block) => [block.key, block])
    ).values()
  ).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return classRows.flatMap((row, index) => {
    const previous = classRows[index - 1];
    if (!previous || previous.endsAt >= row.startsAt) return [row];
    return [
      {
        key: `break-${previous.endsAt}-${row.startsAt}`,
        startsAt: previous.endsAt,
        endsAt: row.startsAt,
        kind: "break" as const
      },
      row
    ];
  });
}

export function AssignmentForm({
  groupSubjects,
  teachers,
  blocks,
  classrooms,
  assignments = []
}: {
  groupSubjects: GroupSubjectOption[];
  teachers: TeacherOption[];
  blocks: ScheduleBlockOption[];
  classrooms: Option[];
  assignments?: AssignmentPreview[];
}) {
  const [state, formAction, pending] = useActionState(createAssignmentStateAction, initialActionState);
  const [selectedSubjectId, setSelectedSubjectId] = useState(groupSubjects[0]?.id ?? "");
  const [selectedBlockId, setSelectedBlockId] = useState(blocks[0]?.id ?? "");
  useActionFeedback(state);
  const selectedSubject = groupSubjects.find((subject) => subject.id === selectedSubjectId) ?? groupSubjects[0];
  const requiredProfiles = useMemo(() => selectedSubject?.requiredProfiles ?? [], [selectedSubject]);

  const eligibleTeachers = useMemo(() => {
    if (requiredProfiles.length === 0) return teachers;
    const requiredSet = new Set(requiredProfiles);
    return teachers.filter((teacher) => teacher.profileCodes.some((profile) => requiredSet.has(profile)));
  }, [requiredProfiles, teachers]);

  const days = WEEKDAYS.filter((day) => blocks.some((block) => block.dayOfWeek === day.value));
  const timeRows = buildTimeRows(blocks);

  return (
    <form action={formAction} className="grid gap-3 rounded-md border border-line bg-white p-4 shadow-subtle">
      <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-900">
        Selecciona una materia, un docente apto y un bloque disponible. El sistema valida perfiles, horas máximas y choques de horario.
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <label className="text-sm font-medium text-slate-700">
          Materia
          <Select
            className="mt-1"
            name="group_subject_id"
            onChange={(event) => setSelectedSubjectId(event.target.value)}
            required
            value={selectedSubject?.id ?? ""}
          >
            {groupSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.label}
              </option>
            ))}
          </Select>
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Perfil requerido: {requiredProfiles.length > 0 ? requiredProfiles.join(", ") : "Sin perfil"}
          </span>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Docente
          <Select className="mt-1" disabled={eligibleTeachers.length === 0} name="teacher_id" required>
            {eligibleTeachers.length === 0 ? (
              <option value="">Sin docentes aptos para este perfil</option>
            ) : (
              eligibleTeachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.label}
                </option>
              ))
            )}
          </Select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Horas asignadas
          <Input
            className="mt-1"
            defaultValue={selectedSubject?.loadHours ?? 1.5}
            key={selectedSubject?.id ?? "hours"}
            max={99}
            min={0.5}
            name="duration_hours"
            required
            step={0.5}
            type="number"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Aula
          <Select className="mt-1" name="classroom_id">
            <option value="">Usar aula del grupo</option>
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-md border border-line bg-slate-50">
        {blocks.length === 0 ? (
          <p className="p-4 text-sm text-muted">
            No hay bloques disponibles para este cuadro. Agrega un bloque personalizado o revisa la modalidad del grupo.
          </p>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                <th className="w-32 px-3 py-3 font-semibold">Hora</th>
                {days.map((day) => (
                  <th className="px-3 py-3 font-semibold" key={day.value}>
                    {day.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeRows.map((time) => (
                <tr className="border-t border-line" key={time.key}>
                  <th className="bg-white px-3 py-3 text-left text-xs font-semibold text-slate-600">
                    {time.kind === "break" ? "RECESO" : `${time.startsAt} - ${time.endsAt}`}
                  </th>
                  {time.kind === "break" ? (
                    <td className="bg-amber-50 px-3 py-3 text-center text-xs font-semibold uppercase text-amber-700" colSpan={days.length}>
                      Receso {time.startsAt} - {time.endsAt}
                    </td>
                  ) : (
                  days.map((day) => {
                    const block = blocks.find(
                      (item) =>
                        item.dayOfWeek === day.value &&
                        formatTime(item.startsAt) === time.startsAt &&
                        formatTime(item.endsAt) === time.endsAt
                    );
                    const blockAssignments = assignments.filter((assignment) => assignment.scheduleBlockId === block?.id);

                    return (
                      <td className="h-28 border-l border-line p-2 align-top" key={day.value}>
                        {block ? (
                          <label className="block h-full cursor-pointer">
                            <input
                              checked={selectedBlockId === block.id}
                              className="peer sr-only"
                              name="schedule_block_id"
                              onChange={() => setSelectedBlockId(block.id)}
                              required
                              type="radio"
                              value={block.id}
                            />
                            <span
                              className={cn(
                                "flex h-full flex-col gap-1 rounded-md border border-line bg-white p-2 text-xs text-slate-700 transition peer-checked:border-brand peer-checked:bg-teal-50 peer-checked:text-teal-950",
                                block.isCustom && "border-dashed border-amber-300 bg-amber-50"
                              )}
                            >
                              <span className="font-semibold">{block.label}</span>
                              {block.isCustom ? <Badge tone="warning">Personalizado</Badge> : null}
                              {blockAssignments.length > 0 ? (
                                <span className="mt-auto grid gap-1">
                                  {blockAssignments.map((assignment) => (
                                    <span className="rounded bg-blue-50 px-2 py-1 text-blue-900" key={assignment.id}>
                                      <span className="block font-medium">{assignment.subjectName}</span>
                                      <span className="block">{assignment.teacherName}</span>
                                    </span>
                                  ))}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        ) : (
                          <span className="text-xs text-slate-300">No aplica</span>
                        )}
                      </td>
                    );
                  })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <ActionAlert className="mb-3" state={state} />
        <Button disabled={pending || eligibleTeachers.length === 0 || blocks.length === 0 || groupSubjects.length === 0} type="submit">
          <Save className="h-4 w-4" />
          {pending ? "Guardando..." : "Asignar docente"}
        </Button>
      </div>
    </form>
  );
}
