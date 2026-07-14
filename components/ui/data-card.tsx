import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Field = {
  label: string;
  value: ReactNode;
  span?: 1 | 2;
};

type DataCardProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  fields?: Field[];
  actions?: ReactNode;
  className?: string;
};

export function DataCard({ title, subtitle, badge, fields = [], actions, className }: DataCardProps) {
  return (
    <article
      className={cn(
        "rounded-md border border-line bg-card p-4 text-card-foreground shadow-subtle",
        "flex flex-col gap-3",
        className
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold leading-5 text-ink">{title}</h3>
          {subtitle ? <p className="mt-0.5 truncate text-xs leading-5 text-muted">{subtitle}</p> : null}
        </div>
        {badge ? <div className="flex flex-shrink-0 flex-wrap items-center gap-1">{badge}</div> : null}
      </header>
      {fields.length > 0 ? (
        <dl className="grid grid-cols-1 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-2">
          {fields.map((field, index) => (
            <div
              className={cn("flex min-w-0 flex-col gap-0.5", field.span === 2 && "sm:col-span-2")}
              key={index}
            >
              <dt className="font-semibold uppercase tracking-wide text-muted">{field.label}</dt>
              <dd className="break-words text-ink">{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {actions ? (
        <footer className="flex flex-wrap items-center gap-2 border-t border-line pt-3">{actions}</footer>
      ) : null}
    </article>
  );
}
