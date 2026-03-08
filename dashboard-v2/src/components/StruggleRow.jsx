import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

function barColor(pct) {
    if (pct >= 60) return '#FF6B35';
    if (pct >= 40) return '#E8B835';
    return '#E8FF47';
}

export default function StruggleRow({ row, delay = 0 }) {
    const { ref, isVisible } = useIntersectionObserver();

    return (
        <div
            ref={ref}
            className="flex flex-col gap-2 p-3.5 transition-all duration-200 group"
            style={{
                borderBottom: '1px solid #1E1E1E',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
                transition: `all 0.4s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
            }}
        >
            <div className="flex justify-between items-center">
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: '#F5F5F5' }}>{row.errorType}</span>
                <div className="flex gap-2">
                    <span className="text-[10px] font-medium px-2 py-0.5"
                        style={{ background: 'rgba(255,107,53,0.15)', color: '#FF6B35', border: '1px solid rgba(255,107,53,0.3)', borderRadius: '2px', fontSize: '11px' }}>
                        {row.pct}% crash
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5"
                        style={{ background: '#1A1A1A', color: '#888', border: '1px solid #2A2A2A', borderRadius: '2px', fontSize: '11px' }}>
                        {row.avgFixMin}m avg fix
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5"
                        style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '2px', fontSize: '11px' }}>
                        {row.quizCompletion}% quiz
                    </span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="relative overflow-hidden" style={{ height: '4px', background: '#222', borderRadius: 0 }}>
                <div
                    className="h-full relative overflow-hidden"
                    style={{
                        width: isVisible ? `${row.pct}%` : '0%',
                        background: barColor(row.pct),
                        transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${delay + 200}ms`,
                        borderRadius: 0,
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
