import { useCountUp } from '../hooks/useCountUp';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

// Mini sparkline SVG
function Sparkline({ data = [3, 7, 4, 8, 5, 9, 6], color = '#E8FF47' }) {
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

export default function StatCard({ label, value, unit, delta, deltaType, warn, sparkData, delay = 0 }) {
    const { ref, isVisible } = useIntersectionObserver();
    const animated = useCountUp(typeof value === 'number' ? value : 0, 900, isVisible);

    const valueColor = warn ? '#FF6B35' : label?.includes('Quiz') ? '#4ADE80' : '#F5F5F5';
    const sparkColor = warn ? '#FF6B35' : label?.includes('Quiz') ? '#4ADE80' : label?.includes('Fix') ? '#888' : '#E8FF47';

    // Color-coded top border (Enhancement 1)
    const topBorderColor = warn ? '#FF6B35' : label?.includes('Quiz') ? '#4ADE80' : label?.includes('Fix') ? '#444' : '#E8FF47';

    return (
        <div
            ref={ref}
            className="relative overflow-hidden p-7 transition-all duration-150"
            style={{
                background: '#1A1A1A',
                border: '1px solid #2A2A2A',
                borderTop: `2px solid ${topBorderColor}`,
                borderRadius: '2px',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms, border-color 0.15s ease, background 0.15s ease`,
            }}
        >
            <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '9px',
                fontWeight: 500,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color: '#555',
                marginBottom: '12px',
            }}>{label}</div>
            <div className="flex items-baseline gap-1">
                <span className={`tabular-nums ${warn ? 'animate-pulse-glow' : ''}`}
                    style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '64px',
                        lineHeight: 1,
                        color: valueColor,
                    }}>
                    {typeof value === 'number' ? animated.toLocaleString() : value}
                </span>
                {unit && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: '#555' }}>{unit}</span>}
            </div>
            {delta && (
                <div className="mt-2" style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '12px',
                    color: deltaType === 'positive' ? '#4ADE80' : deltaType === 'warn' ? '#FF6B35' : '#555',
                }}>
                    {delta}
                </div>
            )}
            {sparkData && <Sparkline data={sparkData} color={sparkColor} />}
        </div>
    );
}
