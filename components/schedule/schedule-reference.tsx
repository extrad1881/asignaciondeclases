import { scheduleTemplates } from "@/lib/schedule/templates";
import { ScheduleGrid } from "@/components/schedule/schedule-grid";

export function ScheduleReference() {
  return (
    <div className="space-y-8">
      {scheduleTemplates.map((template) => (
        <ScheduleGrid
          key={template.code}
          modality={template.modality}
          shift={template.shift}
          template={template}
        />
      ))}
    </div>
  );
}
