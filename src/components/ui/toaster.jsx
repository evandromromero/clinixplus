import { useToast } from "@/components/ui/use-toast";
import { ToastProvider } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, message, type }) {
        return (
          <div key={id} className="grid gap-1">
            {message}
          </div>
        );
      })}
    </ToastProvider>
  );
}