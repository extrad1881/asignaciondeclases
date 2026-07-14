import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-3 border-b border-line p-3",
        "sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center",
        className
      )}
    >
      {children}
    </div>
  );
}
