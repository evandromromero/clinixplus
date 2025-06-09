import React from "react";
import { cn } from "@/lib/utils";

/**
 * Componente de spinner para indicar carregamento
 * @param {Object} props - Propriedades do componente
 * @param {string} props.size - Tamanho do spinner (sm, md, lg)
 * @param {string} props.className - Classes adicionais
 * @returns {JSX.Element} Componente Spinner
 */
export function Spinner({ size = "md", className }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent text-primary",
        sizeClasses[size],
        className
      )}
    />
  );
}
