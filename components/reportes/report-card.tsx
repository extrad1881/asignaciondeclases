import { Badge } from "@/components/ui/badge";
import { DataCard } from "@/components/ui/data-card";

export type ReportRow = {
  ciclo: string;
  carrera: string;
  grupo: string;
  modalidad: string;
  turno: string;
  materia: string;
  docente: string;
  dia: string;
  hora: string;
  aula: string;
};

function shiftLabel(value: string) {
  return value === "matutino" ? "Matutino" : value === "vespertino" ? "Vespertino" : value;
}

function modalityLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function ReportCard({ row }: { row: ReportRow }) {
  return (
    <DataCard
      badge={<Badge tone="brand">{row.dia}</Badge>}
      fields={[
        { label: "Ciclo", value: row.ciclo },
        { label: "Carrera", value: row.carrera },
        { label: "Grupo", value: row.grupo },
        { label: "Modalidad", value: modalityLabel(row.modalidad) },
        { label: "Turno", value: shiftLabel(row.turno) },
        { label: "Docente", value: row.docente },
        { label: "Hora", value: row.hora },
        { label: "Aula", value: row.aula || "Sin aula" }
      ]}
      title={row.materia}
    />
  );
}
