import Link from "next/link";
import { BookOpen, CalendarDays, GraduationCap, LayoutGrid, Users } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getDashboardCounts } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const counts = await getDashboardCounts();
  const { data: groups = [] } = await supabase
    .from("groups")
    .select("id, name, modality, shift, quarter, academic_cycles(code), careers(code)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(6);
  const groupRows = groups ?? [];

  const stats = [
    { label: "Carreras", value: counts.careers, icon: GraduationCap, tone: "bg-teal-50 text-teal-700" },
    { label: "Docentes", value: counts.teachers, icon: Users, tone: "bg-blue-50 text-blue-700" },
    { label: "Materias", value: counts.subjects, icon: BookOpen, tone: "bg-amber-50 text-amber-700" },
    { label: "Grupos", value: counts.groups, icon: LayoutGrid, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Asignaciones", value: counts.assignments, icon: CalendarDays, tone: "bg-slate-100 text-slate-700" }
  ];

  return (
    <>
      <SectionHeader eyebrow="Inicio" title="Dashboard">
        <Link href="/grupos/nuevo">
          <Button>Crear grupo</Button>
        </Link>
      </SectionHeader>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div className="rounded-md border border-line bg-white p-4 shadow-subtle" key={stat.label}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-ink">{stat.value}</p>
                </div>
                <span className={`rounded-md p-2 ${stat.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 rounded-md border border-line bg-white p-4 shadow-subtle">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Grupos recientes</h2>
          <Link className="text-sm font-medium text-brand hover:text-teal-800" href="/grupos">
            Ver todos
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groupRows.length === 0 ? (
            <p className="text-sm text-slate-500">Importa datos y crea un grupo para iniciar.</p>
          ) : (
            groupRows.map((group: any) => (
              <Link
                className="rounded-md border border-line bg-slate-50 p-3 hover:bg-slate-100"
                href={`/grupos/${group.id}`}
                key={group.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">{group.name}</p>
                    <p className="text-sm text-slate-500">
                      {group.careers?.code} · {group.academic_cycles?.code}
                    </p>
                  </div>
                  <Badge tone="info">
                    {group.shift === "matutino" ? "MAT" : "VES"} {group.quarter}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </>
  );
}
