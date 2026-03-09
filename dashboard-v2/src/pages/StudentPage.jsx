import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { API } from '../api';
import ParticleField from '../components/ParticleField';
import AuroraBackground from '../components/AuroraBackground';
import { staggerContainer, ease, prefersReducedMotion } from '../lib/animations';

const shouldAnimate = !prefersReducedMotion;
const stepsStagger = staggerContainer(0.12, 0.4);

function StepItem({ number, title, children, status = 'upcoming', delay = 0, index = 0 }) {
    const borderColor = status === 'completed' ? '#4ADE80' : status === 'active' ? '#E8FF47' : '#222';
    const badgeColor = status === 'completed' ? '#4ADE80' : '#E8FF47';
    const icon = status === 'completed' ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
    ) : (
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#0D0D0D' }}>{number}</span>
    );

    return (
        <motion.div
            className="transition-colors duration-150"
            style={{
                background: '#1A1A1A',
                border: '1px solid #2A2A2A',
                borderLeft: `3px solid ${borderColor}`,
                borderRadius: '2px',
                padding: '24px',
            }}
            variants={{ hidden: { opacity: 0, x: -32 }, show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.19, 1, 0.22, 1] } } }}
            onMouseEnter={e => {
                if (status !== 'completed') e.currentTarget.style.borderLeftColor = '#E8FF47';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderLeftColor = borderColor;
            }}
        >
            <div className="flex gap-4 items-start">
                {/* Step badge — pops in with spring after card arrives */}
                <motion.div
                    className="shrink-0 flex items-center justify-center"
                    style={{ width: '32px', height: '32px', background: badgeColor, borderRadius: '2px' }}
                    initial={shouldAnimate ? { scale: 0, rotate: -10 } : false}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ ...ease.spring, delay: index * 0.12 + 0.5 }}
                >
                    {icon}
                </motion.div>
                <div className="flex-1 min-w-0">
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: '#F5F5F5', marginBottom: '6px' }}>{title}</div>
                    {children}
                </div>
            </div>
        </motion.div>
    );
}

