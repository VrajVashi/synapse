import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type, duration }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-6 right-6 flex flex-col gap-3" style={{ zIndex: 9000 }}>
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

const typeStyles = {
    success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)', color: '#22C55E', barColor: '#22C55E' },
    warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', color: '#F59E0B', barColor: '#F59E0B' },
    error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', color: '#EF4444', barColor: '#EF4444' },
    info: { bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.25)', color: '#06B6D4', barColor: '#06B6D4' },
};

function ToastItem({ toast }) {
    const s = typeStyles[toast.type] || typeStyles.info;
    return (
        <div
            className="rounded-xl px-4 py-3 min-w-[280px] max-w-[380px] relative overflow-hidden backdrop-blur-xl animate-slide-up"
            style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)',
            }}
        >
            <p className="text-sm font-semibold" style={{ color: s.color }}>{toast.message}</p>
            {/* Draining progress bar */}
            <div className="absolute bottom-0 left-0 h-0.5 w-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div
                    className="h-full"
                    style={{
                        background: s.barColor,
                        animation: `progress-drain ${toast.duration}ms linear forwards`,
                    }}
                />
            </div>
        </div>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
