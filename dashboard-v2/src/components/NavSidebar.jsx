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

export default function NavSidebar({ activeView, onViewChange }) {
    const { logout } = useAuth();

    return (
        <aside className="w-56 h-screen fixed left-0 top-0 flex flex-col"
            style={{ background: '#111111', borderRight: '1px solid #1E1E1E', zIndex: 50 }}>

            {/* Logo */}
            <div className="flex items-center gap-2.5 px-5 py-5">
                <div className="w-2 h-2" style={{ background: '#E8FF47' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', letterSpacing: '3px', color: '#F5F5F5' }}>SYNAPSE</span>
            </div>

            {/* Nav items — staggered on mount */}
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
                            {/* Sliding active indicator — layoutId makes it animate between items */}
                            <AnimatePresence>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNavIndicator"
                                        style={{
                                            position: 'absolute',
                                            left: 0, top: 0, bottom: 0,
                                            width: '3px',
                                            background: '#E8FF47',
                                        }}
                                        transition={ease.spring}
                                    />
                                )}
                            </AnimatePresence>

                            <button
                                data-view={item.view}
                                onClick={() => onViewChange(item.view)}
                                className="w-full flex items-center gap-2.5 px-5 py-2.5 text-left transition-colors duration-150 relative"
                                style={{
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: isActive ? '#E8FF47' : '#555',
                                    background: isActive ? 'rgba(232,255,71,0.05)' : 'transparent',
                                    border: 'none',
                                    paddingLeft: '20px',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) {
                                        e.currentTarget.style.color = '#F5F5F5';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) {
                                        e.currentTarget.style.color = '#555';
                                    }
                                }}
                            >
                                <span style={{ opacity: isActive ? 1 : 0.5, transition: 'opacity 0.15s' }}>
                                    {item.icon}
                                </span>
                                {/* 3px nudge right on hover */}
                                <motion.span
                                    whileHover={{ x: 3 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    {item.label}
                                </motion.span>
                                {/* Active dot indicator */}
                                {isActive && (
                                    <span className="absolute" style={{ right: '16px', top: '50%', transform: 'translateY(-50%)', width: '4px', height: '4px', background: '#E8FF47', borderRadius: '50%' }} />
                                )}
                            </button>
                        </motion.div>
                    );
                })}
            </motion.nav>

            {/* Footer */}
            <div className="px-5 py-3.5">
                <button
                    onClick={logout}
                    className="w-full text-left py-1.5 transition-colors duration-150"
                    style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#444', background: 'none', border: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#E8FF47'}
                    onMouseLeave={e => e.currentTarget.style.color = '#444'}
                >
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
