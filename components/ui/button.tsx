import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold shadow-subtle transition disabled:pointer-events-none disabled:opacity-50",
          variant === "primary" && "bg-brand text-primary-foreground hover:bg-brandDeep",
          variant === "secondary" && "border border-line bg-background text-ink hover:border-line-subtle hover:bg-accent",
          variant === "ghost" && "bg-transparent text-ink shadow-none hover:bg-accent",
          variant === "danger" && "bg-destructive text-destructive-foreground hover:bg-red-800",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
