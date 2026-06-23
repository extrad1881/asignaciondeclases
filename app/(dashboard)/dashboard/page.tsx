export const dynamic = "force-dynamic";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  CircleAlert,
  FileText,
  GraduationCap,
  LayoutGrid,
  Plus,
  Users
} from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { getDashboardCounts } from "@/lib/supabase/queries";
import { getIncompleteData } from "@/lib/supabase/incomplete-data";
import { isAdmin } from "@/lib/permissions";


export default async function DashboardPage() {
  const supabase = await createClient();
  const [profile, counts, { data: groups = [] }] = await Promise.all([
    requireActiveProfileOrRedirect(),
    getDashboardCounts(),
    supabase
      .from("groups")
      .select("id, name, modality, shift, quarter, status, academic_cycles(code), careers(code)")
      .in("status", ["draft", "review", "final", "active"])
      .order("created_at", { ascending: false })
      .limit(6)
  ]);

  const incomplete = isAdmin(profile?.role_code) ? await getIncompleteData() : null;
  const incompleteTotal = incomplete?.issues.length ?? 0;
  const assignmentCoverage =
    counts.groups > 0 ? Math.round((Math.min(counts.assignments, counts.groups) / counts.groups) * 100) : 0;

  const quickLinks = [
    { href: "/grupos/nuevo", label: "Crear grupo", description: "Configura ciclo, carrera, materias y aula.", icon: Plus },
    { href: "/datos-incompletos", label: "Corregir datos", description: "Revisa pendientes antes de asignar clases.", icon: CircleAlert, adminOnly: true },
    { href: "/docentes", label: "Revisar docentes", description: "Valida perfiles aptos y horas máximas.", icon: Users },
    { href: "/reportes", label: "Exportar reporte", description: "Consulta y descarga asignaciones activas.", icon: FileText }
  ].filter((item) => !item.adminOnly || isAdmin(profile?.role_code));

  return (
    <>
      <SectionHeader
        eyebrow="Centro de control"
        title="Dashboard"
        description="Vista ejecutiva del estado académico: catálogos, grupos, asignaciones y pendientes de corrección."
      >
        <Link
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-subtle transition hover:bg-brandDeep"
          href="/grupos/nuevo"
        >
          <Plus className="h-4 w-4" />
          Crear grupo
        </Link>
      </SectionHeader>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard description="Carreras activas o registradas" icon={GraduationCap} label="Carreras" tone="brand" value={counts.careers} />
        <MetricCard description="Docentes en catálogo" icon={Users} label="Docentes" tone="info" value={counts.teachers} />
        <MetricCard description="Materias disponibles" icon={BookOpen} label="Materias" tone="warning" value={counts.subjects} />
        <MetricCard description="Grupos no archivados" icon={LayoutGrid} label="Grupos" tone="success" value={counts.groups} />
        <MetricCard description={`${assignmentCoverage}% de referencia operativa`} icon={CalendarDays} label="Asignaciones" value={counts.assignments} />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-md border border-line bg-card p-4 shadow-subtle">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Grupos recientes</h2>
              <p className="text-sm text-muted">Últimos grupos activos o en preparación.</p>
            </div>
            <Link className="text-sm font-semibold text-brand hover:text-brandDeep" href="/grupos">
              Ver todos
            </Link>
          </div>
          {(groups ?? []).length === 0 ? (
            <EmptyState
              action={
                <Link
                  className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-subtle transition hover:bg-brandDeep"
                  href="/grupos/nuevo"
                >
                  Crear primer grupo
                </Link>
              }
              description="Crea un grupo para empezar a asignar materias, docentes y bloques de horario."
              title="No hay grupos activos para este ciclo."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {(groups ?? []).map((group: any) => (
                <Link
                  className="rounded-md border border-line bg-panel p-3 transition hover:border-brand hover:bg-brandSoft/50"
                  href={`/grupos/${group.id}`}
                  key={group.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{group.name}</p>
                      <p className="mt-1 text-sm text-muted">
                        {group.careers?.code ?? "Sin carrera"} · {group.academic_cycles?.code ?? "Sin ciclo"}
                      </p>
                    </div>
                    <Badge tone="info">
                      {group.shift === "matutino" ? "MAT" : "VES"} {group.quarter}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-line bg-card p-4 shadow-subtle">
          <h2 className="text-lg font-semibold text-ink">Próximos pasos</h2>
          <p className="mt-1 text-sm text-muted">Acciones frecuentes para mantener el sistema listo.</p>
          <div className="mt-4 grid gap-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  className="flex items-start gap-3 rounded-md border border-line bg-panel p-3 transition hover:border-brand hover:bg-brandSoft/50"
                  href={item.href}
                  key={item.href}
                >
                  <span className="rounded-md bg-card p-2 text-brand shadow-subtle">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold text-ink">{item.label}</span>
                    <span className="mt-0.5 block text-sm text-muted">{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
          {isAdmin(profile?.role_code) ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-semibold">{incompleteTotal} pendiente(s) de datos incompletos</p>
              <p className="mt-1">Corrige estos datos antes de iniciar asignaciones masivas.</p>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
