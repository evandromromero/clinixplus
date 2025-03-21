import React, { createContext, useContext, useState } from "react";
import {
  Toast,
  ToastProvider,
  ToastTitle,
  ToastDescription,
  ToastViewport,
  ToastClose,
} from "@/components/ui/toast";
import { Check, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext({
  success: () => {},
  error: () => {},
  info: () => {}
});

export const useToast = () => useContext(ToastContext);

export function ToastContextProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, ...toast }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const success = (title, description) => {
    addToast({
      variant: "success",
      title,
      description,
      icon: <Check className="h-4 w-4" />,
    });
  };

  const error = (title, description) => {
    addToast({
      variant: "destructive",
      title,
      description,
      icon: <AlertTriangle className="h-4 w-4" />,
    });
  };

  const info = (title, description) => {
    addToast({
      variant: "default",
      title,
      description,
      icon: null,
    });
  };

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      <ToastProvider>
        {toasts.map((toast) => (
          <Toast key={toast.id} variant={toast.variant}>
            <div className="flex gap-2">
              {toast.icon}
              <div className="grid gap-1">
                <ToastTitle>{toast.title}</ToastTitle>
                {toast.description && (
                  <ToastDescription>{toast.description}</ToastDescription>
                )}
              </div>
            </div>
            <ToastClose>
              <X className="h-4 w-4" />
            </ToastClose>
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  );
}