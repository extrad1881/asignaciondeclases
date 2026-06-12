"use client";

import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";

export type ConfirmActionButtonProps = Omit<ButtonProps, "type"> & {
  title: string;
  description: string;
  affectedName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export function ConfirmActionButton({
  title,
  description,
  affectedName,
  confirmLabel = "Confirmar",
  cancelLabel,
  danger = false,
  children,
  variant,
  onClick,
  ...buttonProps
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const submitRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        {...buttonProps}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) setOpen(true);
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
        onConfirm={() => {
          setPending(true);
          submitRef.current?.form?.requestSubmit(submitRef.current);
        }}
        open={open}
        pending={pending}
        title={title}
        variant={danger ? "danger" : "secondary"}
      />
    </>
  );
}
