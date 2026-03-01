import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface ToastItem {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info';
}

interface ToastContextValue {
  showToast: (message: string, type?: 'error' | 'success' | 'info') => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 1;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'error') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`} onClick={() => dismiss(toast.id)}>
            <span className="toast-icon">
              {toast.type === 'error' ? '✕' : toast.type === 'success' ? '✓' : 'ℹ'}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
