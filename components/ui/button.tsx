import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold shadow-subtle transition disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-brand text-white hover:bg-brandDeep",
        variant === "secondary" && "border border-line bg-white text-ink hover:border-slate-300 hover:bg-slate-50",
        variant === "ghost" && "bg-transparent text-ink shadow-none hover:bg-slate-100",
        variant === "danger" && "bg-danger text-white hover:bg-red-800",
        className
      )}
      {...props}
    />
  );
}
