import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

export default function StudentRow({ student, delay = 0 }) {
    const { ref, isVisible } = useIntersectionObserver();

    const needsIntervention = student.action === '1-on-1 recommended';
    const hasQuiz = student.action?.includes('quiz');

    const badgeStyle = needsIntervention
        ? { bg: 'rgba(251,113,133,0.12)', color: '#fb7185', border: 'rgba(251,113,133,0.25)' }
        : hasQuiz
        ? { bg: 'rgba(165,180,252,0.1)', color: '#a5b4fc', border: 'rgba(165,180,252,0.2)' }
        : { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: 'rgba(255,255,255,0.12)' };

    return (
        <div
            ref={ref}
            className="flex items-start justify-between gap-3 p-4 transition-all duration-200 group"
            style={{
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
                transition: `all 0.4s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
            <div className="flex-1 min-w-0">
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '4px' }}>
                    {student.name}
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                    {student.errorType} · {student.attempts}x (class avg {student.classAvg}x) · {student.lastSeen}
                </div>
            </div>
            <span
                className={`text-[10px] font-medium px-2.5 py-1 whitespace-nowrap shrink-0 ${needsIntervention ? 'animate-pulse-glow' : ''}`}
                style={{
                    background: badgeStyle.bg,
                    color: badgeStyle.color,
                    border: `1px solid ${badgeStyle.border}`,
                    borderRadius: '8px',
                    fontSize: '11px',
                }}
            >
                {student.action}
            </span>
        </div>
    );
}
