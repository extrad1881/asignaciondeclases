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
        tone === "neutral" && "bg-slate-100 text-slate-700 ring-slate-200",
        tone === "success" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
        tone === "warning" && "bg-amber-50 text-amber-700 ring-amber-200",
        tone === "info" && "bg-blue-50 text-blue-700 ring-blue-200",
        tone === "danger" && "bg-red-50 text-red-700 ring-red-200",
        tone === "brand" && "bg-brandSoft text-brandDeep ring-teal-200"
      )}
    >
      {children}
    </span>
  );
}
