import { SectionHeader } from "@/components/section-header";
import { ScheduleReference } from "@/components/schedule/schedule-reference";

export const dynamic = "force-dynamic";

export default function SchedulePage() {
  return (
    <>
      <SectionHeader
        eyebrow="Plantillas"
        title="Cuadros de horario"
        description="Referencia institucional de bloques disponibles por modalidad y turno. Los coordinadores pueden agregar bloques personalizados cuando sea necesario."
      />
      <ScheduleReference />
    </>
  );
}
