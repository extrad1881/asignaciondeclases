"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ScheduleTable } from "@/components/schedule/schedule-table";
import { WEEKDAYS } from "@/lib/constants";
import { useMediaQuery } from "@/lib/utils/use-media-query";
import { cn } from "@/lib/utils";

export type VisualScheduleBlock = {
  id: string;
  label: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  isCustom?: boolean;
  module?: number;
};

export type VisualScheduleAssignment = {
  id: string;
  scheduleBlockId: string;
  subjectName?: string | null;
  teacherName?: string | null;
  classroomName?: string | null;
};

export function GroupScheduleBoard({
  assetPath,
  blocks,
  assignments
}: {
  assetPath?: string | null;
  blocks: VisualScheduleBlock[];
  assignments: VisualScheduleAssignment[];
}) {
  const isMobile = useMediaQuery("(max-width: 767px)");

  const availableDays = useMemo(() => {
    const daySet = new Set(blocks.map((b) => b.dayOfWeek));
    return WEEKDAYS.filter((day) => daySet.has(day.value));
  }, [blocks]);

  const [mobileDay, setMobileDay] = useState<number | null>(null);
  const activeMobileDay = mobileDay ?? availableDays[0]?.value ?? null;
  const mobileBlocks = useMemo(
    () => blocks.filter((block) => block.dayOfWeek === activeMobileDay),
    [blocks, activeMobileDay]
  );

  return (
    <div className="space-y-3">
      {assetPath ? (
        <div className="relative overflow-hidden rounded-md border border-line bg-panel">
          <Image alt="Cuadro de horario" className="h-auto w-full object-contain" height={220} src={assetPath} width={1500} />
        </div>
      ) : null}

      {isMobile && availableDays.length > 0 ? (
        <div className="space-y-2">
          <div role="tablist" aria-label="Día de la semana" className="flex flex-wrap gap-1">
            {availableDays.map((day) => {
              const selected = activeMobileDay === day.value;
              return (
                <button
                  aria-selected={selected}
                  className={cn(
                    "focus-ring inline-flex h-9 items-center rounded-md border border-line px-3 text-xs font-semibold transition",
                    selected
                      ? "bg-brand text-primary-foreground"
                      : "bg-background text-ink hover:bg-accent"
                  )}
                  key={day.value}
                  onClick={() => setMobileDay(day.value)}
                  role="tab"
                  type="button"
                >
                  {day.short}
                </button>
              );
            })}
          </div>
          <div className="relative overflow-x-auto overscroll-x-contain rounded-md border border-line bg-card">
            <ScheduleTable
              assignments={assignments}
              blocks={mobileBlocks}
              emptyMessage="No hay bloques disponibles para este día."
              getAssignmentBlockKey={(assignment) => assignment.scheduleBlockId}
              getBlockDay={(block) => block.dayOfWeek}
              getBlockEndsAt={(block) => block.endsAt}
              getBlockKey={(block) => block.id}
              getBlockModule={(block) => block.module}
              getBlockStartsAt={(block) => block.startsAt}
              renderCell={({ block, assignments: blockAssignments }) => (
                <div className="grid gap-1 text-xs text-muted">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="font-medium text-ink">{block.label}</span>
                    {block.isCustom ? <Badge tone="warning">Personalizado</Badge> : null}
                  </div>
                  {blockAssignments.length > 0 ? (
                    blockAssignments.map((assignment) => (
                      <div
                        className="rounded-md border border-blue-100 bg-blue-50 p-2 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"
                        key={assignment.id}
                      >
                        <p className="font-semibold">{assignment.subjectName}</p>
                        <p>{assignment.teacherName}</p>
                        {assignment.classroomName ? <p className="text-blue-700 dark:text-blue-300">{assignment.classroomName}</p> : null}
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground">Libre</span>
                  )}
                </div>
              )}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent motion-reduce:hidden"
            />
          </div>
        </div>
      ) : (
        <div className="relative overflow-x-auto overscroll-x-contain rounded-md border border-line bg-card">
          <ScheduleTable
            assignments={assignments}
            blocks={blocks}
            emptyMessage="No hay bloques disponibles."
            getAssignmentBlockKey={(assignment) => assignment.scheduleBlockId}
            getBlockDay={(block) => block.dayOfWeek}
            getBlockEndsAt={(block) => block.endsAt}
            getBlockKey={(block) => block.id}
            getBlockModule={(block) => block.module}
            getBlockStartsAt={(block) => block.startsAt}
            renderCell={({ block, assignments: blockAssignments }) => (
              <div className="grid gap-1 text-xs text-muted">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-medium text-ink">{block.label}</span>
                  {block.isCustom ? <Badge tone="warning">Personalizado</Badge> : null}
                </div>
                {blockAssignments.length > 0 ? (
                  blockAssignments.map((assignment) => (
                    <div
                      className="rounded-md border border-blue-100 bg-blue-50 p-2 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"
                      key={assignment.id}
                    >
                      <p className="font-semibold">{assignment.subjectName}</p>
                      <p>{assignment.teacherName}</p>
                      {assignment.classroomName ? <p className="text-blue-700 dark:text-blue-300">{assignment.classroomName}</p> : null}
                    </div>
                  ))
                ) : (
                  <span className="text-muted-foreground">Libre</span>
                )}
              </div>
            )}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent motion-reduce:hidden"
          />
        </div>
      )}
    </div>
  );
}
