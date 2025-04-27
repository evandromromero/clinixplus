// Utilitário de toast personalizado usando react-hot-toast
import toast from 'react-hot-toast';

// Exporta funções de toast personalizadas
export const showToast = {
  success: (message) => {
    return toast(message, {
      icon: '✅',
      style: {
        background: '#f0fdf4',
        color: '#166534',
        border: '1px solid #bbf7d0',
        padding: '16px',
        borderRadius: '8px',
      },
      duration: 5000,
    });
  },
  
  error: (message) => {
    return toast(message, {
      icon: '❌',
      style: {
        background: '#fef2f2',
        color: '#b91c1c',
        border: '1px solid #fecaca',
        padding: '16px',
        borderRadius: '8px',
      },
      duration: 5000,
    });
  },
  
  warning: (message) => {
    return toast(message, {
      icon: '⚠️',
      style: {
        background: '#fffbeb',
        color: '#92400e',
        border: '1px solid #fef3c7',
        padding: '16px',
        borderRadius: '8px',
      },
      duration: 5000,
    });
  },
  
  info: (message) => {
    return toast(message, {
      icon: 'ℹ️',
      style: {
        background: '#eff6ff',
        color: '#1e40af',
        border: '1px solid #dbeafe',
        padding: '16px',
        borderRadius: '8px',
      },
      duration: 5000,
    });
  }
};

export default showToast;
