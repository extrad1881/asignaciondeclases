"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConfirmDialog({
  open,
  title,
  description,
  affectedName,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "secondary",
  pending = false,
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  description: string;
  affectedName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "secondary" | "danger";
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-md border border-line bg-white p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        {affectedName ? (
          <div className="mt-4 rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-medium text-ink">
            {affectedName}
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button disabled={pending} onClick={onCancel} type="button" variant="secondary">
            {cancelLabel}
          </Button>
          <Button
            className={cn(pending && "cursor-wait")}
            disabled={pending}
            onClick={onConfirm}
            type="button"
            variant={variant}
          >
            {pending ? "Procesando..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
