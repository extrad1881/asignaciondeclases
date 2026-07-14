import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
  children?: ReactNode;
  rounded?: "sm" | "md" | "lg" | "full";
};

export function Skeleton({ className, children, rounded = "md" }: SkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-hidden={children ? undefined : true}
      className={cn(
        "relative overflow-hidden bg-line-subtle/70 motion-reduce:animate-none",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent",
        "motion-safe:before:animate-[shimmer_1.4s_infinite]",
        rounded === "sm" && "rounded-sm",
        rounded === "md" && "rounded-md",
        rounded === "lg" && "rounded-lg",
        rounded === "full" && "rounded-full",
        className
      )}
    >
      {children ? <span className="sr-only">{children}</span> : null}
    </div>
  );
}
