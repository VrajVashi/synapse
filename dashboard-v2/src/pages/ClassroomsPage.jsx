import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useMagneticHover } from '../hooks/useMagneticHover';
import { API } from '../api';
import ParticleField from '../components/ParticleField';
import AuroraBackground from '../components/AuroraBackground';
import { staggerContainer, scaleIn, fadeUp, fadeIn, ease, prefersReducedMotion } from '../lib/animations';

const shouldAnimate = !prefersReducedMotion;
const cardsStagger = staggerContainer(0.08, 0.2);

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
            variants={scaleIn}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2, ease: [0.0, 0.0, 0.2, 1] }}
            style={{ ...style, willChange: 'transform' }}
        >
            <div className="relative overflow-hidden"
                style={{
                    background: '#1A1A1A',
                    border: '1px solid #2A2A2A',
                    borderLeft: '3px solid #E8FF47',
                    borderRadius: '2px',
                    padding: '24px',
                    transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#E8FF47'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.borderLeftColor = '#E8FF47'; }}
            >
                {/* Watermark letter — ghostly reveal after card */}
                <motion.div
                    style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '180px',
                        color: '#1E1E1E',
                        position: 'absolute',
                        bottom: '-20px',
                        right: '16px',
                        lineHeight: 1,
                        pointerEvents: 'none',
                        userSelect: 'none',
                        zIndex: 0,
                    }}
                    initial={shouldAnimate ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 + (index * 0.08) }}
                >
                    {initial}
                </motion.div>

                {/* Card content */}
                <div className="relative" style={{ zIndex: 1 }}>
                    <div className="mb-1" style={{ fontFamily: 'var(--font-display)', fontSize: '28px', letterSpacing: '1px', color: '#F5F5F5' }}>{classroom.name}</div>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-[11px] font-mono" style={{ color: '#666', letterSpacing: '1px' }}>{classroom.id}</span>
                        <button onClick={copyId} className="text-[11px] font-medium transition-colors" style={{ color: '#E8FF47', background: 'none', border: 'none' }}>Copy</button>
                    </div>

                    <div className="flex gap-5 items-end">
                        {[
                            { v: classroom.students || 0, l: 'Students' },
                            { v: classroom.sessions || 0, l: 'Sessions' },
                        ].map((s, i) => (
                            <div key={i}>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: s.v === 0 ? '#333' : '#F5F5F5' }}>{s.v}</div>
                                <div className="mt-0.5" style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#666' }}>{s.l}</div>
                            </div>
                        ))}
                        {classroom.lang && (
                            <div>
                                <span className="inline-block px-2 py-0.5" style={{
                                    background: 'transparent', border: '1px solid #2A2A2A', borderRadius: '2px',
                                    fontSize: '10px', color: '#555', fontFamily: 'var(--font-sans)', fontWeight: 600,
                                    letterSpacing: '1px', textTransform: 'uppercase',
                                }}>{classroom.lang}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.a>
    );
}

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

    // Fetch classrooms from backend on mount
    useEffect(() => {
        (async () => {
            try {
                const data = await API.getClassrooms();
                setClassrooms(Array.isArray(data) ? data : []);
            } catch {
                // Fallback to localStorage
                const storageKey = `synapse_classrooms_${user?.email?.replace(/[^a-z0-9]/gi, '_') || 'default'}`;
                setClassrooms(JSON.parse(localStorage.getItem(storageKey) || '[]'));
            }
            setLoading(false);
        })();
    }, [user]);

    const createClassroom = async () => {
        if (!formName.trim()) return;

        try {
            const created = await API.createClassroom({
                name: formName.trim(),
                lang: formLang,
                batch: formBatch,
            });
            setClassrooms(prev => [...prev, created]);
            addToast('Classroom created!', 'success');
        } catch {
            addToast('Failed to create classroom', 'error');
        }

        setShowModal(false);
        setFormName(''); setFormBatch('');
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center" style={{ background: '#0D0D0D' }}>
            <div className="w-8 h-8 border-2 border-[#E8FF4730] border-t-[#E8FF47] rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen relative">
            <ParticleField />
            <AuroraBackground />

            {/* Topbar */}
            <header className="sticky top-0 z-30 flex items-center justify-between px-7 py-4"
                style={{ background: '#0D0D0D', borderBottom: '1px solid #1E1E1E' }}>
                <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 flex items-center justify-center" style={{ background: '#E8FF47', borderRadius: '1px' }}>
                        <span className="text-[10px] font-black text-[#0D0D0D]">S</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '2px', color: '#F5F5F5' }}>Synapse</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[13px]" style={{ color: '#666', fontFamily: 'var(--font-sans)' }}>{user?.name || user?.email}</span>
                    <button onClick={logout}
                        className="text-xs font-medium px-3.5 py-1.5 transition-all duration-150"
                        style={{ border: '1px solid #2A2A2A', borderRadius: '2px', background: 'transparent', color: '#666', fontFamily: 'var(--font-sans)' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8FF47'; e.currentTarget.style.color = '#E8FF47'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.color = '#666'; }}
                    >Sign Out</button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-11 relative z-10 page-content">
                <div className="flex items-end justify-between mb-9">
                    <div>
                        {/* Title — clipReveal curtain */}
                        <div style={{ overflow: 'hidden' }}>
                            <motion.h1
                                style={{ fontFamily: 'var(--font-display)', fontSize: '52px', letterSpacing: '3px', lineHeight: 1, color: '#F5F5F5' }}
                                initial={shouldAnimate ? { clipPath: 'inset(0 100% 0 0)' } : false}
                                animate={{ clipPath: 'inset(0 0% 0 0)' }}
                                transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
                            >MY CLASSROOMS</motion.h1>
                        </div>
                        <motion.p
                            className="mt-2"
                            style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#666' }}
                            variants={fadeUp}
                            initial={shouldAnimate ? 'hidden' : false}
                            animate="show"
                            transition={{ delay: 0.3 }}
                        >Each classroom gets a unique ID students enter in VS Code.</motion.p>
                    </div>
                    <motion.button
                        onClick={() => setShowModal(true)}
                        className="px-5 py-2.5 text-[14px] font-semibold"
                        style={{ background: '#E8FF47', color: '#0D0D0D', borderRadius: '2px', border: 'none', fontFamily: 'var(--font-sans)', willChange: 'transform' }}
                        variants={fadeIn}
                        initial={shouldAnimate ? 'hidden' : false}
                        animate="show"
                        transition={{ delay: 0.35 }}
                        whileHover={{ scale: 1.02, background: '#D4EB3A' }}
                        whileTap={{ scale: 0.97 }}
                    >
                        + New Classroom
                    </motion.button>
                </div>

                {classrooms.length === 0 ? (
                    <div className="text-center py-24 animate-fade-in">
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '120px', color: '#1E1E1E', lineHeight: 1 }}>0</div>
                        <h2 className="text-xl font-semibold mb-2" style={{ color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}>No classrooms yet</h2>
                        <p className="text-sm mb-7" style={{ color: '#444', fontFamily: 'var(--font-sans)' }}>Create your first classroom and share the ID with your students.</p>
                        <button onClick={() => setShowModal(true)}
                            className="px-5 py-2.5 text-sm font-semibold transition-all"
                            style={{ background: '#E8FF47', color: '#0D0D0D', borderRadius: '2px', border: 'none' }}>
                            + Create your first classroom
                        </button>
                    </div>
                ) : (
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                        variants={cardsStagger}
                        initial={shouldAnimate ? 'hidden' : false}
                        animate="show"
                    >
                        {classrooms.map((c, i) => <ClassCard key={c.id} classroom={c} index={i} />)}
                    </motion.div>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }} onClick={() => setShowModal(false)}>
                    <div onClick={e => e.stopPropagation()}
                        className="p-9 w-full max-w-md relative animate-slide-up"
                        style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '2px' }}>
                        <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center transition-all"
                            style={{ background: 'transparent', border: '1px solid #2A2A2A', borderRadius: '2px', color: '#444' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.color = '#444'; }}>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>

                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', letterSpacing: '2px', color: '#F5F5F5', marginBottom: '4px' }}>CREATE CLASSROOM</h2>
                        <p className="text-xs mb-7" style={{ color: '#666', fontFamily: 'var(--font-sans)' }}>Students enter this ID in the Synapse extension to join.</p>

                        <div className="mb-4">
                            <label className="block text-[10px] font-medium uppercase mb-1.5" style={{ letterSpacing: '3px', color: '#666', fontFamily: 'var(--font-sans)' }}>Name</label>
                            <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Python Bootcamp Batch 12"
                                className="w-full px-3.5 py-2.5 text-sm outline-none transition-all"
                                style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '2px', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}
                                onFocus={e => e.target.style.borderColor = '#E8FF47'}
                                onBlur={e => e.target.style.borderColor = '#2A2A2A'} />
                        </div>
                        <div className="mb-4">
                            <label className="block text-[10px] font-medium uppercase mb-1.5" style={{ letterSpacing: '3px', color: '#666', fontFamily: 'var(--font-sans)' }}>Language</label>
                            <select value={formLang} onChange={e => setFormLang(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm outline-none transition-all"
                                style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '2px', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}>
                                <option value="python" style={{ background: '#0D0D0D' }}>Python</option>
                                <option value="javascript" style={{ background: '#0D0D0D' }}>JavaScript</option>
                                <option value="java" style={{ background: '#0D0D0D' }}>Java</option>
                            </select>
                        </div>
                        <div className="mb-5">
                            <label className="block text-[10px] font-medium uppercase mb-1.5" style={{ letterSpacing: '3px', color: '#666', fontFamily: 'var(--font-sans)' }}>Batch</label>
                            <input type="text" value={formBatch} onChange={e => setFormBatch(e.target.value)} placeholder="e.g. Feb 2026"
                                className="w-full px-3.5 py-2.5 text-sm outline-none transition-all"
                                style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '2px', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}
                                onFocus={e => e.target.style.borderColor = '#E8FF47'}
                                onBlur={e => e.target.style.borderColor = '#2A2A2A'} />
                        </div>

                        <button onClick={createClassroom}
                            className="w-full py-3 text-sm font-semibold transition-all"
                            style={{ background: '#E8FF47', color: '#0D0D0D', borderRadius: '2px', border: 'none', fontFamily: 'var(--font-sans)' }}>
                            Create Classroom
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
