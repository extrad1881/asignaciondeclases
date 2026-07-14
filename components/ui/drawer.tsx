"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "@/lib/utils/use-body-scroll-lock";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  side?: "left" | "right";
  className?: string;
  children: React.ReactNode;
};

export function Drawer({
  open,
  onClose,
  ariaLabel,
  side = "left",
  className,
  children
}: DrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const firstFocusable = containerRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Tab" && containerRef.current) {
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button
        aria-label={`Cerrar ${ariaLabel}`}
        className="absolute inset-0 cursor-default bg-ink/45 backdrop-blur-sm motion-reduce:backdrop-blur-0"
        onClick={onClose}
        type="button"
      />
      <div
        ref={containerRef}
        aria-label={ariaLabel}
        className={cn(
          "absolute top-0 flex h-full w-72 max-w-[85vw] flex-col border-line bg-panel shadow-panel",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          "motion-safe:transition-transform motion-safe:duration-200",
          className
        )}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}
