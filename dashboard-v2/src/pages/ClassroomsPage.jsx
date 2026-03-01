import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { useMagneticHover } from '../hooks/useMagneticHover';
import ParticleField from '../components/ParticleField';
import AuroraBackground from '../components/AuroraBackground';
import NavSidebar from '../components/NavSidebar';

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

    return (
        <a
            ref={ref}
            href={`/?classroomId=${classroom.id}&classroomName=${encodeURIComponent(classroom.name)}`}
            onClick={(e) => { e.preventDefault(); navigate(`/?classroomId=${classroom.id}&classroomName=${encodeURIComponent(classroom.name)}`); }}
            style={{
                ...style,
                opacity: 0,
                animation: `slide-up 0.5s cubic-bezier(0.22,1,0.36,1) ${index * 80}ms forwards`,
            }}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            className="block rounded-xl p-6 border border-white/[0.04] relative overflow-hidden transition-shadow duration-300 group no-underline text-white hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]"
        >
            <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            {/* Hover border glow */}
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'conic-gradient(from 0deg, transparent, rgba(6,182,212,0.1), transparent, rgba(124,58,237,0.08), transparent)', padding: '1px' }} />

            <div className="relative" style={{ background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(24px)', borderRadius: 'inherit', margin: '-24px', padding: '24px' }}>
                {/* Icon */}
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 12px -4px rgba(0,0,0,0.5)' }}>
                    <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                </div>

                <div className="text-sm font-bold mb-1 tracking-tight">{classroom.name}</div>
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-[11px] text-text-muted font-mono tracking-wide">{classroom.id}</span>
                    <button onClick={copyId} className="text-[10px] text-cyan hover:text-white transition-colors font-semibold">Copy</button>
                </div>

                <div className="flex gap-5">
                    {[
                        { v: classroom.students || 0, l: 'Students' },
                        { v: classroom.sessions || 0, l: 'Sessions' },
                        { v: classroom.lang, l: 'Language' },
                    ].map((s, i) => (
                        <div key={i}>
                            <div className="text-base font-extrabold text-cyan tabular-nums">{s.v}</div>
                            <div className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">{s.l}</div>
                        </div>
                    ))}
                </div>
            </div>
        </a>
    );
}

