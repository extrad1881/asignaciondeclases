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
import { ScheduleTable } from "@/components/schedule/schedule-table";
import { WEEKDAYS } from "@/lib/constants";
import { cn, computeBlockHours } from "@/lib/utils";
import { useMediaQuery } from "@/lib/utils/use-media-query";

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
  module?: number;
};

type AssignmentPreview = {
  id: string;
  scheduleBlockId: string;
  subjectName?: string | null;
  teacherName?: string | null;
};

type SubjectHoursInfo = {
  total: number;
  assigned: number;
};

export function AssignmentForm({
  groupSubjects,
  teachers,
  blocks,
  classrooms,
  assignments = [],
  subjectHours
}: {
  groupSubjects: GroupSubjectOption[];
  teachers: TeacherOption[];
  blocks: ScheduleBlockOption[];
  classrooms: Option[];
  assignments?: AssignmentPreview[];
  subjectHours?: Record<string, SubjectHoursInfo>;
}) {
  const [state, formAction, pending] = useActionState(createAssignmentStateAction, initialActionState);
  const [selectedSubjectId, setSelectedSubjectId] = useState(groupSubjects[0]?.id ?? "");
  const [selectedBlockId, setSelectedBlockId] = useState(blocks[0]?.id ?? "");
  const [mobileDay, setMobileDay] = useState<number>(blocks[0]?.dayOfWeek ?? WEEKDAYS[0].value);
  const isMobile = useMediaQuery("(max-width: 767px)");
  useActionFeedback(state);
  const selectedSubject = groupSubjects.find((subject) => subject.id === selectedSubjectId) ?? groupSubjects[0];
  const requiredProfiles = useMemo(() => selectedSubject?.requiredProfiles ?? [], [selectedSubject]);

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId),
    [blocks, selectedBlockId]
  );
  const blockHours = computeBlockHours(selectedBlock?.startsAt, selectedBlock?.endsAt);

  const selectedHoursInfo = subjectHours?.[selectedSubjectId ?? ""];
  const hoursHint = useMemo(() => {
    if (!selectedHoursInfo || selectedHoursInfo.total <= 0) return null;
    const remaining = selectedHoursInfo.total - selectedHoursInfo.assigned;
    if (remaining > 0) {
      return {
        text: `${selectedHoursInfo.assigned} h asignadas de ${selectedHoursInfo.total} h — faltan ${remaining} h`,
        tone: "warning" as const
      };
    }
    if (remaining === 0) {
      return {
        text: `Horas completas (${selectedHoursInfo.total} h)`,
        tone: "success" as const
      };
    }
    return {
      text: `Excedida por ${Math.abs(remaining)} h (${selectedHoursInfo.assigned}/${selectedHoursInfo.total} h)`,
      tone: "danger" as const
    };
  }, [selectedHoursInfo]);

  const eligibleTeachers = useMemo(() => {
    if (requiredProfiles.length === 0) return teachers;
    const requiredSet = new Set(requiredProfiles);
    return teachers.filter((teacher) => teacher.profileCodes.some((profile) => requiredSet.has(profile)));
  }, [requiredProfiles, teachers]);

  const availableDays = useMemo(() => {
    const daySet = new Set(blocks.map((b) => b.dayOfWeek));
    return WEEKDAYS.filter((day) => daySet.has(day.value));
  }, [blocks]);

  const mobileBlocks = useMemo(
    () => blocks.filter((block) => block.dayOfWeek === mobileDay),
    [blocks, mobileDay]
  );

  const blockAssignmentsByKey = useMemo(() => {
    const map = new Map<string, AssignmentPreview[]>();
    for (const assignment of assignments) {
      const key = assignment.scheduleBlockId;
      if (!key) continue;
      const current = map.get(key) ?? [];
      current.push(assignment);
      map.set(key, current);
    }
    return map;
  }, [assignments]);

  return (
    <form action={formAction} className="grid gap-3 rounded-md border border-line bg-card p-4 shadow-subtle">
      <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-900">
        Selecciona una materia, un docente apto y un bloque disponible. El sistema valida perfiles, horas máximas y choques de horario.
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-medium text-ink">
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
          <span className="mt-1 block text-xs font-normal text-muted">
            Perfil requerido: {requiredProfiles.length > 0 ? requiredProfiles.join(", ") : "Sin perfil"}
          </span>
        </label>

        <label className="text-sm font-medium text-ink">
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

        <label className="text-sm font-medium text-ink">
          Horas asignadas
          <Input
            className="mt-1"
            defaultValue={blockHours}
            key={`${selectedSubject?.id ?? "s"}-${selectedBlockId ?? "b"}`}
            max={99}
            min={0.5}
            name="duration_hours"
            required
            step={0.5}
            type="number"
          />
          {hoursHint ? (
            <span className={`mt-1 block text-xs font-normal ${
              hoursHint.tone === "success" ? "text-green-700" :
              hoursHint.tone === "danger" ? "text-red-700" :
              "text-amber-700"
            }`}>
              {hoursHint.text}
            </span>
          ) : null}
        </label>

        <label className="text-sm font-medium text-ink">
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

      {isMobile ? (
        <MobileBlockPicker
          availableDays={availableDays}
          blockAssignmentsByKey={blockAssignmentsByKey}
          blocks={mobileBlocks}
          mobileDay={mobileDay}
          onChangeDay={setMobileDay}
          onSelectBlock={setSelectedBlockId}
          selectedBlockId={selectedBlockId}
        />
      ) : (
        <div className="overflow-x-auto overscroll-x-contain rounded-md border border-line bg-panel">
          <ScheduleTable
            assignments={assignments}
            blocks={blocks}
            emptyMessage="No hay bloques disponibles para este cuadro. Agrega un bloque personalizado o revisa la modalidad del grupo."
            getAssignmentBlockKey={(assignment) => assignment.scheduleBlockId}
            getBlockDay={(block) => block.dayOfWeek}
            getBlockEndsAt={(block) => block.endsAt}
            getBlockKey={(block) => block.id}
            getBlockModule={(block) => block.module}
            getBlockStartsAt={(block) => block.startsAt}
            renderCell={({ block, assignments: blockAssignments }) => (
              <label className="relative block h-full cursor-pointer">
                <input
                  checked={selectedBlockId === block.id}
                  className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  name="schedule_block_id"
                  onChange={() => setSelectedBlockId(block.id)}
                  required
                  type="radio"
                  value={block.id}
                />
                <span
                  className={cn(
                    "flex h-full flex-col gap-1 rounded-md border border-line bg-card p-2 text-xs text-ink transition peer-checked:border-brand peer-checked:bg-brandSoft peer-checked:text-brandDeep peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
                    block.isCustom && "border-dashed border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
                  )}
                >
                  <span className="font-semibold">{block.label}</span>
                  {block.isCustom ? <Badge tone="warning">Personalizado</Badge> : null}
                  {blockAssignments.length > 0 ? (
                    <span className="mt-auto grid gap-1">
                      {blockAssignments.map((assignment) => (
                        <span
                          className="rounded bg-blue-50 px-2 py-1 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                          key={assignment.id}
                        >
                          <span className="block font-medium">{assignment.subjectName}</span>
                          <span className="block">{assignment.teacherName}</span>
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
              </label>
            )}
          />
        </div>
      )}

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

function MobileBlockPicker({
  availableDays,
  blocks,
  mobileDay,
  blockAssignmentsByKey,
  onChangeDay,
  onSelectBlock,
  selectedBlockId
}: {
  availableDays: ReadonlyArray<{ value: number; short: string; label: string }>;
  blocks: ScheduleBlockOption[];
  mobileDay: number;
  blockAssignmentsByKey: Map<string, AssignmentPreview[]>;
  onChangeDay: (day: number) => void;
  onSelectBlock: (id: string) => void;
  selectedBlockId: string;
}) {
  if (availableDays.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        No hay bloques disponibles para este cuadro. Agrega un bloque personalizado o revisa la modalidad del grupo.
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-md border border-line bg-panel p-3">
      <div className="grid gap-2">
        <label className="text-xs font-semibold uppercase text-muted" htmlFor="mobile-day-select">
          Día
        </label>
        <Select
          className="h-11"
          id="mobile-day-select"
          onChange={(event) => onChangeDay(Number(event.target.value))}
          value={mobileDay}
        >
          {availableDays.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </Select>
      </div>
      <ul className="grid gap-2">
        {blocks.length === 0 ? (
          <li className="rounded-md border border-line bg-card p-3 text-sm text-muted">
            No hay bloques para este día.
          </li>
        ) : null}
        {blocks.map((block) => {
          const selected = selectedBlockId === block.id;
          const blockAssignments = blockAssignmentsByKey.get(block.id) ?? [];
          return (
            <li key={block.id}>
              <label
                className={cn(
                  "relative flex cursor-pointer flex-col gap-2 rounded-md border bg-card p-3 text-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand",
                  selected
                    ? "border-brand bg-brandSoft text-brandDeep"
                    : "border-line text-ink hover:border-brand hover:bg-brandSoft/50",
                  block.isCustom && !selected && "border-dashed border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
                )}
              >
                <input
                  checked={selected}
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  name="schedule_block_id"
                  onChange={() => onSelectBlock(block.id)}
                  required
                  type="radio"
                  value={block.id}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{block.label}</span>
                  {block.isCustom ? <Badge tone="warning">Personalizado</Badge> : null}
                </div>
                {blockAssignments.length > 0 ? (
                  <div className="grid gap-1 text-xs">
                    {blockAssignments.map((assignment) => (
                      <div
                        className="rounded bg-blue-50 px-2 py-1 text-blue-900 dark:bg-blue-950 dark:text-blue-100"
                        key={assignment.id}
                      >
                        <span className="block font-medium">{assignment.subjectName}</span>
                        <span className="block">{assignment.teacherName}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
