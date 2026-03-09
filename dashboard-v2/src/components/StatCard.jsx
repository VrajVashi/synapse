import { useCountUp } from '../hooks/useCountUp';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

function Sparkline({ data = [3, 7, 4, 8, 5, 9, 6], color = 'rgba(165,180,252,0.7)' }) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 80, h = 28;
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / range) * h * 0.8 - h * 0.1;
        return `${x},${y}`;
    });
    const pathD = 'M' + points.join(' L');
    const pathLength = data.length * 15;

    return (
        <svg width={w} height={h} className="mt-2">
            <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={pathLength}
                strokeDashoffset={pathLength}
                style={{
                    '--path-length': pathLength,
                    animation: 'draw-sparkline 1.5s cubic-bezier(0.22,1,0.36,1) forwards',
                    animationDelay: '0.5s',
                }}
            />
        </svg>
    );
}

// Per-card accent tokens
function getCardTokens(label, warn) {
    if (warn) return { border: 'rgba(251,113,133,0.5)', valueColor: '#fb7185', sparkColor: 'rgba(251,113,133,0.7)' };
    if (label?.includes('Quiz')) return { border: 'rgba(74,222,128,0.4)', valueColor: '#4ade80', sparkColor: 'rgba(74,222,128,0.6)' };
    if (label?.includes('Fix')) return { border: 'rgba(255,255,255,0.12)', valueColor: 'rgba(255,255,255,0.7)', sparkColor: 'rgba(255,255,255,0.3)' };
    // default — sessions
    return { border: 'rgba(165,180,252,0.5)', valueColor: '#a5b4fc', sparkColor: 'rgba(165,180,252,0.7)' };
}

export default function StatCard({ label, value, unit, delta, deltaType, warn, sparkData, delay = 0 }) {
    const { ref, isVisible } = useIntersectionObserver();
    const animated = useCountUp(typeof value === 'number' ? value : 0, 900, isVisible);

    const { border, valueColor, sparkColor } = getCardTokens(label, warn);

    return (
        <div
            ref={ref}
            className="relative overflow-hidden p-6 transition-all duration-150"
            style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderLeft: `2px solid ${border}`,
                borderRadius: '16px',
                backdropFilter: 'blur(12px)',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
            }}
        >
            {/* Subtle radial glow in top-left corner matching accent */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '120px', height: '80px',
                background: `radial-gradient(ellipse at top left, ${border.replace('0.5', '0.08').replace('0.4', '0.06').replace('0.12', '0.04')}, transparent 70%)`,
                pointerEvents: 'none',
            }} />

            <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '9px',
                fontWeight: 500,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)',
                marginBottom: '12px',
            }}>{label}</div>

            <div className="flex items-baseline gap-1">
                <span className={`tabular-nums ${warn ? 'animate-pulse-glow' : ''}`}
                    style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '56px',
                        lineHeight: 1,
                        color: valueColor,
                    }}>
                    {typeof value === 'number' ? animated.toLocaleString() : value}
                </span>
                {unit && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.3)' }}>{unit}</span>}
            </div>

            {delta && (
                <div className="mt-2" style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '12px',
                    color: deltaType === 'positive' ? '#4ade80' : deltaType === 'warn' ? '#fb7185' : 'rgba(255,255,255,0.3)',
                }}>
                    {delta}
                </div>
            )}
            {sparkData && <Sparkline data={sparkData} color={sparkColor} />}
        </div>
    );
}
