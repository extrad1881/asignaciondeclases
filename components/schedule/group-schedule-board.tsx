import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { WEEKDAYS } from "@/lib/constants";

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

type TimeRow = {
  key: string;
  startsAt: string;
  endsAt: string;
  kind: "class" | "break";
};

function formatTime(value: string) {
  return value.slice(0, 5);
}

function buildTimeRows(blocks: VisualScheduleBlock[]): TimeRow[] {
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

export function GroupScheduleBoard({
  assetPath,
  blocks,
  assignments
}: {
  assetPath?: string | null;
  blocks: VisualScheduleBlock[];
  assignments: VisualScheduleAssignment[];
}) {
  const days = WEEKDAYS.filter((day) => blocks.some((block) => block.dayOfWeek === day.value));
  const timeRows = buildTimeRows(blocks);

  return (
    <div className="space-y-3">
      {assetPath ? (
        <div className="relative overflow-hidden rounded-md border border-line bg-slate-50">
          <Image alt="Cuadro de horario" className="h-auto w-full object-contain" height={220} src={assetPath} width={1500} />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-line bg-white">
        {blocks.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No hay bloques disponibles.</p>
        ) : (
          <table className="w-full min-w-[760px] border-collapse text-sm">
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
                  <th className="bg-slate-50 px-3 py-3 text-left text-xs font-semibold text-slate-600">
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
                      <td className="h-24 border-l border-line p-2 align-top" key={day.value}>
                        {block ? (
                          <div className="grid gap-1 text-xs text-slate-600">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-medium text-ink">{block.label}</span>
                              {block.isCustom ? <Badge tone="warning">Personalizado</Badge> : null}
                            </div>
                            {blockAssignments.length > 0 ? (
                              blockAssignments.map((assignment) => (
                                <div className="rounded-md border border-blue-100 bg-blue-50 p-2 text-blue-900" key={assignment.id}>
                                  <p className="font-semibold">{assignment.subjectName}</p>
                                  <p>{assignment.teacherName}</p>
                                  {assignment.classroomName ? <p className="text-blue-700">{assignment.classroomName}</p> : null}
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-400">Libre</span>
                            )}
                          </div>
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
    </div>
  );
}
