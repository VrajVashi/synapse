import { useRef, useState, useCallback } from 'react';

export function useMagneticHover(maxTilt = 5) {
    const ref = useRef(null);
    const [style, setStyle] = useState({});

    const handleMouseMove = useCallback((e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setStyle({
            transform: `perspective(1000px) rotateX(${-y * maxTilt}deg) rotateY(${x * maxTilt}deg) translateY(-4px)`,
            transition: 'transform 0.15s ease-out',
        });
    }, [maxTilt]);

    const handleMouseLeave = useCallback(() => {
        setStyle({
            transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)',
            transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        });
    }, []);

    return { ref, style, onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave };
}
