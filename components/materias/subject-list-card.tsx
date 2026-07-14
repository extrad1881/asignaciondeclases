import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataCard } from "@/components/ui/data-card";
import { formatHours } from "@/lib/utils";

export type SubjectListItem = {
  id: string;
  name: string;
  career_code: string;
  career_id: string | null;
  quarter: number;
  default_hours: number;
  active: boolean;
  profiles: string[];
};

export function SubjectListCard({ subject, canManage }: { subject: SubjectListItem; canManage: boolean }) {
  return (
    <DataCard
      actions={
        canManage && subject.career_id ? (
          <Link className="block w-full" href={`/carreras/${subject.career_id}/materias`}>
            <Button className="h-10 w-full" type="button" variant="secondary">
              <BookOpen aria-hidden className="h-4 w-4" />
              Modificar carrera
            </Button>
          </Link>
        ) : null
      }
      badge={
        <Badge tone={subject.active ? "success" : "warning"}>
          {subject.active ? "Activa" : "Inactiva"}
        </Badge>
      }
      fields={[
        { label: "Carrera", value: subject.career_code },
        { label: "Cuatrimestre", value: subject.quarter },
        { label: "Carga", value: formatHours(subject.default_hours) },
        {
          label: "Perfil requerido",
          value:
            subject.profiles.length === 0 ? (
              <span className="text-muted">Sin perfil</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {subject.profiles.map((code: string) => (
                  <Badge key={code} tone="info">
                    {code}
                  </Badge>
                ))}
              </div>
            )
        }
      ]}
      title={subject.name}
    />
  );
}
