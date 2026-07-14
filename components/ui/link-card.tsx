import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type LinkCardProps = {
  href: string;
  title: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  badge?: ReactNode;
  className?: string;
  ariaLabel?: string;
};

export function LinkCard({
  href,
  title,
  subtitle,
  description,
  icon: Icon,
  badge,
  className,
  ariaLabel
}: LinkCardProps) {
  return (
    <Link
      aria-label={ariaLabel}
      className={cn(
        "focus-ring flex items-start gap-3 rounded-md border border-line bg-panel p-3 transition-colors motion-safe:duration-150",
        "hover:border-brand hover:bg-brandSoft/50",
        className
      )}
      href={href}
    >
      {Icon ? (
        <span
          aria-hidden="true"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-card text-brand shadow-subtle"
        >
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="block min-w-0 truncate font-semibold leading-5 text-ink">{title}</span>
          {badge ? <span className="flex-shrink-0">{badge}</span> : null}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block text-sm leading-5 text-muted">{subtitle}</span>
        ) : null}
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
        ) : null}
      </span>
    </Link>
  );
}
