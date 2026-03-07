import { useRef, useEffect, useCallback } from 'react';

const PARTICLE_COUNT = 70;
const CONNECTION_DIST = 100;
const REPULSION_DIST = 150;
const COLORS = ['rgba(6,182,212,', 'rgba(124,58,237,', 'rgba(255,255,255,'];

export default function ParticleField() {
    const canvasRef = useRef(null);
    const particles = useRef([]);
    const mouse = useRef({ x: -9999, y: -9999 });
    const raf = useRef(null);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const count = isMobile ? 20 : PARTICLE_COUNT;

    const init = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const w = canvas.width = window.innerWidth;
        const h = canvas.height = window.innerHeight;
        particles.current = Array.from({ length: count }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 1.5 + 0.5,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            baseAlpha: Math.random() * 0.12 + 0.06,
        }));
    }, [count]);

    useEffect(() => {
        init();
        const handleResize = () => init();
        window.addEventListener('resize', handleResize);

        const handleMouse = (e) => { mouse.current = { x: e.clientX, y: e.clientY }; };
        window.addEventListener('mousemove', handleMouse);

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        let lastTime = 0;
        const animate = (time) => {
            const dt = Math.min((time - lastTime) / 16, 3);
            lastTime = time;
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            const pts = particles.current;
            const mx = mouse.current.x;
            const my = mouse.current.y;

            for (let i = 0; i < pts.length; i++) {
                const p = pts[i];
                // Cursor repulsion
                const dx = p.x - mx;
                const dy = p.y - my;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < REPULSION_DIST && dist > 0) {
                    const force = (REPULSION_DIST - dist) / REPULSION_DIST * 0.5;
                    p.vx += (dx / dist) * force * dt;
                    p.vy += (dy / dist) * force * dt;
                }

                // Drift
                p.x += p.vx * dt;
                p.y += p.vy * dt;

                // Damping
                p.vx *= 0.99;
                p.vy *= 0.99;

                // Wrap edges
                if (p.x < 0) p.x = w;
                if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h;
                if (p.y > h) p.y = 0;

                // Brightness boost near cursor
                const alpha = dist < REPULSION_DIST * 2
                    ? p.baseAlpha + (1 - dist / (REPULSION_DIST * 2)) * 0.15
                    : p.baseAlpha;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color + alpha + ')';
                ctx.fill();

                // Connections (constellation effect)
                for (let j = i + 1; j < pts.length; j++) {
                    const p2 = pts[j];
                    const cdx = p.x - p2.x;
                    const cdy = p.y - p2.y;
                    const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
                    if (cdist < CONNECTION_DIST) {
                        const lineAlpha = (1 - cdist / CONNECTION_DIST) * 0.06;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(6,182,212,${lineAlpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            raf.current = requestAnimationFrame(animate);
        };

        raf.current = requestAnimationFrame(animate);
        return () => {
            cancelAnimationFrame(raf.current);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouse);
        };
    }, [init]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
        />
    );
}
