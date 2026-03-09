import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useMagneticHover } from '../hooks/useMagneticHover';
import { API } from '../api';

/* ── Floating pill shape (same as AuthPage) ───────────────── */
function ElegantShape({ className, delay = 0, width = 400, height = 100, rotate = 0, gradient = 'from-white/[0.08]' }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
            animate={{ opacity: 1, y: 0, rotate }}
            transition={{ duration: 2.4, delay, ease: [0.23, 0.86, 0.39, 0.96], opacity: { duration: 1.2 } }}
            className={`absolute ${className}`}
        >
            <motion.div
                animate={{ y: [0, 15, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width, height }}
                className="relative"
            >
                <div
                    className={`absolute inset-0 rounded-full bg-gradient-to-r to-transparent ${gradient} backdrop-blur-[2px] border-2 border-white/[0.15] shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]`}
                    style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2), transparent 70%)' }}
                />
            </motion.div>
        </motion.div>
    );
}

/* ── ArrowRight icon ──────────────────────────────────────── */
function ArrowRight({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
        </svg>
    );
}

/* ── Classroom card ───────────────────────────────────────── */
function ClassCard({ classroom, index }) {
    const { ref, style, onMouseMove, onMouseLeave } = useMagneticHover(4);
    const { addToast } = useToast();
    const navigate = useNavigate();

    const copyId = (e) => {
        e.stopPropagation();
        e.preventDefault();
        navigator.clipboard.writeText(classroom.id).catch(() => { });
        addToast('Classroom ID copied!', 'success');
    };

    const initial = (classroom.name || 'C')[0].toUpperCase();

    return (
        <motion.a
            ref={ref}
            href={`/?classroomId=${classroom.id}&classroomName=${encodeURIComponent(classroom.name)}`}
            onClick={(e) => { e.preventDefault(); navigate(`/?classroomId=${classroom.id}&classroomName=${encodeURIComponent(classroom.name)}`); }}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            className="block relative no-underline text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 + index * 0.08, ease: [0.25, 0.4, 0.25, 1] }}
            whileHover={{ y: -4 }}
            style={{ ...style, willChange: 'transform' }}
        >
            <div
                className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300"
                style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(165,180,252,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
                {/* Watermark letter */}
                <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '140px',
                    color: 'rgba(255,255,255,0.03)',
                    position: 'absolute',
                    bottom: '-10px',
                    right: '12px',
                    lineHeight: 1,
                    pointerEvents: 'none',
                    userSelect: 'none',
                    zIndex: 0,
                }}>
                    {initial}
                </div>

                {/* Indigo left accent bar */}
                <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full" style={{ background: 'linear-gradient(to bottom, #6366f1, #fb7185)' }} />

                <div className="relative pl-3" style={{ zIndex: 1 }}>
                    <div className="mb-1 text-xl font-bold tracking-wide" style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '1px' }}>
                        {classroom.name}
                    </div>
                    <div className="flex items-center gap-2 mb-5">
                        <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>{classroom.id}</span>
                        <button onClick={copyId}
                            className="text-[11px] font-medium transition-colors"
                            style={{ color: '#a5b4fc', background: 'none', border: 'none', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#c7d2fe'}
                            onMouseLeave={e => e.currentTarget.style.color = '#a5b4fc'}
                        >Copy</button>
                    </div>

                    <div className="flex gap-6 items-end">
                        {[
                            { v: classroom.students || 0, l: 'Students' },
                            { v: classroom.sessions || 0, l: 'Sessions' },
                        ].map((s, i) => (
                            <div key={i}>
                                <div className="text-2xl font-bold" style={{ color: s.v === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-display)' }}>{s.v}</div>
                                <div className="mt-0.5 text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.l}</div>
                            </div>
                        ))}
                        {classroom.lang && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider"
                                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                                {classroom.lang}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </motion.a>
    );
}

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
        opacity: 1, y: 0,
        transition: { duration: 0.7, delay: 0.1 + (i || 0) * 0.1, ease: [0.25, 0.4, 0.25, 1] },
    }),
};

