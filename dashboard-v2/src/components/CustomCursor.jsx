import { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
    const dot = useRef(null);
    const ring = useRef(null);
    const pos = useRef({ x: 0, y: 0 });
    const target = useRef({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const [isDanger, setIsDanger] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768) {
            setIsMobile(true);
            return;
        }

        const handleMove = (e) => { target.current = { x: e.clientX, y: e.clientY }; };
        window.addEventListener('mousemove', handleMove);

        const handleOver = (e) => {
            const el = e.target.closest('button, a, input, select, textarea, [role="button"]');
            setIsHovering(!!el);
            const danger = e.target.closest('[data-danger], .text-danger, .text-red-400');
            setIsDanger(!!danger);
        };
        document.addEventListener('mouseover', handleOver);

        let raf;
        const animate = () => {
            pos.current.x += (target.current.x - pos.current.x) * 0.15;
            pos.current.y += (target.current.y - pos.current.y) * 0.15;
            if (dot.current) {
                dot.current.style.transform = `translate(${target.current.x - 4}px, ${target.current.y - 4}px)`;
            }
            if (ring.current) {
                ring.current.style.transform = `translate(${pos.current.x - 16}px, ${pos.current.y - 16}px) scale(${isHovering ? 1.5 : 1})`;
            }
            raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseover', handleOver);
        };
    }, [isHovering]);

    if (isMobile) return null;

    const ringColor = isDanger ? 'rgba(124,58,237,0.4)' : 'rgba(6,182,212,0.35)';

    return (
        <>
            <div
                ref={dot}
                className="fixed top-0 left-0 pointer-events-none rounded-full"
                style={{
                    width: 8, height: 8,
                    backgroundColor: '#06B6D4',
                    zIndex: 9999,
                    transition: 'width 0.2s, height 0.2s',
                }}
            />
            <div
                ref={ring}
                className="fixed top-0 left-0 pointer-events-none rounded-full"
                style={{
                    width: 32, height: 32,
                    border: `1.5px solid ${ringColor}`,
                    zIndex: 9998,
                    transition: 'transform 0.15s ease-out, border-color 0.3s',
                }}
            />
        </>
    );
}
