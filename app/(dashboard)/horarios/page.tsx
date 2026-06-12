import { SectionHeader } from "@/components/section-header";
import { ScheduleReference } from "@/components/schedule/schedule-reference";

export const dynamic = "force-dynamic";

export default function SchedulePage() {
  return (
    <>
      <SectionHeader eyebrow="Plantillas" title="Cuadros de horario" />
      <ScheduleReference />
    </>
  );
}
