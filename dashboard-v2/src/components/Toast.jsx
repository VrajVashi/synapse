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
    success: { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.25)', color: '#4ADE80', barColor: '#4ADE80' },
    warning: { bg: 'rgba(232,184,53,0.12)', border: 'rgba(232,184,53,0.25)', color: '#E8B835', barColor: '#E8B835' },
    error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', color: '#EF4444', barColor: '#EF4444' },
    info: { bg: 'rgba(232,255,71,0.12)', border: 'rgba(232,255,71,0.25)', color: '#E8FF47', barColor: '#E8FF47' },
};

function ToastItem({ toast }) {
    const s = typeStyles[toast.type] || typeStyles.info;
    return (
        <div
            className="px-4 py-3 min-w-[280px] max-w-[380px] relative overflow-hidden animate-slide-up"
            style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: '2px',
                backdropFilter: 'blur(12px)',
            }}
        >
            <p className="text-sm font-medium" style={{ color: s.color, fontFamily: 'var(--font-sans)' }}>{toast.message}</p>
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
