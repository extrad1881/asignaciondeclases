import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataCard } from "@/components/ui/data-card";
import type { IncompleteIssue, IncompleteSeverity, IncompleteCategory } from "@/lib/supabase/incomplete-data";

const categoryLabels: Record<IncompleteCategory, string> = {
  docentes: "Docentes",
  materias: "Materias",
  grupos: "Grupos",
  asignaciones: "Asignaciones"
};

const severityLabels: Record<IncompleteSeverity, string> = {
  critico: "Crítico",
  advertencia: "Advertencia",
  informativo: "Informativo"
};

const severityTone: Record<IncompleteSeverity, "danger" | "warning" | "info"> = {
  critico: "danger",
  advertencia: "warning",
  informativo: "info"
};

export function IssueCard({ issue }: { issue: IncompleteIssue }) {
  const context = [issue.careerLabel, issue.groupLabel, issue.quarter ? `Cuat. ${issue.quarter}` : null]
    .filter(Boolean)
    .join(" / ");

  return (
    <DataCard
      actions={
        issue.href ? (
          <Link href={issue.href}>
            <Button className="h-10 w-full" type="button" variant="secondary">
              Corregir datos
            </Button>
          </Link>
        ) : (
          <span className="text-sm text-muted">Sin ruta</span>
        )
      }
      badge={
        <div className="flex flex-col items-end gap-1">
          <Badge tone={severityTone[issue.severity]}>{severityLabels[issue.severity]}</Badge>
          <Badge tone="brand">{categoryLabels[issue.category]}</Badge>
        </div>
      }
      fields={[
        { label: "Elemento", value: issue.entityName },
        { label: "Coordinador", value: issue.coordinatorLabel ?? "Sin coordinador" },
        {
          label: "Contexto",
          value: context || "Sin contexto adicional",
          span: 2
        },
        {
          label: "Detalle",
          value: <span className="text-muted">{issue.detail}</span>,
          span: 2
        }
      ]}
      title={issue.title}
    />
  );
}
