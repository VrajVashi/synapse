import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParticleField from '../components/ParticleField';
import AuroraBackground from '../components/AuroraBackground';

const features = [
    'Real-time debugging intelligence for every student',
    'AI-powered struggle heatmaps and curriculum insights',
    'Automated at-risk detection before students fall behind',
];

function TypewriterText({ text, delay = 0 }) {
    const [displayed, setDisplayed] = useState('');
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setStarted(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    useEffect(() => {
        if (!started) return;
        let i = 0;
        const interval = setInterval(() => {
            setDisplayed(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(interval);
        }, 30);
        return () => clearInterval(interval);
    }, [text, started]);

    return (
        <span>
            {displayed}
            {displayed.length < text.length && started && (
                <span className="border-r-2 border-cyan ml-0.5" style={{ animation: 'typewriter-cursor 1s step-end infinite' }}>&nbsp;</span>
            )}
        </span>
    );
}

export default function AuthPage() {
    const { login, signup, getDemoCredentials, user } = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('teacher');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) navigate(user.role === 'teacher' ? '/classrooms' : '/student');
    }, [user, navigate]);

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
        <div className="min-h-screen flex relative">
            <ParticleField />
            <AuroraBackground />

            {/* Left — Branding */}
            <div className="hidden lg:flex flex-1 flex-col justify-center px-16 relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-black"
                        style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 24px -6px rgba(0,0,0,0.5)' }}>
                        S
                    </div>
                    <span className="text-2xl font-black tracking-tight">Synapse</span>
                </div>

                <h1 className="text-4xl font-black tracking-tight leading-tight mb-4">
                    Debugging Intelligence<br />
                    <span className="text-cyan">for Educators</span>
                </h1>
                <p className="text-text-secondary text-sm mb-10 max-w-md leading-relaxed">
                    See exactly where your students struggle, before they ask for help.
                </p>

                <div className="space-y-4">
                    {features.map((f, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                            <svg className="w-4 h-4 text-cyan mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                            <TypewriterText text={f} delay={800 + i * 1500} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Right — Form */}
            <div className="flex-1 flex items-center justify-center px-6 relative z-10">
                <div className="w-full max-w-sm">
                    <form
                        onSubmit={handleSubmit}
                        className="rounded-2xl p-8 border border-white/[0.06] relative overflow-hidden"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            backdropFilter: 'blur(32px) saturate(130%)',
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.03), 0 40px 80px -16px rgba(0,0,0,0.7)',
                        }}
                    >
                        <div className="absolute top-0 left-[14%] right-[14%] h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

                        {/* Mobile logo */}
                        <div className="flex items-center gap-2.5 mb-6 lg:hidden">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-black"
                                style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)' }}>S</div>
                            <span className="text-lg font-bold tracking-tight">Synapse</span>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 mb-6">
                            {['signin', 'signup'].map(m => (
                                <button key={m} type="button" onClick={() => { setMode(m); setError(''); }}
                                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                    ${mode === m ? 'bg-cyan/[0.08] text-cyan border border-cyan/[0.18]' : 'bg-white/[0.03] text-text-muted border border-white/[0.04] hover:text-text-secondary'}`}>
                                    {m === 'signin' ? 'Sign In' : 'Sign Up'}
                                </button>
                            ))}
                        </div>

                        {/* Demo chips */}
                        <div className="flex gap-2 mb-5">
                            {[{ r: 'teacher', l: 'Demo Teacher' }, { r: 'student', l: 'Demo Student' }].map(d => (
                                <button key={d.r} type="button" onClick={() => fillDemo(d.r)}
                                    className="flex-1 py-2 rounded-lg text-[11px] font-semibold bg-white/[0.02] border border-white/[0.06] text-text-muted hover:bg-cyan/[0.06] hover:border-cyan/[0.16] hover:text-cyan transition-all duration-200 flex items-center justify-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    {d.l}
                                </button>
                            ))}
                        </div>

                        {error && (
                            <div className="text-xs text-danger bg-danger/[0.08] border border-danger/[0.16] rounded-lg px-3 py-2 mb-4">{error}</div>
                        )}

                        {mode === 'signup' && (
                            <div className="mb-4">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Name</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan/40 focus:ring-2 focus:ring-cyan/10 transition-all placeholder:text-text-muted"
                                    style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)' }} />
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@university.edu"
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan/40 focus:ring-2 focus:ring-cyan/10 transition-all placeholder:text-text-muted"
                                style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)' }} />
                        </div>

                        <div className="mb-4">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password"
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan/40 focus:ring-2 focus:ring-cyan/10 transition-all placeholder:text-text-muted"
                                style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)' }} />
                        </div>

                        {mode === 'signup' && (
                            <div className="mb-5">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Role</label>
                                <select value={role} onChange={e => setRole(e.target.value)}
                                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan/40 transition-all"
                                    style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)' }}>
                                    <option value="teacher" className="bg-[#0a0a14]">Instructor</option>
                                    <option value="student" className="bg-[#0a0a14]">Student</option>
                                </select>
                            </div>
                        )}

                        <button type="submit" disabled={loading}
                            className="w-full py-3 rounded-xl text-sm font-extrabold text-black transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-70 relative overflow-hidden"
                            style={{
                                background: loading ? '#0891B2' : 'linear-gradient(180deg, #22D3EE, #06B6D4)',
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 24px 48px -12px rgba(0,0,0,0.5)',
                            }}>
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mx-auto" />
                            ) : (
                                mode === 'signin' ? 'Sign In' : 'Create Account'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
