import type { LucideIcon } from "lucide-react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  icon: Icon = CircleAlert,
  action,
  className
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-dashed border-line bg-card px-5 py-6 text-center shadow-subtle", className)}>
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-brandSoft text-brandDeep dark:text-brandLight">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
