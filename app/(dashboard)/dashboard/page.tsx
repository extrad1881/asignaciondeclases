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
import { LinkCard } from "@/components/ui/link-card";
import { MetricCard } from "@/components/ui/metric-card";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfileOrRedirect } from "@/lib/supabase/auth-helpers";
import { getDashboardCounts } from "@/lib/supabase/queries";
import { isAdmin } from "@/lib/permissions";


export default async function DashboardPage() {
  const supabase = await createClient();
  const [profile, counts, { data: groups = [] }] = await Promise.all([
    requireActiveProfileOrRedirect(),
    getDashboardCounts(supabase),
    supabase
      .from("groups")
      .select("id, name, modality, shift, quarter, status, academic_cycles(code), careers(code)")
      .in("status", ["draft", "review", "final", "active"])
      .order("created_at", { ascending: false })
      .limit(6)
  ]);

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
          <Plus className="h-4 w-4" aria-hidden />
          Crear grupo
        </Link>
      </SectionHeader>

      <section aria-label="Resumen del sistema" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard description="Carreras activas o registradas" icon={GraduationCap} label="Carreras" tone="brand" value={counts.careers} />
        <MetricCard description="Docentes en catálogo" icon={Users} label="Docentes" tone="info" value={counts.teachers} />
        <MetricCard description="Materias disponibles" icon={BookOpen} label="Materias" tone="warning" value={counts.subjects} />
        <MetricCard description="Grupos no archivados" icon={LayoutGrid} label="Grupos" tone="success" value={counts.groups} />
        <MetricCard description={`${assignmentCoverage}% de referencia operativa`} icon={CalendarDays} label="Asignaciones" value={counts.assignments} />
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-md border border-line bg-card p-4 shadow-subtle">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Grupos recientes</h2>
              <p className="text-sm text-muted">Últimos grupos activos o en preparación.</p>
            </div>
            <Link className="text-sm font-semibold text-brand hover:text-brandDeep focus-ring rounded-sm" href="/grupos">
              Ver todos
            </Link>
          </div>
          {(groups ?? []).length === 0 ? (
            <EmptyState
              action={
                <Link href="/grupos/nuevo">
                  <Button type="button" variant="primary">
                    Crear primer grupo
                  </Button>
                </Link>
              }
              description="Crea un grupo para empezar a asignar materias, docentes y bloques de horario."
              title="No hay grupos activos para este ciclo."
            />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {(groups ?? []).map((group) => (
                <li key={group.id}>
                  <LinkCard
                    ariaLabel={`Abrir grupo ${group.name}`}
                    badge={
                      <Badge tone="info">
                        {group.shift === "matutino" ? "MAT" : "VES"} {group.quarter}
                      </Badge>
                    }
                    description={`${group.careers?.code ?? "Sin carrera"} · ${group.academic_cycles?.code ?? "Sin ciclo"}`}
                    href={`/grupos/${group.id}`}
                    title={group.name}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-line bg-card p-4 shadow-subtle">
          <h2 className="text-lg font-semibold text-ink">Próximos pasos</h2>
          <p className="mt-1 text-sm text-muted">Acciones frecuentes para mantener el sistema listo.</p>
          <ul className="mt-4 grid gap-2">
            {quickLinks.map((item) => {
              return (
                <li key={item.href}>
                  <LinkCard
                    ariaLabel={item.label}
                    description={item.description}
                    href={item.href}
                    icon={item.icon}
                    title={item.label}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
