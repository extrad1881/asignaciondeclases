import { Badge } from "@/components/ui/badge";
import { DataCard } from "@/components/ui/data-card";
import {
  ClassroomManageControls,
  type ClassroomItem
} from "@/components/aulas/classroom-manage-controls";

export function ClassroomCard({ classroom }: { classroom: ClassroomItem }) {
  return (
    <DataCard
      actions={<ClassroomManageControls classroom={classroom} />}
      badge={
        <Badge tone={classroom.active ? "success" : "warning"}>
          {classroom.active ? "Activa" : "Inactiva"}
        </Badge>
      }
      fields={[
        { label: "Tipo", value: classroom.kind || "Sin especificar" },
        {
          label: "Capacidad",
          value: classroom.capacity == null ? "Sin especificar" : `${classroom.capacity} lugares`
        }
      ]}
      subtitle="Recurso académico"
      title={classroom.name}
    />
  );
}
