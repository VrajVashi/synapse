import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

function barColor(pct) {
    if (pct >= 60) return '#EF4444';
    if (pct >= 40) return '#F59E0B';
    return '#06B6D4';
}

export default function StruggleRow({ row, delay = 0 }) {
    const { ref, isVisible } = useIntersectionObserver();

    return (
        <div
            ref={ref}
            className="flex flex-col gap-2 p-3.5 rounded-xl border border-white/[0.03] bg-white/[0.015] transition-all duration-200 group hover:bg-white/[0.03] hover:translate-x-1 hover:border-l-2 hover:border-l-cyan/40"
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
                transition: `all 0.4s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
            }}
        >
            <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-text-secondary">{row.errorType}</span>
                <div className="flex gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger/[0.08] text-danger border border-danger/[0.16]">
                        {row.pct}% crash
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.03] text-text-muted border border-white/[0.06]">
                        {row.avgFixMin}m avg fix
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/[0.08] text-success border border-success/[0.16]">
                        {row.quizCompletion}% quiz
                    </span>
                </div>
            </div>

            {/* Animated progress bar with shimmer */}
            <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden relative">
                <div
                    className="h-full rounded-full relative overflow-hidden"
                    style={{
                        width: isVisible ? `${row.pct}%` : '0%',
                        background: barColor(row.pct),
                        transition: `width 1s cubic-bezier(0.22,1,0.36,1) ${delay + 200}ms`,
                    }}
                >
                    {/* Shimmer overlay */}
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
