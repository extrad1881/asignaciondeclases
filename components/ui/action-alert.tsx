import type { ActionState } from "@/lib/actions/action-state";
import { cn } from "@/lib/utils";

export function ActionAlert({ state, className }: { state: ActionState; className?: string }) {
  if (!state.message) return null;

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        state.success
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
        className
      )}
      role={state.success ? "status" : "alert"}
    >
      {state.message}
    </div>
  );
}
