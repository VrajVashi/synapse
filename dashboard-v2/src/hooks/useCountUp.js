import { useState, useEffect, useRef } from 'react';

export function useCountUp(target, duration = 900, trigger = true) {
    const [value, setValue] = useState(0);
    const rafRef = useRef(null);

    useEffect(() => {
        if (!trigger || target === 0) { setValue(target); return; }
        const isFloat = String(target).includes('.');
        const start = performance.now();

        const tick = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;
            setValue(isFloat ? parseFloat(current.toFixed(1)) : Math.round(current));
            if (progress < 1) rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [target, duration, trigger]);

    return value;
}
