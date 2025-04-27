// Implementação simples de toast caso não exista
import * as React from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";

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
    }, 5000);
  };

  const error = (message) => {
    console.error("Error:", message);
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type: 'error' }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up ${
              toast.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
            style={{
              animation: 'slideIn 0.3s ease-out forwards',
              minWidth: '300px',
              maxWidth: '450px'
            }}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            )}
            <div className="flex-1 font-medium">{toast.message}</div>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className={`p-1 rounded-full hover:bg-${toast.type === 'success' ? 'green' : 'red'}-100`}
            >
              <X className={`w-4 h-4 text-${toast.type === 'success' ? 'green' : 'red'}-500`} />
            </button>
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export const toast = {
  success: (message) => {
    console.log("Success:", message);
    // Verificar se estamos no navegador
    if (typeof window !== 'undefined') {
      // Criar elemento temporário para mostrar toast
      const toastContainer = document.createElement('div');
      toastContainer.className = 'fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 bg-green-50 text-green-800 border border-green-200';
      toastContainer.style.animation = 'slideIn 0.3s ease-out forwards';
      toastContainer.style.minWidth = '300px';
      
      // Adicionar ícone
      const icon = document.createElement('div');
      icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
      toastContainer.appendChild(icon);
      
      // Adicionar mensagem
      const messageEl = document.createElement('div');
      messageEl.className = 'flex-1 font-medium';
      messageEl.textContent = message;
      toastContainer.appendChild(messageEl);
      
      // Adicionar botão de fechar
      const closeBtn = document.createElement('button');
      closeBtn.className = 'p-1 rounded-full hover:bg-green-100';
      closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      closeBtn.onclick = () => document.body.removeChild(toastContainer);
      toastContainer.appendChild(closeBtn);
      
      // Adicionar ao body
      document.body.appendChild(toastContainer);
      
      // Remover após 5 segundos
      setTimeout(() => {
        if (document.body.contains(toastContainer)) {
          document.body.removeChild(toastContainer);
        }
      }, 5000);
      
      // Adicionar estilo de animação se não existir
      if (!document.getElementById('toast-animation-style')) {
        const style = document.createElement('style');
        style.id = 'toast-animation-style';
        style.textContent = `
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
  },
  error: (message) => {
    console.error("Error:", message);
    // Verificar se estamos no navegador
    if (typeof window !== 'undefined') {
      // Criar elemento temporário para mostrar toast
      const toastContainer = document.createElement('div');
      toastContainer.className = 'fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 bg-red-50 text-red-800 border border-red-200';
      toastContainer.style.animation = 'slideIn 0.3s ease-out forwards';
      toastContainer.style.minWidth = '300px';
      
      // Adicionar ícone
      const icon = document.createElement('div');
      icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
      toastContainer.appendChild(icon);
      
      // Adicionar mensagem
      const messageEl = document.createElement('div');
      messageEl.className = 'flex-1 font-medium';
      messageEl.textContent = message;
      toastContainer.appendChild(messageEl);
      
      // Adicionar botão de fechar
      const closeBtn = document.createElement('button');
      closeBtn.className = 'p-1 rounded-full hover:bg-red-100';
      closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      closeBtn.onclick = () => document.body.removeChild(toastContainer);
      toastContainer.appendChild(closeBtn);
      
      // Adicionar ao body
      document.body.appendChild(toastContainer);
      
      // Remover após 5 segundos
      setTimeout(() => {
        if (document.body.contains(toastContainer)) {
          document.body.removeChild(toastContainer);
        }
      }, 5000);
      
      // Adicionar estilo de animação se não existir
      if (!document.getElementById('toast-animation-style')) {
        const style = document.createElement('style');
        style.id = 'toast-animation-style';
        style.textContent = `
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }
};

export const useToast = () => React.useContext(ToastContext);