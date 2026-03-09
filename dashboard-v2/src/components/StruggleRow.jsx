import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

function barGradient(pct) {
    if (pct >= 60) return 'linear-gradient(to right, #fb7185, #f43f5e)';
    if (pct >= 40) return 'linear-gradient(to right, #fbbf24, #f59e0b)';
    return 'linear-gradient(to right, #818cf8, #6366f1)';
}

export default function StruggleRow({ row, delay = 0 }) {
    const { ref, isVisible } = useIntersectionObserver();

    return (
        <div
            ref={ref}
            className="flex flex-col gap-2 p-3.5 transition-all duration-200 group"
            style={{
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
                transition: `all 0.4s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
            }}
        >
            <div className="flex justify-between items-center">
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
                    {row.errorType}
                </span>
                <div className="flex gap-1.5">
                    <span className="text-[10px] font-medium px-2 py-0.5"
                        style={{
                            background: 'rgba(251,113,133,0.1)',
                            color: '#fb7185',
                            border: '1px solid rgba(251,113,133,0.25)',
                            borderRadius: '6px',
                            fontSize: '11px',
                        }}>
                        {row.pct}% crash
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5"
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            color: 'rgba(255,255,255,0.4)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '6px',
                            fontSize: '11px',
                        }}>
                        {row.avgFixMin}m avg fix
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5"
                        style={{
                            background: 'rgba(74,222,128,0.08)',
                            color: '#4ade80',
                            border: '1px solid rgba(74,222,128,0.2)',
                            borderRadius: '6px',
                            fontSize: '11px',
                        }}>
                        {row.quizCompletion}% quiz
                    </span>
                </div>
            </div>

            {/* Gradient progress bar */}
            <div className="relative overflow-hidden" style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                <div
                    className="h-full relative overflow-hidden"
                    style={{
                        width: isVisible ? `${row.pct}%` : '0%',
                        background: barGradient(row.pct),
                        transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${delay + 200}ms`,
                        borderRadius: '2px',
                    }}
                >
                    <div
                        className="absolute inset-0 animate-shimmer"
                        style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                            width: '50%',
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