export default function ClassroomsPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user || user.role !== 'teacher') navigate('/auth');
    }, [user, navigate]);

    const storageKey = `synapse_classrooms_${user?.email?.replace(/[^a-z0-9]/gi, '_') || 'default'}`;
    const [classrooms, setClassrooms] = useState(() => JSON.parse(localStorage.getItem(storageKey) || '[]'));
    const [showModal, setShowModal] = useState(false);
    const [formName, setFormName] = useState('');
    const [formLang, setFormLang] = useState('python');
    const [formBatch, setFormBatch] = useState('');

    const genId = (n) => {
        const prefix = (n || 'CLASS').replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
        const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${new Date().getFullYear()}-${rand}`;
    };

    const createClassroom = () => {
        if (!formName.trim()) return;
        const id = genId(formName);
        const updated = [...classrooms, { id, name: formName.trim(), lang: formLang, batch: formBatch, students: 0, sessions: 0, createdAt: Date.now() }];
        localStorage.setItem(storageKey, JSON.stringify(updated));
        setClassrooms(updated);
        setShowModal(false);
        setFormName(''); setFormBatch('');
    };

    return (
        <div className="min-h-screen relative">
            <ParticleField />
            <AuroraBackground />

            {/* Topbar */}
            <header className="sticky top-0 z-30 flex items-center justify-between px-7 py-4 border-b border-white/[0.04]"
                style={{ background: 'rgba(5,5,12,0.45)', backdropFilter: 'blur(24px) saturate(120%)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-black"
                        style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)' }}>S</div>
                    <span className="text-sm font-bold tracking-tight">Synapse</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-text-muted">{user?.name || user?.email}</span>
                    <button onClick={logout} className="text-xs text-text-muted hover:text-white transition-colors bg-white/[0.03] border border-white/[0.06] px-3.5 py-1.5 rounded-lg font-semibold">Sign Out</button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-11 relative z-10">
                <div className="flex items-end justify-between mb-9">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight mb-1.5">My Classrooms</h1>
                        <p className="text-sm text-text-muted">Each classroom gets a unique ID students enter in VS Code.</p>
                    </div>
                    <button onClick={() => setShowModal(true)}
                        className="px-5 py-2.5 rounded-xl text-sm font-extrabold text-black transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] relative overflow-hidden group"
                        style={{ background: 'linear-gradient(180deg, #22D3EE, #06B6D4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 12px 32px -8px rgba(0,0,0,0.5)' }}>
                        {/* Rotating border animation */}
                        <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'conic-gradient(from var(--angle, 0deg), transparent, rgba(255,255,255,0.15), transparent)', animation: 'spin 3s linear infinite' }} />
                        <span className="relative">+ New Classroom</span>
                    </button>
                </div>

                {classrooms.length === 0 ? (
                    <div className="text-center py-24 animate-fade-in">
                        <svg className="w-14 h-14 mx-auto mb-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                        <h2 className="text-xl font-extrabold mb-2">No classrooms yet</h2>
                        <p className="text-sm text-text-muted mb-7">Create your first classroom and share the ID with your students.</p>
                        <button onClick={() => setShowModal(true)}
                            className="px-5 py-2.5 rounded-xl text-sm font-extrabold text-black hover:scale-[1.03] active:scale-[0.97] transition-all"
                            style={{ background: 'linear-gradient(180deg, #22D3EE, #06B6D4)' }}>
                            + Create your first classroom
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {classrooms.map((c, i) => <ClassCard key={c.id} classroom={c} index={i} />)}
                    </div>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }} onClick={() => setShowModal(false)}>
                    <div onClick={e => e.stopPropagation()}
                        className="rounded-2xl p-9 w-full max-w-md relative border border-white/[0.06] animate-slide-up"
                        style={{ background: 'rgba(8,8,16,0.85)', backdropFilter: 'blur(48px) saturate(140%)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 40px 80px -16px rgba(0,0,0,0.75)' }}>
                        <div className="absolute top-0 left-[14%] right-[14%] h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                        <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 w-7 h-7 rounded-md bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-text-muted hover:text-danger hover:border-danger/20 transition-all">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>

                        <h2 className="text-xl font-extrabold tracking-tight mb-1.5">Create Classroom</h2>
                        <p className="text-xs text-text-muted mb-7">Students enter this ID in the Synapse extension to join.</p>

                        <div className="mb-4">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Name</label>
                            <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Python Bootcamp Batch 12"
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan/40 focus:ring-2 focus:ring-cyan/10 transition-all placeholder:text-text-muted" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Language</label>
                            <select value={formLang} onChange={e => setFormLang(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan/40 transition-all">
                                <option value="python" className="bg-[#0a0a14]">Python</option>
                                <option value="javascript" className="bg-[#0a0a14]">JavaScript</option>
                                <option value="java" className="bg-[#0a0a14]">Java</option>
                            </select>
                        </div>
                        <div className="mb-5">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Batch</label>
                            <input type="text" value={formBatch} onChange={e => setFormBatch(e.target.value)} placeholder="e.g. Feb 2026"
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan/40 focus:ring-2 focus:ring-cyan/10 transition-all placeholder:text-text-muted" />
                        </div>

                        {formName.length > 2 && (
                            <div className="mb-5 rounded-xl p-4 bg-cyan/[0.03] border border-cyan/[0.12] animate-fade-in">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Classroom ID (auto)</div>
                                <div className="text-lg font-black text-cyan font-mono tracking-wide">{genId(formName)}</div>
                            </div>
                        )}

                        <button onClick={createClassroom}
                            className="w-full py-3 rounded-xl text-sm font-extrabold text-black hover:scale-[1.03] active:scale-[0.97] transition-all"
                            style={{ background: 'linear-gradient(180deg, #22D3EE, #06B6D4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 12px 32px -8px rgba(0,0,0,0.5)' }}>
                            Create Classroom
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
