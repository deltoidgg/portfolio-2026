import type { ReactNode } from "react";
import { cn } from "../cn";

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** A bordered surface for grouped content. */
export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("rounded-lg border border-edge bg-surface p-5", className)}>{children}</div>
  );
}
