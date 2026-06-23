import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ScheduleTable } from "@/components/schedule/schedule-table";

export type VisualScheduleBlock = {
  id: string;
  label: string;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
  isCustom?: boolean;
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
  return (
    <div className="space-y-3">
      {assetPath ? (
        <div className="relative overflow-hidden rounded-md border border-line bg-panel">
          <Image alt="Cuadro de horario" className="h-auto w-full object-contain" height={220} src={assetPath} width={1500} />
        </div>
      ) : null}

      <div className="overflow-x-auto overscroll-x-contain rounded-md border border-line bg-card">
        <ScheduleTable
          assignments={assignments}
          blocks={blocks}
          emptyMessage="No hay bloques disponibles."
          getAssignmentBlockKey={(assignment) => assignment.scheduleBlockId}
          getBlockDay={(block) => block.dayOfWeek}
          getBlockEndsAt={(block) => block.endsAt}
          getBlockKey={(block) => block.id}
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
      </div>
    </div>
  );
}
