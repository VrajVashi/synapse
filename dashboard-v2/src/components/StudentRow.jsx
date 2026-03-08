import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

export default function StudentRow({ student, delay = 0, isHighlighted = false }) {
    const { ref, isVisible } = useIntersectionObserver();

    const needsIntervention = student.action === '1-on-1 recommended';

    return (
        <div
            ref={ref}
            className="flex items-start justify-between gap-3 p-4 transition-all duration-200 group"
            style={{
                borderBottom: '1px solid #1E1E1E',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
                transition: `all 0.4s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
            <div className="flex-1 min-w-0">
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: '#F5F5F5', marginBottom: '4px' }}>{student.name}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#555' }}>
                    {student.errorType} · {student.attempts}x (class avg {student.classAvg}x) · {student.lastSeen}
                </div>
            </div>
            <span
                className={`text-[10px] font-medium px-2.5 py-1 whitespace-nowrap shrink-0 ${needsIntervention ? 'animate-pulse-glow' : ''}`}
                style={{
                    background: needsIntervention ? 'rgba(255,107,53,0.15)' : student.action?.includes('quiz') ? 'rgba(232,255,71,0.1)' : 'rgba(255,107,53,0.1)',
                    color: needsIntervention ? '#FF6B35' : student.action?.includes('quiz') ? '#E8FF47' : '#FF6B35',
                    border: needsIntervention ? '1px solid rgba(255,107,53,0.3)' : student.action?.includes('quiz') ? '1px solid rgba(232,255,71,0.2)' : '1px solid rgba(255,107,53,0.2)',
                    borderRadius: '2px',
                }}
            >
                {student.action}
            </span>
        </div>
    );
}
