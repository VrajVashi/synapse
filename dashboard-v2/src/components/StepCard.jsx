import { useState } from 'react';

export default function StepCard({ number, title, children, isComplete = false, delay = 0, isHighlight = false }) {
    const [flipped, setFlipped] = useState(isComplete);

    return (
        <div
            className="flex gap-5 items-start p-6 transition-all duration-150"
            style={{
                background: isHighlight ? 'rgba(232,255,71,0.02)' : '#1A1A1A',
                border: isHighlight ? '1px solid rgba(232,255,71,0.14)' : '1px solid #2A2A2A',
                borderRadius: '2px',
                opacity: 0,
                animation: `slide-up 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms forwards`,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#E8FF47'}
            onMouseLeave={e => e.currentTarget.style.borderColor = isHighlight ? 'rgba(232,255,71,0.14)' : '#2A2A2A'}
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
                        className="absolute inset-0 flex items-center justify-center font-black text-[#0D0D0D]"
                        style={{
                            backfaceVisibility: 'hidden',
                            background: '#E8FF47',
                            borderRadius: '2px',
                            fontSize: '14px',
                        }}
                    >
                        {number}
                    </div>
                    {/* Back: checkmark */}
                    <div
                        className="absolute inset-0 flex items-center justify-center text-[#0D0D0D]"
                        style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            background: '#4ADE80',
                            borderRadius: '2px',
                        }}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: '#F5F5F5', marginBottom: '6px' }}>{title}</div>
                {children}
            </div>
        </div>
    );
}