export default function StudentPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [classroomId, setClassroomId] = useState('');
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!user) { navigate('/auth'); return; }
        // Load previously joined classroom from user profile (DynamoDB)
        if (user.classroomId) setClassroomId(user.classroomId);
    }, [user, navigate]);

    const handleSave = async () => {
        const id = classroomId.trim().toUpperCase();
        if (!id) return;
        setClassroomId(id);

        // Register in backend — this writes classroomId onto the user's DynamoDB profile
        const studentId = user?.email || user?.name || 'anonymous';
        const studentName = user?.name || user?.email || 'Student';
        await API.joinClassroom(id, studentId, studentName).catch(() => { });

        setSaved(true);
        addToast('Classroom ID saved & registered!', 'success');
        setTimeout(() => setSaved(false), 2200);
    };

    const handleCopy = () => {
        const text = `"synapse.cohortId": "${classroomId || 'PYBOOT-2026-XK3F'}"`;
        navigator.clipboard.writeText(text).catch(() => { });
        setCopied(true);
        addToast('Copied to clipboard!', 'info');
        setTimeout(() => setCopied(false), 2000);
    };

    // Step statuses
    const step1Status = 'completed'; // assume extension is installed
    const step2Status = saved ? 'completed' : 'active';
    const step3Status = saved ? 'active' : 'upcoming';

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
                <button onClick={() => { logout(); navigate('/auth'); }}
                    className="text-xs font-medium px-3.5 py-1.5 transition-all duration-150"
                    style={{ border: '1px solid #2A2A2A', borderRadius: '2px', background: 'transparent', color: '#666', fontFamily: 'var(--font-sans)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8FF47'; e.currentTarget.style.color = '#E8FF47'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.color = '#666'; }}>
                    Sign Out
                </button>
            </header>

            <main className="relative z-10 page-content" style={{ maxWidth: '640px', margin: '0 auto', padding: '56px 24px' }}>
                {/* WELCOME headline — clipReveal */}
                <div style={{ overflow: 'hidden' }}>
                    <motion.h1
                        className="mb-1.5"
                        style={{ fontFamily: 'var(--font-display)', fontSize: '42px', letterSpacing: '2px', lineHeight: 1, color: '#F5F5F5' }}
                        initial={shouldAnimate ? { clipPath: 'inset(0 100% 0 0)' } : false}
                        animate={{ clipPath: 'inset(0 0% 0 0)' }}
                        transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
                    >
                        WELCOME, <span style={{ color: '#E8FF47' }}>{(user?.name || 'Student').toUpperCase()}</span>
                    </motion.h1>
                </div>
                <motion.p
                    className="mb-12"
                    style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#555' }}
                    initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
                >Follow these 3 steps to connect to your classroom.</motion.p>

                {/* Timeline connector */}
                <div className="relative">
                    <div className="absolute" style={{ left: '15px', top: '32px', bottom: '32px', borderLeft: '2px solid #2A2A2A', zIndex: 0 }}>
                        {/* Animated fill */}
                        <div style={{
                            width: '2px', marginLeft: '-2px',
                            height: saved ? '100%' : classroomId ? '50%' : '25%',
                            background: '#E8FF47',
                            transition: 'height 1s cubic-bezier(0.22,1,0.36,1)',
                        }} />
                    </div>

                    <motion.div
                        className="space-y-4 relative"
                        style={{ zIndex: 1 }}
                        variants={stepsStagger}
                        initial={shouldAnimate ? 'hidden' : false}
                        animate="show"
                    >
                        <StepItem number={1} title="Install the Synapse VS Code Extension" status={step1Status} index={0}>
                            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
                                Open VS Code, go to Extensions (Ctrl+Shift+X), and search for <span style={{ color: '#F5F5F5', fontWeight: 500 }}>Synapse Debugging Intelligence</span>.
                            </p>
                        </StepItem>

                        <StepItem number={2} title="Enter Your Classroom ID" status={step2Status} index={1}>
                            <p className="mb-3" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
                                Ask your instructor for the classroom ID, then paste it below and in your VS Code settings.
                            </p>
                            <input
                                type="text"
                                value={classroomId}
                                onChange={e => setClassroomId(e.target.value)}
                                placeholder="e.g. PYBOOT-2026-XK3F"
                                className="w-full px-3.5 py-2.5 text-sm outline-none font-mono transition-all"
                                style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '2px', color: '#F5F5F5' }}
                                onFocus={e => e.target.style.borderColor = '#E8FF47'}
                                onBlur={e => e.target.style.borderColor = '#2A2A2A'}
                            />
                            <div className="flex items-center gap-3 mt-3">
                                <motion.button
                                    onClick={handleSave}
                                    className="px-5 py-2 text-sm font-semibold"
                                    style={{ background: '#E8FF47', color: '#0D0D0D', borderRadius: '2px', border: 'none', fontWeight: 600, willChange: 'transform' }}
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    transition={ease.spring}
                                >
                                    Save ID
                                </motion.button>
                                {saved && (
                                    <motion.span
                                        style={{
                                            fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-sans)',
                                            letterSpacing: '1px', textTransform: 'uppercase',
                                            padding: '3px 8px', borderRadius: '2px',
                                            background: 'rgba(74,222,128,0.12)', color: '#4ADE80',
                                            border: '1px solid rgba(74,222,128,0.25)',
                                        }}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.25, ease: [0.19, 1, 0.22, 1] }}
                                    >
                                        Saved
                                    </motion.span>
                                )}
                            </div>
                        </StepItem>

                        <StepItem number={3} title="Paste the ID in VS Code Settings" status={step3Status} index={2}>
                            <p className="mb-3" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
                                Open VS Code settings (Ctrl+,), search for <span style={{ color: '#F5F5F5', fontWeight: 500 }}>synapse.cohortId</span>, and paste your classroom ID.
                            </p>
                            <motion.div
                                className="flex items-center justify-between"
                                style={{
                                    background: '#0D0D0D',
                                    border: `1px solid ${copied ? 'rgba(74,222,128,0.4)' : '#222'}`,
                                    borderRadius: '2px',
                                    padding: '12px 16px',
                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                    fontSize: '12px',
                                    color: '#E8FF47',
                                    transition: 'border-color 0.15s',
                                }}
                                initial={shouldAnimate ? { opacity: 0 } : false}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.9, duration: 0.4 }}
                            >
                                <span>"synapse.cohortId": "{classroomId || 'PYBOOT-2026-XK3F'}"</span>
                                <button onClick={handleCopy}
                                    className="shrink-0 ml-3 transition-all"
                                    style={{
                                        fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-sans)',
                                        letterSpacing: '1px', textTransform: 'uppercase',
                                        padding: '3px 8px', borderRadius: '2px',
                                        background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(232,255,71,0.08)',
                                        color: copied ? '#4ADE80' : '#E8FF47',
                                        border: copied ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(232,255,71,0.18)',
                                    }}>
                                    {copied ? '✓ Copied' : 'Copy'}
                                </button>
                            </motion.div>
                        </StepItem>

                        <StepItem number="✓" title="You're all set" status={saved ? 'completed' : 'upcoming'} index={3}>
                            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
                                Open any <span style={{ color: '#F5F5F5', fontWeight: 500 }}>.py</span> file in VS Code. Synapse will automatically track your debugging sessions and your instructor can see your progress.
                            </p>
                        </StepItem>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
