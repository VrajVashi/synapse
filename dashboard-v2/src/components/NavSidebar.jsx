import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRef, useEffect, useState } from 'react';

const navItems = [
    { to: '/', view: 'overview', label: 'Overview', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg> },
    { to: '/?view=heatmap', view: 'heatmap', label: 'Struggle Heatmap', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg> },
    { to: '/?view=students', view: 'students', label: 'At-Risk Students', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
    { to: '/?view=mastery', view: 'mastery', label: 'Mastery Tracking', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> },
    { to: '/?view=curriculum', view: 'curriculum', label: 'Curriculum Insights', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg> },
    { to: '/?view=homework', view: 'homework', label: 'Homework', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> },
];

export default function NavSidebar({ activeView, onViewChange }) {
    const { logout } = useAuth();
    const navRef = useRef(null);
    const [indicatorTop, setIndicatorTop] = useState(0);

    useEffect(() => {
        if (!navRef.current) return;
        const activeEl = navRef.current.querySelector(`[data-view="${activeView}"]`);
        if (activeEl) {
            setIndicatorTop(activeEl.offsetTop);
        }
    }, [activeView]);

    return (
        <aside className="w-56 h-screen fixed left-0 top-0 flex flex-col border-r border-white/[0.04] backdrop-blur-xl"
            style={{ background: 'rgba(5,5,12,0.6)', zIndex: 50, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)' }}>

            {/* Logo */}
            <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.04]">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-black"
                    style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 12px -4px rgba(0,0,0,0.5)' }}>
                    S
                </div>
                <span className="text-sm font-bold tracking-tight">Synapse</span>
            </div>

            {/* Nav items */}
            <nav ref={navRef} className="flex-1 px-2.5 py-3.5 relative">
                {/* Animated active indicator bar */}
                <div
                    className="absolute left-0 w-0.5 h-9 rounded-r-full bg-cyan transition-all duration-300"
                    style={{ top: indicatorTop, transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                />

                {navItems.map((item) => (
                    <button
                        key={item.view}
                        data-view={item.view}
                        onClick={() => onViewChange(item.view)}
                        className={`
              w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium
              transition-all duration-200 border border-transparent mb-0.5 text-left
              ${activeView === item.view
                                ? 'text-cyan bg-cyan/[0.08] border-cyan/[0.12]'
                                : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03] hover:translate-x-0.5'}
            `}
                    >
                        <span className={`transition-opacity ${activeView === item.view ? 'opacity-100' : 'opacity-50'}`}>
                            {item.icon}
                        </span>
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-white/[0.04]">
                <button
                    onClick={logout}
                    className="w-full text-left text-xs text-text-muted hover:text-white transition-colors py-1.5"
                >
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
