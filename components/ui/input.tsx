import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring h-10 w-full rounded-md border border-line bg-background px-3 text-sm text-ink shadow-subtle placeholder:text-muted-foreground hover:border-line-subtle disabled:bg-panel disabled:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
