import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataCard } from "@/components/ui/data-card";

export type CareerListItem = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  coordinator_names: string[];
  active_subjects: number;
};

export function CareerListCard({ career, canManage }: { career: CareerListItem; canManage: boolean }) {
  return (
    <DataCard
      actions={
        canManage ? (
          <Link className="block w-full" href={`/carreras/${career.id}/materias`}>
            <Button className="h-10 w-full" type="button" variant="secondary">
              <BookOpen aria-hidden className="h-4 w-4" />
              Ver y modificar
            </Button>
          </Link>
        ) : null
      }
      badge={
        <Badge tone={career.active ? "success" : "warning"}>
          {career.active ? "Activa" : "Inactiva"}
        </Badge>
      }
      fields={[
        {
          label: "Coordinadores",
          value:
            career.coordinator_names.length === 0 ? (
              <span className="text-muted">Sin asignar</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {career.coordinator_names.map((name: string, index: number) => (
                  <Badge key={`${career.id}-coord-${index}`}>{name}</Badge>
                ))}
              </div>
            )
        },
        { label: "Materias activas", value: career.active_subjects }
      ]}
      subtitle={career.code}
      title={career.name}
    />
  );
}
