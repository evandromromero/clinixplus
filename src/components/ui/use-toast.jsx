import React, { createContext, useContext, useState } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { Check, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext({
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {}
});

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Simplificando a função de toast para evitar problemas
export function toast(props) {
  console.log("Toast:", props);
  // Não faz nada, apenas registra no console
}

// Para manter compatibilidade com código existente
toast.success = (message) => console.log("Toast success:", message);
toast.error = (message) => console.log("Toast error:", message);
toast.info = (message) => console.log("Toast info:", message);

export function ToastsProvider({ children }) {
  // Implementação simplificada que não causa erros
  return (
    <>
      {children}
    </>
  );
}

// Exportamos apenas o que realmente precisamos
export { ToastProvider };