import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import ParticleField from '../components/ParticleField';
import AuroraBackground from '../components/AuroraBackground';
import StepCard from '../components/StepCard';

export default function StudentPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [classroomId, setClassroomId] = useState('');
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!user) { navigate('/auth'); return; }
        const id = localStorage.getItem('synapse_classroom_id') || '';
        if (id) setClassroomId(id);
    }, [user, navigate]);

    const handleSave = () => {
        const id = classroomId.trim().toUpperCase();
        if (!id) return;
        setClassroomId(id);
        localStorage.setItem('synapse_classroom_id', id);
        setSaved(true);
        addToast('Classroom ID saved successfully!', 'success');
        setTimeout(() => setSaved(false), 2200);
    };

    const handleCopy = () => {
        const text = `"synapse.cohortId": "${classroomId || 'PYBOOT-2026-XK3F'}"`;
        navigator.clipboard.writeText(text).catch(() => { });
        setCopied(true);
        addToast('Copied to clipboard!', 'info');
        setTimeout(() => setCopied(false), 2000);
    };

    // Animated vertical connecting line
    const lineProgress = saved ? 100 : classroomId ? 50 : 25;

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
                <button onClick={() => { logout(); navigate('/auth'); }}
                    className="text-xs text-text-muted hover:text-white transition-colors bg-white/[0.03] border border-white/[0.06] px-3.5 py-1.5 rounded-lg font-semibold">
                    Sign Out
                </button>
            </header>

            <main className="max-w-xl mx-auto px-6 py-14 relative z-10">
                <h1 className="text-3xl font-black tracking-tight mb-1.5">
                    Welcome, <span className="text-cyan">{user?.name || 'Student'}</span>
                </h1>
                <p className="text-sm text-text-muted mb-12">Follow these 3 steps to connect to your classroom.</p>

                {/* Vertical connecting line */}
                <div className="relative">
                    <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-white/[0.04]">
                        <div className="w-full bg-cyan rounded-full transition-all duration-1000"
                            style={{ height: `${lineProgress}%`, transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }} />
                    </div>

                    <div className="space-y-4 ml-0">
                        <StepCard number={1} title="Install the Synapse VS Code Extension" delay={100}>
                            <p className="text-xs text-text-secondary leading-relaxed">
                                Open VS Code, go to Extensions (Ctrl+Shift+X), and search for <span className="text-white font-semibold">Synapse Debugging Intelligence</span>.
                            </p>
                        </StepCard>

                        <StepCard number={2} title="Enter Your Classroom ID" isHighlight delay={200}>
                            <p className="text-xs text-text-secondary leading-relaxed mb-3">
                                Ask your instructor for the classroom ID, then paste it below and in your VS Code settings.
                            </p>
                            <input
                                type="text"
                                value={classroomId}
                                onChange={e => setClassroomId(e.target.value)}
                                placeholder="e.g. PYBOOT-2026-XK3F"
                                className="w-full bg-black/25 border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none font-mono focus:border-cyan/40 focus:ring-2 focus:ring-cyan/10 transition-all placeholder:text-text-muted"
                                style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)' }}
                            />
                            <div className="flex items-center gap-3 mt-3">
                                <button onClick={handleSave}
                                    className="px-5 py-2 rounded-lg text-sm font-extrabold text-black hover:scale-[1.03] active:scale-[0.97] transition-all"
                                    style={{ background: 'linear-gradient(180deg, #22D3EE, #06B6D4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                                    Save ID
                                </button>
                                {saved && (
                                    <span className="text-xs font-bold text-success bg-success/[0.08] border border-success/[0.18] px-3 py-1 rounded-lg animate-fade-in">Saved</span>
                                )}
                            </div>
                        </StepCard>

                        <StepCard number={3} title="Paste the ID in VS Code Settings" delay={300}>
                            <p className="text-xs text-text-secondary leading-relaxed mb-3">
                                Open VS Code settings (Ctrl+,), search for <span className="text-white font-semibold">synapse.cohortId</span>, and paste your classroom ID.
                            </p>
                            <div className="flex items-center justify-between bg-black/25 border border-white/[0.06] rounded-lg px-3.5 py-2.5 font-mono text-sm text-cyan transition-all"
                                style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)', borderColor: copied ? 'rgba(34,197,94,0.4)' : undefined }}>
                                <span>"synapse.cohortId": "{classroomId || 'PYBOOT-2026-XK3F'}"</span>
                                <button onClick={handleCopy}
                                    className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all shrink-0 ml-2
                    ${copied ? 'bg-success/[0.12] text-success border-success/[0.25]' : 'bg-cyan/[0.08] text-cyan border-cyan/[0.18]'} border`}>
                                    {copied ? (
                                        <span className="flex items-center gap-1">
                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            Copied
                                        </span>
                                    ) : 'Copy'}
                                </button>
                            </div>
                        </StepCard>

                        <StepCard number="✓" title="You're all set" isComplete delay={400}>
                            <p className="text-xs text-text-secondary leading-relaxed">
                                Open any <span className="text-white font-semibold">.py</span> file in VS Code. Synapse will automatically track your debugging sessions and your instructor can see your progress.
                            </p>
                        </StepCard>
                    </div>
                </div>
            </main>
        </div>
    );
}
