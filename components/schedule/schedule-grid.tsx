import Image from "next/image";
import { findScheduleTemplate, type ScheduleTemplateConfig } from "@/lib/schedule/templates";
import { Badge } from "@/components/ui/badge";
import { ScheduleTable } from "@/components/schedule/schedule-table";

type AssignmentView = {
  id: string;
  schedule_block_id: string;
  teacher_name?: string | null;
  subject_name?: string | null;
  group_name?: string | null;
  classroom_name?: string | null;
};

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
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        No existe plantilla para esta modalidad y turno.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-md border border-line bg-card p-3 shadow-subtle">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">{template.label}</h2>
            <p className="text-sm text-muted">Base visual tomada de la carpeta assets.</p>
          </div>
          <Badge tone="info">{template.code}</Badge>
        </div>
        <div className="relative overflow-hidden rounded-md border border-line bg-panel">
          <Image
            alt={`Plantilla ${template.label}`}
            className="h-auto w-full object-contain"
            height={260}
            src={template.asset}
            width={1500}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-line bg-card shadow-subtle">
        <ScheduleTable
          assignments={assignments}
          blocks={template.blocks}
          dayLabel="full"
          getAssignmentBlockKey={(assignment) => assignment.schedule_block_id}
          getBlockDay={(block) => block.dayOfWeek}
          getBlockEndsAt={(block) => block.endsAt}
          getBlockKey={(block) => block.label}
          getBlockStartsAt={(block) => block.startsAt}
          renderCell={({ block, assignments: blockAssignments }) =>
            blockAssignments.length > 0 ? (
              <div className="space-y-2">
                {blockAssignments.map((assignment) => (
                  <div
                    className="rounded-md border border-blue-100 bg-blue-50 p-2 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"
                    key={assignment.id}
                  >
                    <p className="font-semibold">{assignment.subject_name}</p>
                    <p>{assignment.teacher_name}</p>
                    <p className="text-blue-700 dark:text-blue-300">{assignment.group_name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">{block.label}</span>
            )
          }
        />
      </div>
    </section>
  );
}
