import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ResponsiveTableProps = {
  table: ReactNode;
  cards: ReactNode;
  className?: string;
};

export function ResponsiveTable({ table, cards, className }: ResponsiveTableProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="lg:hidden">{cards}</div>
      <div className="hidden lg:block">{table}</div>
    </div>
  );
}
