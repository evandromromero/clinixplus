import * as React from "react";

const ToastContext = React.createContext({
  success: () => {},
  error: () => {}
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  const success = (message) => {
    console.log("Success:", message);
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type: 'success' }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const error = (message) => {
    console.error("Error:", message);
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type: 'error' }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`px-4 py-3 rounded-md shadow-lg ${
              toast.type === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => React.useContext(ToastContext);

// Versão simplificada do toast para componentes que não estão dentro do provider
export const toast = {
  success: (message) => {
    alert(message);
  },
  error: (message) => {
    alert(message);
  }
};