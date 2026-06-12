import Image from "next/image";
import { WEEKDAYS } from "@/lib/constants";
import { findScheduleTemplate, type ScheduleTemplateConfig } from "@/lib/schedule/templates";
import { Badge } from "@/components/ui/badge";

type AssignmentView = {
  id: string;
  schedule_block_id: string;
  teacher_name?: string | null;
  subject_name?: string | null;
  group_name?: string | null;
  classroom_name?: string | null;
};

type TimeRow = {
  key: string;
  startsAt: string;
  endsAt: string;
  kind: "class" | "break";
};

function buildTimeRows(blocks: { startsAt: string; endsAt: string }[]): TimeRow[] {
  const classRows = Array.from(
    new Map(
      blocks
        .map((block) => ({
          key: `${block.startsAt}-${block.endsAt}`,
          startsAt: block.startsAt,
          endsAt: block.endsAt,
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

export function ScheduleGrid({
  modality,
  shift,
  assignments = [],
  template: providedTemplate
}: {
  modality: string;
  shift: string;
  assignments?: AssignmentView[];
  template?: ScheduleTemplateConfig;
}) {
  const template = providedTemplate ?? findScheduleTemplate(modality, shift);
  if (!template) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        No existe plantilla para esta modalidad y turno.
      </div>
    );
  }

  const days = WEEKDAYS.filter((day) =>
    template.blocks.some((block) => block.dayOfWeek === day.value)
  );
  const uniqueTimes = buildTimeRows(template.blocks);

  return (
    <section className="space-y-4">
      <div className="rounded-md border border-line bg-white p-3 shadow-subtle">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">{template.label}</h2>
            <p className="text-sm text-slate-600">Base visual tomada de la carpeta assets.</p>
          </div>
          <Badge tone="info">{template.code}</Badge>
        </div>
        <div className="relative overflow-hidden rounded-md border border-line bg-slate-50">
          <Image
            alt={`Plantilla ${template.label}`}
            className="h-auto w-full object-contain"
            height={260}
            src={template.asset}
            width={1500}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-line bg-white shadow-subtle">
        <table className="w-full min-w-[840px] border-collapse text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="w-36 px-3 py-3 text-left font-semibold">Bloque</th>
              {days.map((day) => (
                <th className="px-3 py-3 text-left font-semibold" key={day.value}>
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniqueTimes.map((time) => (
              <tr className="border-t border-line" key={`${time.startsAt}-${time.endsAt}`}>
                <th className="bg-slate-50 px-3 py-3 text-left font-medium text-slate-700">
                  {time.kind === "break" ? "RECESO" : `${time.startsAt} - ${time.endsAt}`}
                </th>
                {time.kind === "break" ? (
                  <td className="bg-amber-50 px-3 py-3 text-center text-xs font-semibold uppercase text-amber-700" colSpan={days.length}>
                    Receso {time.startsAt} - {time.endsAt}
                  </td>
                ) : (
                days.map((day) => {
                  const block = template.blocks.find(
                    (item) =>
                      item.dayOfWeek === day.value &&
                      item.startsAt === time.startsAt &&
                      item.endsAt === time.endsAt
                  );
                  const blockAssignments = assignments.filter(
                    (assignment) => assignment.schedule_block_id === block?.label
                  );

                  return (
                    <td className="h-24 border-l border-line px-3 py-3 align-top" key={day.value}>
                      {blockAssignments.length > 0 ? (
                        <div className="space-y-2">
                          {blockAssignments.map((assignment) => (
                            <div
                              className="rounded-md border border-blue-100 bg-blue-50 p-2 text-xs text-blue-900"
                              key={assignment.id}
                            >
                              <p className="font-semibold">{assignment.subject_name}</p>
                              <p>{assignment.teacher_name}</p>
                              <p className="text-blue-700">{assignment.group_name}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">{block?.label ?? "No aplica"}</span>
                      )}
                    </td>
                  );
                })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
