import { ReactNode } from "react";
import { clsx } from "clsx";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={clsx("bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6", className)}>
      {children}
    </div>
  );
}
