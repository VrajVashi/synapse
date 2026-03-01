import { useCursorPosition } from '../hooks/useCursorPosition';

export default function AuroraBackground() {
    const cursor = useCursorPosition();

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
            {/* Cursor-following aurora blob */}
            <div
                className="absolute w-[600px] h-[600px] rounded-full"
                style={{
                    left: cursor.x - 300,
                    top: cursor.y - 300,
                    background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, rgba(124,58,237,0.05) 40%, transparent 70%)',
                    filter: 'blur(60px)',
                }}
            />

            {/* Floating orbs */}
            <div
                className="absolute top-1/2 left-1/2 w-[350px] h-[350px] rounded-full"
                style={{
                    background: 'rgba(6,182,212,0.05)',
                    filter: 'blur(80px)',
                    animation: 'float-orbit-1 26s linear infinite',
                }}
            />
            <div
                className="absolute top-1/3 left-2/3 w-[280px] h-[280px] rounded-full"
                style={{
                    background: 'rgba(124,58,237,0.04)',
                    filter: 'blur(80px)',
                    animation: 'float-orbit-2 34s linear infinite',
                }}
            />
            <div
                className="absolute top-2/3 left-1/4 w-[240px] h-[240px] rounded-full"
                style={{
                    background: 'rgba(6,182,212,0.03)',
                    filter: 'blur(80px)',
                    animation: 'float-orbit-3 40s linear infinite',
                }}
            />

            {/* Grid overlay with cursor brightening */}
            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }}>
                <defs>
                    <radialGradient id="grid-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="white" stopOpacity="1" />
                        <stop offset="100%" stopColor="white" stopOpacity="0.3" />
                    </radialGradient>
                    <mask id="grid-mask">
                        <rect width="100%" height="100%" fill="rgba(255,255,255,0.3)" />
                        <circle
                            cx={cursor.x}
                            cy={cursor.y}
                            r="200"
                            fill="url(#grid-glow)"
                        />
                    </mask>
                    <pattern id="grid-pattern" width="52" height="52" patternUnits="userSpaceOnUse">
                        <path d="M 52 0 L 0 0 0 52" fill="none" stroke="white" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-pattern)" mask="url(#grid-mask)" />
            </svg>
        </div>
    );
}
