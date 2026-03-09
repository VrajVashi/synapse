import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { ease } from '../lib/animations';

/* ── Elegant floating pill shape ─────────────────────────── */
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
                    style={{
                        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2), transparent 70%)',
                    }}
                />
            </motion.div>
        </motion.div>
    );
}

/* ── ArrowRight icon ─────────────────────────────────────── */
function ArrowRight({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
        </svg>
    );
}

/* ── Interactive hover button ────────────────────────────── */
function InteractiveHoverButton({ text, onClick }) {
    return (
        <button onClick={onClick} className="group relative w-32 cursor-pointer overflow-hidden rounded-full border border-white/[0.15] bg-white/[0.04] p-2 text-center font-semibold text-white/80 backdrop-blur-sm">
            <span className="inline-block translate-x-1 transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">{text}</span>
            <div className="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-white opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100">
                <span>{text}</span>
                <ArrowRight size={16} />
            </div>
            <div className="absolute left-[20%] top-[40%] h-2 w-2 scale-[1] rounded-lg bg-gradient-to-r from-indigo-500 to-rose-400 transition-all duration-300 group-hover:left-[0%] group-hover:top-[0%] group-hover:h-full group-hover:w-full group-hover:scale-[1.8]" />
        </button>
    );
}

/* ── Fade-up animation variants (hero headline) ─────────── */
const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 1, delay: 0.5 + i * 0.2, ease: [0.25, 0.4, 0.25, 1] },
    }),
};

/* ── Scroll-triggered fade-up for editorial prose ────────── */
const proseFadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, delay: 0.1 + i * 0.12, ease: [0.25, 0.4, 0.25, 1] },
    }),
};

/* ── Divider fade (no y movement) ────────────────────────── */
const dividerFade = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 1, delay: 0, ease: [0.25, 0.4, 0.25, 1] } },
};

