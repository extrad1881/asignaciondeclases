import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "info" | "danger" | "brand";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1",
        tone === "neutral" && "bg-panel text-muted ring-line",
        tone === "success" && "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800",
        tone === "warning" && "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800",
        tone === "info" && "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800",
        tone === "danger" && "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-800",
        tone === "brand" && "bg-brandSoft text-brandDeep ring-line-subtle dark:bg-brandSoft dark:text-brandLight"
      )}
    >
      {children}
    </span>
  );
}
