import { useCountUp } from '../hooks/useCountUp';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

// Mini sparkline SVG
function Sparkline({ data = [3, 7, 4, 8, 5, 9, 6], color = '#06B6D4' }) {
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

    return (
        <div
            ref={ref}
            className="relative overflow-hidden rounded-xl p-6 border border-white/[0.06] transition-all duration-300 hover:-translate-y-1 group"
            style={{
                background: 'rgba(17,24,39,0.6)',
                backdropFilter: 'blur(24px) saturate(120%)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.03), 0 24px 48px -12px rgba(0,0,0,0.5)',
                animationDelay: `${delay}ms`,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
            }}
        >
            {/* Top edge light */}
            <div className="absolute top-0 left-[14%] right-[14%] h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            {/* Hover glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ boxShadow: '0 0 30px rgba(6,182,212,0.15)', borderRadius: 'inherit' }} />

            <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">{label}</div>
            <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-black tracking-tight tabular-nums ${warn ? 'text-danger animate-pulse-glow' : 'text-cyan'}`}>
                    {typeof value === 'number' ? animated.toLocaleString() : value}
                </span>
                {unit && <span className="text-sm font-semibold text-text-muted">{unit}</span>}
            </div>
            {delta && (
                <div className={`text-xs mt-2 ${deltaType === 'positive' ? 'text-success' : deltaType === 'warn' ? 'text-danger' : 'text-text-muted'}`}>
                    {delta}
                </div>
            )}
            {sparkData && <Sparkline data={sparkData} color={warn ? '#EF4444' : '#06B6D4'} />}
        </div>
    );
}