export default function AuthPage() {
    const { login, signup, getDemoCredentials, user } = useAuth();
    const navigate = useNavigate();
    const [modalMode, setModalMode] = useState(null); // null | 'signin' | 'signup'
    const [mode, setMode] = useState('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('teacher');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const ref1 = useRef(null);
    const inView1 = useInView(ref1, { once: true, margin: '-80px' });
    const ref2 = useRef(null);
    const inView2 = useInView(ref2, { once: true, margin: '-80px' });

    useEffect(() => {
        if (user) navigate(user.role === 'teacher' ? '/classrooms' : '/student');
    }, [user, navigate]);

    const openModal = (m) => {
        setMode(m);
        setModalMode(m);
        setError('');
    };

    const closeModal = () => {
        setModalMode(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        await new Promise(r => setTimeout(r, 600));

        if (mode === 'signin') {
            const result = login(email, password);
            if (!result.success) { setError(result.error); setLoading(false); return; }
            navigate(result.user.role === 'teacher' ? '/classrooms' : '/student');
        } else {
            if (!name || password.length < 6) { setError('Fill all fields (min 6 char password)'); setLoading(false); return; }
            const u = signup(name, email, password, role);
            navigate(u.role === 'teacher' ? '/classrooms' : '/student');
        }
    };

    const fillDemo = (r) => {
        setMode('signin');
        const creds = getDemoCredentials(r);
        setEmail(creds.email);
        setPassword(creds.password);
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center overflow-x-hidden pt-32 pb-24" style={{ background: '#030303' }}>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl" />

            {/* Floating pill shapes */}
            <div className="absolute inset-0 overflow-hidden">
                <ElegantShape delay={0.3} width={600} height={140} rotate={12} gradient="from-indigo-500/[0.15]" className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]" />
                <ElegantShape delay={0.5} width={500} height={120} rotate={-15} gradient="from-rose-500/[0.15]" className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]" />
                <ElegantShape delay={0.4} width={300} height={80} rotate={-8} gradient="from-violet-500/[0.15]" className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]" />
                <ElegantShape delay={0.6} width={200} height={60} rotate={20} gradient="from-amber-500/[0.15]" className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]" />
                <ElegantShape delay={0.7} width={150} height={40} rotate={-25} gradient="from-cyan-500/[0.15]" className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]" />
            </div>

            {/* Top + bottom gradient fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-[#030303]/80 pointer-events-none" />

            {/* ── Nav buttons (fixed top-right) ──────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
                className="fixed top-6 right-6 z-50 flex items-center gap-3"
            >
                <InteractiveHoverButton text="Sign In" onClick={() => openModal('signin')} />
                <InteractiveHoverButton text="Sign Up" onClick={() => openModal('signup')} />
            </motion.div>

            {/* ── Main content ───────────────────────────────────── */}
            <div className="relative z-10 w-full max-w-3xl mx-auto px-4 md:px-6 text-center">

                {/* Headline */}
                <motion.div custom={0} variants={fadeUpVariants} initial="hidden" animate="visible">
                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-3 md:mb-4 tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
                        <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.8))' }}>
                            Debugging Intelligence
                        </span>
                        <br />
                        <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #a5b4fc, rgba(255,255,255,0.9), #fda4af)' }}>
                            for Educators
                        </span>
                    </h1>
                </motion.div>

                {/* Subtext */}
                <motion.div custom={1} variants={fadeUpVariants} initial="hidden" animate="visible">
                    <p className="text-base sm:text-lg md:text-xl mb-16 leading-relaxed font-light tracking-wide max-w-xl mx-auto px-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        See exactly where students struggle — before they ask for help.
                    </p>
                </motion.div>

                {/* ── Editorial prose section ────────────────────── */}
                <div className="max-w-[660px] mx-auto text-left mt-20 px-4">

                    {/* ━━━ SUBSECTION 1: THE PROBLEM ━━━ */}
                    <div
                        ref={ref1}
                        className="relative rounded-2xl p-8 mb-0"
                        style={{
                            background: 'linear-gradient(to bottom, rgba(255,255,255,0.02), transparent)',
                            border: '1px solid rgba(255,255,255,0.04)',
                        }}
                    >
                        <motion.div custom={0} variants={proseFadeUp} initial="hidden" animate={inView1 ? 'visible' : 'hidden'}>
                            <p className="text-xs font-medium uppercase mb-4 border-l-2 border-indigo-500/40 pl-3" style={{ letterSpacing: '0.25em', color: 'rgba(99,102,241,0.6)' }}>The Problem</p>
                        </motion.div>

                        <motion.div custom={1} variants={proseFadeUp} initial="hidden" animate={inView1 ? 'visible' : 'hidden'}>
                            <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-5 bg-gradient-to-r from-rose-300 via-white/95 to-rose-200 bg-clip-text text-transparent">
                                Students are drowning in silence.
                            </h2>
                        </motion.div>

                        <motion.div custom={2} variants={proseFadeUp} initial="hidden" animate={inView1 ? 'visible' : 'hidden'}>
                            <p className="mb-3 font-light text-[0.925rem] leading-[1.85]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                Every day, thousands of students hit the same wall — a bug they can't name, an error they've seen five times, a concept that slipped through the cracks of a 90-minute lecture. They don't raise their hand. They{' '}
                                <span style={{ color: 'rgba(255,255,255,0.7)' }}>copy a solution from the internet</span>
                                {' '}and move on, understanding nothing.
                            </p>
                        </motion.div>

                        <motion.div custom={3} variants={proseFadeUp} initial="hidden" animate={inView1 ? 'visible' : 'hidden'}>
                            <p className="mb-3 font-light text-[0.925rem] leading-[1.85]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                Instructors are{' '}
                                <span style={{ color: 'rgba(251,146,147,0.8)' }}>flying blind</span>
                                . They grade what gets submitted, never what gets deleted. The{' '}
                                <span style={{ color: 'rgba(251,146,147,0.8)' }}>47-minute struggle</span>
                                , the repeated crash, the pattern of avoidance — none of it is visible in a{' '}
                                <span style={{ color: 'rgba(255,255,255,0.7)' }}>final pull request</span>
                                .
                            </p>
                        </motion.div>

                        <motion.div custom={4} variants={proseFadeUp} initial="hidden" animate={inView1 ? 'visible' : 'hidden'}>
                            <p className="font-light text-[0.925rem] leading-[1.85]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                By the time a student falls behind enough to be noticed, the gap is already too wide to close in a single session. The system isn't failing loudly. It's{' '}
                                <span style={{ color: 'rgba(251,146,147,0.8)' }}>failing quietly</span>
                                , one confused student at a time.
                            </p>
                        </motion.div>
                    </div>

                    {/* ━━━ DIVIDER ━━━ */}
                    <motion.div variants={dividerFade} initial="hidden" animate={inView2 ? 'visible' : 'hidden'}>
                        <div className="w-full h-px my-12" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)' }} />
                    </motion.div>

                    {/* ━━━ SUBSECTION 2: OUR APPROACH ━━━ */}
                    <div
                        ref={ref2}
                        className="relative rounded-2xl p-8"
                        style={{
                            background: 'linear-gradient(to bottom, rgba(255,255,255,0.02), transparent)',
                            border: '1px solid rgba(255,255,255,0.04)',
                        }}
                    >
                        <motion.div custom={0} variants={proseFadeUp} initial="hidden" animate={inView2 ? 'visible' : 'hidden'}>
                            <p className="text-xs font-medium uppercase mb-4 border-l-2 border-indigo-500/40 pl-3" style={{ letterSpacing: '0.25em', color: 'rgba(99,102,241,0.6)' }}>Our Approach</p>
                        </motion.div>

                        <motion.div custom={1} variants={proseFadeUp} initial="hidden" animate={inView2 ? 'visible' : 'hidden'}>
                            <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-5 bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #a5b4fc, rgba(255,255,255,0.9), #fda4af)' }}>
                                Intelligence that works in the background, so instructors can work in the moment.
                            </h2>
                        </motion.div>

                        <motion.div custom={2} variants={proseFadeUp} initial="hidden" animate={inView2 ? 'visible' : 'hidden'}>
                            <p className="mb-3 font-light text-[0.925rem] leading-[1.85]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                Synapse sits inside VS Code as a lightweight extension, watching{' '}
                                <span style={{ color: 'rgba(165,180,252,0.8)' }}>how students actually code</span>
                                {' '}— not what they ultimately submit. Every failed attempt, every loop, every pattern of confusion becomes a{' '}
                                <span style={{ color: 'rgba(165,180,252,0.8)' }}>structured signal</span>
                                {' '}rather than lost noise.
                            </p>
                        </motion.div>

                        <motion.div custom={3} variants={proseFadeUp} initial="hidden" animate={inView2 ? 'visible' : 'hidden'}>
                            <p className="mb-3 font-light text-[0.925rem] leading-[1.85]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                That signal flows to a{' '}
                                <span style={{ color: 'rgba(165,180,252,0.8)' }}>live instructor dashboard</span>
                                {' '}built for real decisions, not just data. You see which concepts your cohort is struggling with right now. You see who is at risk before they give up. You get a{' '}
                                <span style={{ color: 'rgba(255,255,255,0.7)' }}>suggested action, not just an alert</span>
                                .
                            </p>
                        </motion.div>

                        <motion.div custom={4} variants={proseFadeUp} initial="hidden" animate={inView2 ? 'visible' : 'hidden'}>
                            <p className="font-light text-[0.925rem] leading-[1.85]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                The result is a classroom where early intervention is the norm, where curriculum adjusts to reality, and where no student has to struggle alone in silence — because{' '}
                                <span className="bg-clip-text text-transparent font-medium" style={{ backgroundImage: 'linear-gradient(to right, #a5b4fc, #fda4af)' }}>silence itself becomes visible</span>
                                .
                            </p>
                        </motion.div>
                    </div>

                </div>
            </div>

            {/* ── Auth modal overlay ─────────────────────────────── */}
            <AnimatePresence>
                {modalMode && (
                    <motion.div
                        key="modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center px-4"
                        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
                        onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
                    >
                        <motion.div
                            key="modal-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
                            className="w-full max-w-md rounded-2xl p-8"
                            style={{ background: '#0d0d10', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            {/* Tab switcher inside modal */}
                            <div className="flex gap-6 mb-6 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                {['signin', 'signup'].map(m => (
                                    <button key={m} type="button" onClick={() => { setMode(m); setError(''); }}
                                        className="pb-2 text-[13px] font-medium transition-all duration-150"
                                        style={{
                                            fontFamily: 'var(--font-sans)',
                                            color: mode === m ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
                                            background: 'none',
                                            border: 'none',
                                            borderBottom: mode === m ? '2px solid #a5b4fc' : '2px solid transparent',
                                            marginBottom: '-13px',
                                            cursor: 'pointer',
                                        }}>
                                        {m === 'signin' ? 'Sign In' : 'Sign Up'}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handleSubmit}>
                                {/* Demo chips */}
                                <div className="flex gap-2 mb-5">
                                    {[{ r: 'teacher', l: 'Demo Teacher' }, { r: 'student', l: 'Demo Student' }].map(d => (
                                        <button key={d.r} type="button" onClick={() => fillDemo(d.r)}
                                            className="flex-1 py-2 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all duration-200 rounded-xl"
                                            style={{
                                                background: 'transparent',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: 'rgba(255,255,255,0.5)',
                                                fontFamily: 'var(--font-sans)',
                                                cursor: 'pointer',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(165,180,252,0.5)'; e.currentTarget.style.color = '#a5b4fc'; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                                        >
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                            {d.l}
                                        </button>
                                    ))}
                                </div>

                                {error && (
                                    <div className="text-xs px-3 py-2 mb-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>{error}</div>
                                )}

                                {mode === 'signup' && (
                                    <div className="mb-4">
                                        <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-sans)' }}>Name</label>
                                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                                            className="w-full px-4 py-3 text-sm rounded-xl outline-none transition-all duration-200"
                                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}
                                            onFocus={e => e.target.style.borderColor = 'rgba(129,140,248,0.5)'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                        />
                                    </div>
                                )}

                                {/* Email */}
                                <div className="mb-4">
                                    <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-sans)' }}>Email</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@university.edu"
                                        className="w-full px-4 py-3 text-sm rounded-xl outline-none transition-all duration-200"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(129,140,248,0.5)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                    />
                                </div>

                                {/* Password */}
                                <div className="mb-4">
                                    <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-sans)' }}>Password</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password"
                                        className="w-full px-4 py-3 text-sm rounded-xl outline-none transition-all duration-200"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(129,140,248,0.5)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                    />
                                </div>

                                {mode === 'signup' && (
                                    <div className="mb-5">
                                        <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-sans)' }}>Role</label>
                                        <select value={role} onChange={e => setRole(e.target.value)}
                                            className="w-full px-4 py-3 text-sm rounded-xl outline-none transition-all duration-200"
                                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}>
                                            <option value="teacher" style={{ background: '#0d0d10' }}>Instructor</option>
                                            <option value="student" style={{ background: '#0d0d10' }}>Student</option>
                                        </select>
                                    </div>
                                )}

                                {/* Submit button */}
                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    whileHover={!loading ? { scale: 1.02 } : {}}
                                    whileTap={!loading ? { scale: 0.98 } : {}}
                                    transition={ease.spring}
                                    className="w-full py-3 text-[14px] font-semibold rounded-xl disabled:opacity-70"
                                    style={{
                                        background: loading
                                            ? 'linear-gradient(to right, #6366f1, #e879a0)'
                                            : 'linear-gradient(to right, #6366f1, #fb7185)',
                                        color: '#ffffff',
                                        height: '48px',
                                        letterSpacing: '1px',
                                        fontFamily: 'var(--font-sans)',
                                        border: 'none',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        willChange: 'transform',
                                    }}
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                                    ) : (
                                        mode === 'signin' ? 'Sign In' : 'Create Account'
                                    )}
                                </motion.button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
