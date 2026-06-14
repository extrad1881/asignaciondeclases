import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const toneStyles = {
  brand: "bg-brandSoft text-brandDeep",
  info: "bg-blue-50 text-blue-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  neutral: "bg-slate-100 text-slate-700",
  danger: "bg-red-50 text-red-700"
};

export function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "neutral",
  className
}: {
  label: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  tone?: keyof typeof toneStyles;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-line bg-white p-4 shadow-subtle", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        <span className={cn("rounded-md p-2", toneStyles[tone])}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  );
}
