"use client";

import { useEffect, useId, useRef } from "react";
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
  error,
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
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setTimeout(() => cancelButtonRef.current?.focus(), 0);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key === "Tab") {
        const container = dialogRef.current;
        if (!container) return;
        const focusable = container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-4"
      ref={dialogRef}
      role="dialog"
    >
      <div className="w-full max-w-md rounded-md border border-line bg-card p-5 text-card-foreground shadow-lg">
        <h2 className="text-lg font-semibold text-ink" id={titleId}>
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted" id={descriptionId}>
          {description}
        </p>
        {affectedName ? (
          <div className="mt-4 rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium text-ink">
            {affectedName}
          </div>
        ) : null}
        {error ? (
          <div
            aria-live="polite"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button disabled={pending} onClick={onCancel} ref={cancelButtonRef} type="button" variant="secondary">
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
