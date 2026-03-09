import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { staggerContainer, slideInLeft, ease, prefersReducedMotion } from '../lib/animations';

const navItems = [
    { to: '/', view: 'overview', label: 'Overview', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg> },
    { to: '/?view=heatmap', view: 'heatmap', label: 'Struggle Heatmap', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg> },
    { to: '/?view=students', view: 'students', label: 'At-Risk Students', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
    { to: '/?view=mastery', view: 'mastery', label: 'Mastery Tracking', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> },
    { to: '/?view=curriculum', view: 'curriculum', label: 'Curriculum Insights', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg> },
    { to: '/?view=homework', view: 'homework', label: 'Homework', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> },
];

const shouldAnimate = !prefersReducedMotion;

const ArrowRight = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

export default function NavSidebar({ activeView, onViewChange }) {
    const { logout } = useAuth();
    const [signOutHovered, setSignOutHovered] = useState(false);

    return (
        <aside
            className="w-56 h-screen fixed left-0 top-0 flex flex-col"
            style={{
                background: 'rgba(3,3,3,0.85)',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
                zIndex: 50,
            }}
        >
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-5 py-5">
                <span className="text-indigo-400 text-base" style={{ lineHeight: 1 }}>•</span>
                <span style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: '18px',
                    fontWeight: 800,
                    letterSpacing: '3px',
                    background: 'linear-gradient(135deg, #a5b4fc 0%, #818cf8 50%, #fb7185 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                }}>SYNAPSE</span>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 16px 8px' }} />

            {/* Nav items */}
            <motion.nav
                className="flex-1 py-2"
                variants={staggerContainer(0.05, 0.1)}
                initial={shouldAnimate ? 'hidden' : false}
                animate={shouldAnimate ? 'show' : false}
            >
                {navItems.map((item) => {
                    const isActive = activeView === item.view;
                    return (
                        <motion.div
                            key={item.view}
                            variants={slideInLeft}
                            style={{ position: 'relative' }}
                        >
                            {/* Active indicator */}
                            <AnimatePresence>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNavIndicator"
                                        style={{
                                            position: 'absolute',
                                            left: 0, top: 0, bottom: 0,
                                            width: '2px',
                                            background: 'linear-gradient(to bottom, #818cf8, #fb7185)',
                                        }}
                                        transition={ease.spring}
                                    />
                                )}
                            </AnimatePresence>

                            {/* Active bg glow */}
                            {isActive && (
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(to right, rgba(99,102,241,0.08), transparent)',
                                    pointerEvents: 'none',
                                }} />
                            )}

                            <button
                                data-view={item.view}
                                onClick={() => onViewChange(item.view)}
                                className="w-full flex items-center gap-2.5 text-left transition-colors duration-150 relative"
                                style={{
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.3)',
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '10px 20px',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
                                }}
                            >
                                <span style={{ opacity: isActive ? 1 : 0.4, transition: 'opacity 0.15s', flexShrink: 0 }}>
                                    {item.icon}
                                </span>
                                <motion.span whileHover={{ x: 3 }} transition={{ duration: 0.15 }}>
                                    {item.label}
                                </motion.span>
                            </button>
                        </motion.div>
                    );
                })}
            </motion.nav>

            {/* Footer — InteractiveHoverButton Sign Out */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 16px 12px' }} />
            <div className="px-4 pb-5">
                <button
                    onClick={logout}
                    onMouseEnter={() => setSignOutHovered(true)}
                    onMouseLeave={() => setSignOutHovered(false)}
                    className="relative w-full overflow-hidden flex items-center justify-center gap-2"
                    style={{
                        height: '36px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: signOutHovered ? '#030303' : 'rgba(255,255,255,0.4)',
                        transition: 'color 0.3s ease',
                    }}
                >
                    {/* Expanding dot */}
                    <div style={{
                        position: 'absolute',
                        left: '5%',
                        top: '50%',
                        transform: `translate(-50%, -50%) scale(${signOutHovered ? 30 : 1})`,
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #818cf8, #fb7185)',
                        transition: 'transform 0.5s cubic-bezier(0.19,1,0.22,1)',
                        pointerEvents: 'none',
                    }} />
                    <span style={{ position: 'relative', zIndex: 1 }}>Sign Out</span>
                    <span style={{
                        position: 'relative',
                        zIndex: 1,
                        opacity: signOutHovered ? 1 : 0,
                        transform: signOutHovered ? 'translateX(0)' : 'translateX(-4px)',
                        transition: 'opacity 0.2s ease, transform 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                    }}>
                        <ArrowRight />
                    </span>
                </button>
            </div>
        </aside>
    );
}
