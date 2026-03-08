// ─── Synapse Animation Presets ────────────────────────────────────────────────
// Single source of truth for all framer-motion animation values.
// Import from here — never invent new values in component files.

import { useState, useEffect } from 'react';

// ─── Reduced Motion ───────────────────────────────────────────────────────────
export const prefersReducedMotion =
    typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

// ─── Easing Curves ────────────────────────────────────────────────────────────
export const ease = {
    snap: [0.19, 1, 0.22, 1],           // fast out — entrances
    out: [0.0, 0.0, 0.2, 1],          // standard ease out
    inOut: [0.76, 0, 0.24, 1],         // cinematic — page transitions
    spring: { type: 'spring', stiffness: 400, damping: 30 },   // snappy spring
    springSlug: { type: 'spring', stiffness: 200, damping: 25 }, // slower spring
};

// ─── Entrance Variants ────────────────────────────────────────────────────────
export const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] } },
};

export const fadeIn = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.3, ease: [0.0, 0.0, 0.2, 1] } },
};

export const slideInLeft = {
    hidden: { opacity: 0, x: -24 },
    show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.19, 1, 0.22, 1] } },
};

export const clipReveal = {
    hidden: { clipPath: 'inset(0 100% 0 0)' },
    show: {
        clipPath: 'inset(0 0% 0 0)',
        transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1] }
    },
};

export const scaleIn = {
    hidden: { opacity: 0, scale: 0.96 },
    show: {
        opacity: 1, scale: 1,
        transition: { duration: 0.35, ease: [0.19, 1, 0.22, 1] }
    },
};

/** Returns a stagger container variant */
export const staggerContainer = (staggerChildren = 0.07, delayChildren = 0.1) => ({
    hidden: {},
    show: { transition: { staggerChildren, delayChildren } },
});

// ─── useCountUp ───────────────────────────────────────────────────────────────
/** Animates a number from 0 to target over duration ms, starting after delay ms */
export function useCountUp(target, duration = 1200, delay = 0) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (prefersReducedMotion) { setValue(target); return; }
        let startTime = null;
        let frameId;
        const delayTimeout = setTimeout(() => {
            const step = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const progress = Math.min((timestamp - startTime) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                setValue(Math.floor(eased * target));
                if (progress < 1) frameId = requestAnimationFrame(step);
                else setValue(target);
            };
            frameId = requestAnimationFrame(step);
        }, delay);
        return () => { clearTimeout(delayTimeout); cancelAnimationFrame(frameId); };
    }, [target, duration, delay]);

    return value;
}

// ─── useBarFill ───────────────────────────────────────────────────────────────
/** Returns 0→targetPercent for CSS progress bar width, after delay ms */
export function useBarFill(targetPercent, delay = 0) {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (prefersReducedMotion) { setWidth(targetPercent); return; }
        const timeout = setTimeout(() => setWidth(targetPercent), delay + 100);
        return () => clearTimeout(timeout);
    }, [targetPercent, delay]);

    return width;
}
