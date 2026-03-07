import { useState } from 'react';

export default function StepCard({ number, title, children, isComplete = false, delay = 0, isHighlight = false }) {
    const [flipped, setFlipped] = useState(isComplete);

    return (
        <div
            className={`
        flex gap-5 items-start p-6 rounded-xl border transition-all duration-300
        ${isHighlight ? 'border-cyan/[0.14] bg-cyan/[0.02]' : 'border-white/[0.04] bg-white/[0.02]'}
        hover:border-white/[0.08] hover:translate-x-1
      `}
            style={{
                backdropFilter: 'blur(24px) saturate(120%)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.03), 0 24px 48px -12px rgba(0,0,0,0.4)',
                opacity: 0,
                animation: `slide-up 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms forwards`,
            }}
        >
            {/* Step number with 3D flip */}
            <div className="relative w-9 h-9 shrink-0" style={{ perspective: '600px' }}>
                <div
                    className="w-full h-full transition-transform duration-500 relative"
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                >
                    {/* Front: number */}
                    <div
                        className="absolute inset-0 rounded-lg flex items-center justify-center text-sm font-black text-black"
                        style={{
                            backfaceVisibility: 'hidden',
                            background: 'linear-gradient(135deg, #06B6D4, #0891B2)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 12px -4px rgba(0,0,0,0.4)',
                        }}
                    >
                        {number}
                    </div>
                    {/* Back: checkmark */}
                    <div
                        className="absolute inset-0 rounded-lg flex items-center justify-center text-black"
                        style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
                        }}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="text-sm font-bold mb-1.5">{title}</div>
                {children}
            </div>
        </div>
    );
}
