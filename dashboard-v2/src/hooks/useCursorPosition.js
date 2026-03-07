import { useState, useEffect, useRef, useCallback } from 'react';

export function useCursorPosition() {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const target = useRef({ x: 0, y: 0 });
    const current = useRef({ x: 0, y: 0 });
    const raf = useRef(null);

    const lerp = useCallback(() => {
        current.current.x += (target.current.x - current.current.x) * 0.08;
        current.current.y += (target.current.y - current.current.y) * 0.08;
        setPosition({ x: current.current.x, y: current.current.y });
        raf.current = requestAnimationFrame(lerp);
    }, []);

    useEffect(() => {
        const handleMove = (e) => {
            target.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', handleMove);
        raf.current = requestAnimationFrame(lerp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            cancelAnimationFrame(raf.current);
        };
    }, [lerp]);

    return position;
}
