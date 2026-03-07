import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

export default function StudentRow({ student, delay = 0, isHighlighted = false }) {
    const { ref, isVisible } = useIntersectionObserver();

    const needsIntervention = student.action === '1-on-1 recommended';

    return (
        <div
            ref={ref}
            className={`
        flex items-start justify-between gap-3 p-4 rounded-xl border transition-all duration-200 group
        ${isHighlighted ? 'border-cyan/20 bg-cyan/[0.04]' : 'border-white/[0.04] bg-white/[0.015]'}
        hover:bg-white/[0.03] hover:translate-x-1
      `}
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
                transition: `all 0.4s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
                backgroundImage: isHighlighted ? 'linear-gradient(90deg, rgba(6,182,212,0.04), transparent)' : undefined,
            }}
        >
            <div className="flex-1 min-w-0">
                <div className="text-sm font-bold mb-1">{student.name}</div>
                <div className="text-xs text-text-muted">
                    {student.errorType} · {student.attempts}x (class avg {student.classAvg}x) · {student.lastSeen}
                </div>
            </div>
            <span
                className={`
          text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0
          ${needsIntervention
                        ? 'bg-danger/[0.08] text-danger border border-danger/[0.16] animate-pulse-glow'
                        : 'bg-cyan/[0.08] text-cyan border border-cyan/[0.16]'}
        `}
            >
                {student.action}
            </span>
        </div>
    );
}
