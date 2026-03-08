import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParticleField from '../components/ParticleField';
import AuroraBackground from '../components/AuroraBackground';

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
        <div className="min-h-screen flex items-center justify-center relative">
            <ParticleField />
            <AuroraBackground />

            <div className="w-full max-w-[420px] mx-auto px-6 relative z-10 page-content">
                {/* Logo */}
                <div className="flex items-center gap-3 mb-6 justify-center">
                    <div className="w-12 h-12 flex items-center justify-center" style={{ background: '#E8FF47', borderRadius: '2px' }}>
                        <span className="text-xl font-black text-[#0D0D0D]">S</span>
                    </div>
                </div>

                {/* Headline */}
                <h1 className="text-center mb-1" style={{ fontFamily: 'var(--font-display)', fontSize: '72px', letterSpacing: '2px', lineHeight: 1 }}>
                    DEBUGGING INTELLIGENCE
                </h1>
                <p className="text-center text-[20px] text-text-secondary mb-3" style={{ fontFamily: 'var(--font-sans)' }}>
                    for Educators
                </p>
                <p className="text-center text-[14px] italic text-[#666] mb-10" style={{ fontFamily: 'var(--font-sans)' }}>
                    See exactly where students struggle — before they ask for help.
                </p>

                {/* Form Card */}
                <form
                    onSubmit={handleSubmit}
                    className="p-10 relative"
                    style={{
                        background: '#1A1A1A',
                        border: '1px solid #2A2A2A',
                        borderRadius: '2px',
                    }}
                >
                    {/* Tabs */}
                    <div className="flex gap-6 mb-6 border-b border-[#2A2A2A] pb-3">
                        {['signin', 'signup'].map(m => (
                            <button key={m} type="button" onClick={() => { setMode(m); setError(''); }}
                                className="pb-2 text-[13px] font-medium transition-all duration-150"
                                style={{
                                    fontFamily: 'var(--font-sans)',
                                    color: mode === m ? '#E8FF47' : '#666',
                                    borderBottom: mode === m ? '2px solid #E8FF47' : '2px solid transparent',
                                    marginBottom: '-13px',
                                }}>
                                {m === 'signin' ? 'Sign In' : 'Sign Up'}
                            </button>
                        ))}
                    </div>

                    {/* Demo chips */}
                    <div className="flex gap-2 mb-5">
                        {[{ r: 'teacher', l: 'Demo Teacher' }, { r: 'student', l: 'Demo Student' }].map(d => (
                            <button key={d.r} type="button" onClick={() => fillDemo(d.r)}
                                className="flex-1 py-2 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all duration-150"
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #2A2A2A',
                                    borderRadius: '2px',
                                    color: '#888',
                                    fontFamily: 'var(--font-sans)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8FF47'; e.currentTarget.style.color = '#E8FF47'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.color = '#888'; }}
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                {d.l}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="text-xs bg-[#EF444418] border border-[#EF444430] px-3 py-2 mb-4" style={{ borderRadius: '2px', color: '#EF4444' }}>{error}</div>
                    )}

                    {mode === 'signup' && (
                        <div className="mb-4">
                            <label className="block text-[10px] font-medium uppercase mb-1.5" style={{ letterSpacing: '3px', color: '#666', fontFamily: 'var(--font-sans)' }}>Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                                className="w-full px-3.5 py-2.5 text-sm outline-none transition-all"
                                style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '2px', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}
                                onFocus={e => e.target.style.borderColor = '#E8FF47'}
                                onBlur={e => e.target.style.borderColor = '#2A2A2A'}
                            />
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-[10px] font-medium uppercase mb-1.5" style={{ letterSpacing: '3px', color: '#666', fontFamily: 'var(--font-sans)' }}>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@university.edu"
                            className="w-full px-3.5 py-2.5 text-sm outline-none transition-all"
                            style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '2px', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}
                            onFocus={e => e.target.style.borderColor = '#E8FF47'}
                            onBlur={e => e.target.style.borderColor = '#2A2A2A'}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-[10px] font-medium uppercase mb-1.5" style={{ letterSpacing: '3px', color: '#666', fontFamily: 'var(--font-sans)' }}>Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password"
                            className="w-full px-3.5 py-2.5 text-sm outline-none transition-all"
                            style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '2px', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}
                            onFocus={e => e.target.style.borderColor = '#E8FF47'}
                            onBlur={e => e.target.style.borderColor = '#2A2A2A'}
                        />
                    </div>

                    {mode === 'signup' && (
                        <div className="mb-5">
                            <label className="block text-[10px] font-medium uppercase mb-1.5" style={{ letterSpacing: '3px', color: '#666', fontFamily: 'var(--font-sans)' }}>Role</label>
                            <select value={role} onChange={e => setRole(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm outline-none transition-all"
                                style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '2px', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}>
                                <option value="teacher" style={{ background: '#0D0D0D' }}>Instructor</option>
                                <option value="student" style={{ background: '#0D0D0D' }}>Student</option>
                            </select>
                        </div>
                    )}

                    <button type="submit" disabled={loading}
                        className="w-full py-3 text-[14px] font-semibold transition-all duration-150 disabled:opacity-70"
                        style={{
                            background: loading ? '#D4EB3A' : '#E8FF47',
                            color: '#0D0D0D',
                            borderRadius: '2px',
                            height: '48px',
                            letterSpacing: '1px',
                            fontFamily: 'var(--font-sans)',
                            border: 'none',
                        }}>
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-[#0D0D0D]/30 border-t-[#0D0D0D] rounded-full animate-spin mx-auto" />
                        ) : (
                            mode === 'signin' ? 'Sign In' : 'Create Account'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
