import Link from "next/link";
import { BookOpen } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function CareersPage() {
  const supabase = await createClient();
  const [profile, { data: careers = [] }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("careers")
      .select("id, code, name, active, coordinator_careers(coordinators(name)), subjects(id, active)")
      .order("code")
  ]);
  const careerRows = careers ?? [];
  const canManageSubjects = isAdmin(profile?.role_code);

  return (
    <>
      <SectionHeader eyebrow="Catálogo" title="Carreras" />
      <DataTable
        headers={
          canManageSubjects
            ? ["Clave", "Carrera", "Coordinadores", "Materias", "Estado", "Asignaturas"]
            : ["Clave", "Carrera", "Coordinadores", "Materias", "Estado"]
        }
        rows={careerRows.map((career: any) => [
          <span className="font-medium text-ink" key="code">{career.code}</span>,
          career.name,
          <div className="flex flex-wrap gap-1" key="coordinators">
            {(career.coordinator_careers ?? []).length === 0 ? (
              <span className="text-slate-400">Sin asignar</span>
            ) : (
              career.coordinator_careers.map((item: any, index: number) => (
                <Badge key={`${career.id}-${index}`}>{item.coordinators?.name}</Badge>
              ))
            )}
          </div>,
          (career.subjects ?? []).filter((subject: any) => subject.active).length,
          <Badge key="state" tone={career.active ? "success" : "warning"}>
            {career.active ? "Activa" : "Inactiva"}
          </Badge>,
          ...(canManageSubjects
            ? [
                <Link href={`/carreras/${career.id}/materias`} key="subjects">
                  <Button type="button" variant="secondary">
                    <BookOpen className="h-4 w-4" />
                    Ver y modificar
                  </Button>
                </Link>
              ]
            : [])
        ])}
      />
    </>
  );
}