export default function ClassroomsPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();

    useEffect(() => {
        if (!user || user.role !== 'teacher') navigate('/auth');
    }, [user, navigate]);

    const [classrooms, setClassrooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formName, setFormName] = useState('');
    const [formLang, setFormLang] = useState('python');
    const [formBatch, setFormBatch] = useState('');

    const storageKey = `synapse_classrooms_${user?.email?.replace(/[^a-z0-9]/gi, '_') || 'default'}`;

    const saveToStorage = (list) => {
        try { localStorage.setItem(storageKey, JSON.stringify(list)); } catch { }
    };

    useEffect(() => {
        (async () => {
            try {
                const data = await API.getClassrooms();
                const list = Array.isArray(data) && data.length > 0
                    ? data
                    : JSON.parse(localStorage.getItem(storageKey) || '[]');
                setClassrooms(list);
            } catch {
                setClassrooms(JSON.parse(localStorage.getItem(storageKey) || '[]'));
            }
            setLoading(false);
        })();
    }, [user]);

    const createClassroom = async () => {
        if (!formName.trim()) return;
        try {
            const created = await API.createClassroom({ name: formName.trim(), lang: formLang, batch: formBatch });
            setClassrooms(prev => {
                const updated = [...prev, created];
                saveToStorage(updated);
                return updated;
            });
            addToast('Classroom created!', 'success');
        } catch {
            addToast('Failed to create classroom', 'error');
        }
        setShowModal(false);
        setFormName(''); setFormBatch('');
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center" style={{ background: '#030303' }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: '#6366f1' }} />
        </div>
    );

    return (
        <div className="relative min-h-screen w-full overflow-x-hidden" style={{ background: '#030303' }}>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl pointer-events-none" />

            {/* Floating pill shapes */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <ElegantShape delay={0.3} width={600} height={140} rotate={12} gradient="from-indigo-500/[0.15]" className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]" />
                <ElegantShape delay={0.5} width={500} height={120} rotate={-15} gradient="from-rose-500/[0.15]" className="right-[-5%] md:right-[0%] top-[60%] md:top-[65%]" />
                <ElegantShape delay={0.4} width={300} height={80} rotate={-8} gradient="from-violet-500/[0.15]" className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]" />
                <ElegantShape delay={0.6} width={200} height={60} rotate={20} gradient="from-amber-500/[0.15]" className="right-[15%] md:right-[20%] top-[8%] md:top-[12%]" />
                <ElegantShape delay={0.7} width={150} height={40} rotate={-25} gradient="from-cyan-500/[0.15]" className="left-[20%] md:left-[25%] top-[5%] md:top-[8%]" />
            </div>

            {/* Top + bottom gradient fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-[#030303]/80 pointer-events-none" />

            {/* ── Topbar ─────────────────────────────────────────── */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
                className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
                style={{
                    background: 'rgba(3,3,3,0.8)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                }}
            >
                {/* Logo — gradient wordmark */}
                <div className="flex items-center">
                    <span className="text-indigo-400 mr-2 text-base">•</span>
                    <span
                        className="text-lg font-extrabold tracking-[0.15em] bg-clip-text text-transparent"
                        style={{
                            fontFamily: "'Syne', sans-serif",
                            backgroundImage: 'linear-gradient(to right, #a5b4fc, rgba(255,255,255,0.9), #fda4af)',
                        }}
                    >
                        SYNAPSE
                    </span>
                </div>

                {/* Right — username chip + sign out */}
                <div className="flex items-center gap-3">
                    {/* Username chip */}
                    <span className="cursor-default overflow-hidden rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-1.5 text-sm font-medium backdrop-blur-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {user?.name || user?.email}
                    </span>

                    {/* Sign Out — InteractiveHoverButton */}
                    <button
                        onClick={logout}
                        className="group relative w-28 cursor-pointer overflow-hidden rounded-full border border-white/[0.1] bg-white/[0.04] py-1.5 text-center text-sm font-semibold text-white/70 backdrop-blur-sm"
                    >
                        <span className="inline-block translate-x-1 transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
                            Sign Out
                        </span>
                        <div className="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-1.5 text-white opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100">
                            <span>Sign Out</span>
                            <ArrowRight size={14} />
                        </div>
                        <div className="absolute left-[20%] top-[40%] h-2 w-2 scale-[1] rounded-lg bg-gradient-to-r from-indigo-500 to-rose-400 transition-all duration-300 group-hover:left-[0%] group-hover:top-[0%] group-hover:h-full group-hover:w-full group-hover:scale-[1.8]" />
                    </button>
                </div>
            </motion.header>

            {/* ── Main content ───────────────────────────────────── */}
            <main className="relative z-10 max-w-5xl mx-auto px-6 pt-28 pb-12">

                {/* Page header */}
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <motion.p
                            custom={0} variants={fadeUp} initial="hidden" animate="visible"
                            className="text-xs font-medium uppercase mb-3 border-l-2 border-indigo-500/40 pl-3"
                            style={{ letterSpacing: '0.25em', color: 'rgba(99,102,241,0.6)' }}
                        >
                            Instructor Portal
                        </motion.p>
                        <motion.h1
                            custom={1} variants={fadeUp} initial="hidden" animate="visible"
                            className="font-bold tracking-tight mb-2"
                            style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(2rem,5vw,3.5rem)' }}
                        >
                            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.8))' }}>
                                My Classrooms
                            </span>
                        </motion.h1>
                        <motion.p
                            custom={2} variants={fadeUp} initial="hidden" animate="visible"
                            className="text-sm font-light"
                            style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-sans)' }}
                        >
                            Each classroom gets a unique ID students enter in VS Code.
                        </motion.p>
                    </div>

                    <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
                        <button
                            onClick={() => setShowModal(true)}
                            className="group relative w-44 cursor-pointer overflow-hidden rounded-full border border-white/[0.1] bg-white/[0.04] py-2 text-center text-sm font-semibold text-white/70 backdrop-blur-sm"
                        >
                            <span className="inline-block translate-x-1 transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
                                + New Classroom
                            </span>
                            <div className="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-1.5 text-white opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100">
                                <span>+ New Classroom</span>
                                <ArrowRight size={14} />
                            </div>
                            <div className="absolute left-[5%] top-[40%] h-2 w-2 scale-[1] rounded-lg bg-gradient-to-r from-indigo-500 to-rose-400 transition-all duration-300 group-hover:left-[0%] group-hover:top-[0%] group-hover:h-full group-hover:w-full group-hover:scale-[1.8]" />
                        </button>
                    </motion.div>
                </div>

                {/* Empty state */}
                {classrooms.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
                        className="text-center py-28"
                    >
                        <div className="text-[120px] font-bold leading-none mb-6" style={{ color: 'rgba(255,255,255,0.04)', fontFamily: 'var(--font-display)' }}>0</div>
                        <h2 className="text-xl font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)' }}>No classrooms yet</h2>
                        <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-sans)' }}>
                            Create your first classroom and share the ID with your students.
                        </p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="group relative w-64 cursor-pointer overflow-hidden rounded-full border border-white/[0.1] bg-white/[0.04] py-3 text-center text-sm font-semibold text-white/70 backdrop-blur-sm"
                        >
                            <span className="inline-block translate-x-1 transition-all duration-300 group-hover:translate-x-16 group-hover:opacity-0">
                                + Create your first classroom
                            </span>
                            <div className="absolute top-0 z-10 flex h-full w-full translate-x-16 items-center justify-center gap-1.5 text-white opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100">
                                <span>+ Create your first classroom</span>
                                <ArrowRight size={14} />
                            </div>
                            <div className="absolute left-[5%] top-[40%] h-2 w-2 scale-[1] rounded-lg bg-gradient-to-r from-indigo-500 to-rose-400 transition-all duration-300 group-hover:left-[0%] group-hover:top-[0%] group-hover:h-full group-hover:w-full group-hover:scale-[1.8]" />
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {classrooms.map((c, i) => <ClassCard key={c.id} classroom={c} index={i} />)}
                    </div>
                )}
            </main>

            {/* ── Create Classroom Modal ──────────────────────────── */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        key="modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center px-4"
                        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
                        onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
                    >
                        <motion.div
                            key="modal-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
                            className="w-full max-w-md rounded-2xl p-8 relative"
                            style={{ background: '#0d0d10', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            {/* Close button */}
                            <button onClick={() => setShowModal(false)}
                                className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; e.currentTarget.style.color = '#ef4444'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>

                            <p className="text-xs font-medium uppercase mb-1 border-l-2 border-indigo-500/40 pl-3"
                                style={{ letterSpacing: '0.25em', color: 'rgba(99,102,241,0.6)' }}>New Classroom</p>
                            <h2 className="text-2xl font-bold mb-1" style={{ color: 'rgba(255,255,255,0.9)', fontFamily: "'Syne', sans-serif" }}>
                                Create Classroom
                            </h2>
                            <p className="text-xs mb-7" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-sans)' }}>
                                Students enter this ID in the Synapse extension to join.
                            </p>

                            {/* Name */}
                            <div className="mb-4">
                                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-sans)' }}>Name</label>
                                <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                                    placeholder="e.g. Python Bootcamp Batch 12"
                                    className="w-full px-4 py-3 text-sm rounded-xl outline-none transition-all duration-200"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}
                                    onFocus={e => e.target.style.borderColor = 'rgba(129,140,248,0.5)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>

                            {/* Language */}
                            <div className="mb-4">
                                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-sans)' }}>Language</label>
                                <select value={formLang} onChange={e => setFormLang(e.target.value)}
                                    className="w-full px-4 py-3 text-sm rounded-xl outline-none transition-all duration-200"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}>
                                    <option value="python" style={{ background: '#0d0d10' }}>Python</option>
                                    <option value="javascript" style={{ background: '#0d0d10' }}>JavaScript</option>
                                    <option value="java" style={{ background: '#0d0d10' }}>Java</option>
                                </select>
                            </div>

                            {/* Batch */}
                            <div className="mb-7">
                                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-sans)' }}>Batch</label>
                                <input type="text" value={formBatch} onChange={e => setFormBatch(e.target.value)}
                                    placeholder="e.g. Feb 2026"
                                    className="w-full px-4 py-3 text-sm rounded-xl outline-none transition-all duration-200"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}
                                    onFocus={e => e.target.style.borderColor = 'rgba(129,140,248,0.5)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>

                            <motion.button
                                onClick={createClassroom}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-3 text-sm font-semibold rounded-xl text-white"
                                style={{
                                    background: 'linear-gradient(to right, #6366f1, #fb7185)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-sans)',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                Create Classroom
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
