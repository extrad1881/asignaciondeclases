import Link from "next/link";
import { Fragment } from "react";
import { ChevronRight } from "lucide-react";

export type Crumb = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  const last = items.length - 1;
  return (
    <nav aria-label="Navegación" className="text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === last;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li className="flex items-center gap-1">
                {item.href && !isLast ? (
                  <Link
                    className="font-medium text-brand hover:text-brandDeep focus-ring rounded-sm"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className="font-semibold text-ink"
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast ? (
                <ChevronRight aria-hidden className="h-3 w-3 text-muted" />
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
