"use client";

import { useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { ActionState } from "@/lib/actions/action-state";

export type ConfirmActionButtonProps = Omit<ButtonProps, "type"> & {
  title: string;
  description: string;
  affectedName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  action?: (formData: FormData) => Promise<ActionState>;
  successMessage?: string;
};

export function ConfirmActionButton({
  title,
  description,
  affectedName,
  confirmLabel = "Confirmar",
  cancelLabel,
  danger = false,
  action,
  successMessage,
  children,
  variant,
  onClick,
  ...buttonProps
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { pending: formPending } = useFormStatus();
  const router = useRouter();
  const submitRef = useRef<HTMLButtonElement>(null);
  const pending = formPending || isPending;

  function handleConfirm() {
    setError("");

    if (!action) {
      submitRef.current?.form?.requestSubmit(submitRef.current);
      return;
    }

    const form = submitRef.current?.form;
    if (!form) {
      setError("No se encontró el formulario para ejecutar la acción.");
      return;
    }

    const formData = new FormData(form);
    startTransition(async () => {
      let result: ActionState;

      try {
        result = await action(formData);
      } catch (error) {
        const message = error instanceof Error && error.message ? error.message : "No se pudo completar la acción.";
        setError(message);
        toast.error(message);
        return;
      }

      if (!result.success) {
        setError(result.message);
        toast.error(result.message);
        return;
      }

      toast.success(successMessage ?? result.message);
      setOpen(false);

      if (result.redirectTo) {
        router.push(result.redirectTo);
      }
    });
  }

  return (
    <>
      <Button
        {...buttonProps}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            setError("");
            setOpen(true);
          }
        }}
        type="button"
        variant={variant ?? (danger ? "danger" : "secondary")}
      >
        {children}
      </Button>
      <button aria-hidden className="hidden" ref={submitRef} tabIndex={-1} type="submit" />
      <ConfirmDialog
        affectedName={affectedName}
        cancelLabel={cancelLabel}
        confirmLabel={confirmLabel}
        description={description}
        onCancel={() => setOpen(false)}
        onConfirm={handleConfirm}
        open={open}
        pending={pending}
        error={error}
        title={title}
        variant={danger ? "danger" : "secondary"}
      />
    </>
  );
}
