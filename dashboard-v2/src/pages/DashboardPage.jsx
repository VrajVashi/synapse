import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import NavSidebar from '../components/NavSidebar';
import StatCard from '../components/StatCard';
import StruggleRow from '../components/StruggleRow';
import StudentRow from '../components/StudentRow';
import { staggerContainer, fadeUp, prefersReducedMotion } from '../lib/animations';

const shouldAnimate = !prefersReducedMotion;
const rowsStagger = staggerContainer(0.1, 0.25);
const cardsStagger = staggerContainer(0.09, 0.2);
const homeworkStagger = staggerContainer(0.1, 0.3);
const curriculumStagger = staggerContainer(0.1, 0.25);

// Floating pill shapes (HeroGeometric aesthetic)
function ElegantShape({ className, style }) {
    return (
        <motion.div
            className={className}
            style={{
                borderRadius: '9999px',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(4px)',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                ...style,
            }}
            animate={{ y: [0, -18, 0], rotate: [0, 2, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
    );
}

// Frosted card wrapper
function FrostedCard({ children, className = '', style = {} }) {
    return (
        <div
            className={className}
            style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '20px',
                backdropFilter: 'blur(12px)',
                ...style,
            }}
        >
            {children}
        </div>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [activeView, setActiveView] = useState(searchParams.get('view') || 'overview');
    const classroomId = searchParams.get('classroomId') || 'default';
    const [data, setData] = useState(null);
    const [secondsAgo, setSecondsAgo] = useState(0);
    const pollRef = useRef(null);
    const tickRef = useRef(null);

    // Homework state
    const [hwModal, setHwModal] = useState(false);
    const [hwTitle, setHwTitle] = useState('');
    const [hwBody, setHwBody] = useState('');
    const [hwDue, setHwDue] = useState('');

    const fetchAll = useCallback(async () => {
        const [cohort, stats, heatmap, atRisk, mastery, curriculum, homework] = await Promise.all([
            API.getCohortInfo(), API.getWeeklyStats(), API.getHeatmap(), API.getAtRisk(), API.getMastery(), API.getCurriculum(), API.getHomework(classroomId),
        ]);
        setData({ cohort, stats, heatmap, atRisk, mastery, curriculum, homework });
        setSecondsAgo(0);
    }, []);

    useEffect(() => {
        if (!user || user.role !== 'teacher') { navigate('/auth'); return; }
        fetchAll();
        pollRef.current = setInterval(fetchAll, 10000);
        tickRef.current = setInterval(() => setSecondsAgo(s => s + 1), 1000);
        return () => { clearInterval(pollRef.current); clearInterval(tickRef.current); };
    }, [user, navigate, fetchAll]);

    const handleViewChange = (v) => setActiveView(v);

    const createHw = async () => {
        if (!hwTitle.trim() || !hwBody.trim()) return;
        await API.createHomework({ classroomId, title: hwTitle, body: hwBody, dueDate: hwDue });
        const hw = await API.getHomework(classroomId);
        setData(d => ({ ...d, homework: hw }));
        setHwModal(false); setHwTitle(''); setHwBody(''); setHwDue('');
    };

    const closeHw = async (id) => {
        await API.closeHomework(id);
        const hw = await API.getHomework(classroomId);
        setData(d => ({ ...d, homework: hw }));
    };

    if (!data) return (
        <div className="h-screen flex items-center justify-center" style={{ background: '#030303' }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{ borderColor: 'rgba(99,102,241,0.2)', borderTopColor: '#818cf8' }} />
        </div>
    );

    const { cohort, stats, heatmap, atRisk, mastery, curriculum, homework } = data;

    const hwBarColor = (pct) => pct > 60 ? 'linear-gradient(to right, #a5b4fc, #818cf8)' : pct > 30 ? 'linear-gradient(to right, #fbbf24, #f59e0b)' : 'linear-gradient(to right, #fb7185, #f43f5e)';
    const masteryColor = (s) => s >= 80 ? '#4ade80' : s >= 60 ? '#a5b4fc' : s >= 40 ? '#fbbf24' : '#fb7185';
    const curTypeLabel = { gap: 'Reinforcement Gap', missing: 'Missing Prerequisite', ok: 'On Track' };
    const curBorder = { gap: 'rgba(251,113,133,0.5)', missing: 'rgba(251,113,133,0.5)', ok: 'rgba(74,222,128,0.4)' };
    const curBadge = { gap: '#fb7185', missing: '#fb7185', ok: '#4ade80' };

    const viewTitles = {
        overview: 'OVERVIEW',
        heatmap: 'STRUGGLE HEATMAP',
        students: 'AT-RISK STUDENTS',
        mastery: 'MASTERY TRACKING',
        curriculum: 'CURRICULUM INSIGHTS',
        homework: 'HOMEWORK',
    };

    return (
        <div className="min-h-screen flex relative" style={{ background: '#030303' }}>
            {/* Floating background shapes */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
                <ElegantShape
                    style={{
                        position: 'absolute',
                        width: '400px', height: '100px',
                        top: '10%', right: '10%',
                        transform: 'rotate(-15deg)',
                        opacity: 0.25,
                    }}
                />
                <ElegantShape
                    style={{
                        position: 'absolute',
                        width: '300px', height: '80px',
                        bottom: '20%', right: '20%',
                        transform: 'rotate(10deg)',
                        opacity: 0.2,
                    }}
                />
                <ElegantShape
                    style={{
                        position: 'absolute',
                        width: '200px', height: '60px',
                        top: '50%', left: '30%',
                        transform: 'rotate(-5deg)',
                        opacity: 0.15,
                    }}
                />
            </div>

            {/* Ambient gradients */}
            <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
                <div style={{
                    position: 'absolute',
                    top: '10%', right: '15%',
                    width: '500px', height: '500px',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '15%', left: '30%',
                    width: '400px', height: '400px',
                    background: 'radial-gradient(circle, rgba(251,113,133,0.04) 0%, transparent 70%)',
                }} />
            </div>

            <NavSidebar activeView={activeView} onViewChange={handleViewChange} />

            <main className="ml-56 flex-1 flex flex-col min-h-screen relative" style={{ zIndex: 10 }}>
                {/* Topbar */}
                <header
                    className="flex items-center justify-between px-7 py-4 shrink-0"
                    style={{
                        background: 'rgba(3,3,3,0.8)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <a
                                href="/classrooms"
                                className="flex items-center gap-1 transition-colors duration-150"
                                style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-sans)', textDecoration: 'none' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
                                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                                Classrooms
                            </a>
                        </div>
                        <h1 style={{
                            fontFamily: "'Syne', sans-serif",
                            fontSize: '32px',
                            fontWeight: 800,
                            letterSpacing: '2px',
                            lineHeight: 1,
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>
                            {viewTitles[activeView] || activeView.toUpperCase()}
                        </h1>
                        <p className="mt-1" style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>
                            {cohort.name}
                            <span style={{ color: 'rgba(165,180,252,0.6)', margin: '0 6px' }}>·</span>
                            Week {cohort.week}
                        </p>
                    </div>

                    <div className="flex items-center gap-0">
                        {/* Active today chip */}
                        <div className="text-right pr-5">
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>Active today</div>
                            <div className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '32px', color: '#a5b4fc', lineHeight: 1 }}>{cohort.activeToday}</div>
                        </div>

                        <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.08)', margin: '0 20px' }} />

                        {/* Total students chip */}
                        <div className="text-right pr-5">
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>Total students</div>
                            <div className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '32px', color: 'rgba(255,255,255,0.85)', lineHeight: 1 }}>{cohort.totalStudents}</div>
                        </div>

                        <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.08)', margin: '0 20px' }} />

                        {/* LIVE indicator */}
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.6)', animation: 'pulse-glow 2s infinite' }} />
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(74,222,128,0.7)', fontWeight: 600 }}>LIVE</span>
                            </div>
                            <div className="tabular-nums mt-0.5" style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                                {secondsAgo < 2 ? 'Just now' : `${secondsAgo}s ago`}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-7 page-content">

                    {/* ── OVERVIEW ─── */}
                    {activeView === 'overview' && (
                        <>
                            <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: '2fr 1fr 1fr 1.5fr' }}>
                                <StatCard label="Total Debug Sessions" value={stats.totalSessions} delta={`${stats.improvementVsLastWeek} vs last week`} deltaType="positive" sparkData={[12, 18, 14, 22, 19, 27, 24]} delay={0} />
                                <StatCard label="Avg Fix Time" value={parseFloat(stats.avgFixTime)} unit="min" delta="cohort average" sparkData={[18, 15, 17, 13, 16, 14, 13]} delay={80} />
                                <StatCard label="Quiz Completion Rate" value={stats.quizCompletionRate} unit="%" delta="" sparkData={[30, 35, 38, 42, 40, 45, 47]} delay={160} />
                                <StatCard label="At-Risk Students" value={atRisk.length} warn={true} delta="require intervention" deltaType="warn" sparkData={[6, 5, 7, 4, 5, 4, 4]} delay={240} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FrostedCard style={{ padding: '24px' }}>
                                    <div className="flex justify-between items-start mb-5">
                                        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 700, letterSpacing: '2px', color: 'rgba(255,255,255,0.85)' }}>
                                            TOP STRUGGLES THIS WEEK
                                        </h3>
                                        <button
                                            onClick={() => setActiveView('heatmap')}
                                            className="transition-colors duration-150"
                                            style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'rgba(165,180,252,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
                                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(165,180,252,0.7)'}
                                        >
                                            See all
                                        </button>
                                    </div>
                                    <div className="flex flex-col">
                                        {heatmap.slice(0, 3).map((row, i) => (
                                            <StruggleRow key={i} row={row} delay={i * 100} />
                                        ))}
                                    </div>
                                </FrostedCard>

                                <FrostedCard style={{ padding: '24px' }}>
                                    <div className="flex justify-between items-start mb-5">
                                        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 700, letterSpacing: '2px', color: 'rgba(255,255,255,0.85)' }}>
                                            STUDENTS NEEDING ATTENTION
                                        </h3>
                                        <button
                                            onClick={() => setActiveView('students')}
                                            className="transition-colors duration-150"
                                            style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'rgba(165,180,252,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#a5b4fc'}
                                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(165,180,252,0.7)'}
                                        >
                                            See all
                                        </button>
                                    </div>
                                    <div className="flex flex-col">
                                        {atRisk.slice(0, 3).map((s, i) => (
                                            <StudentRow key={i} student={s} delay={i * 100} />
                                        ))}
                                    </div>
                                </FrostedCard>
                            </div>
                        </>
                    )}

                    {/* ── HEATMAP ─── */}
                    {activeView === 'heatmap' && (
                        <FrostedCard style={{ padding: '24px' }}>
                            {/* Column headers */}
                            <motion.div
                                className="grid items-center gap-4 pb-3 mb-2"
                                style={{ gridTemplateColumns: '200px 1fr 80px 80px 90px 90px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                                initial={shouldAnimate ? { opacity: 0 } : false}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.3 }}
                            >
                                {['Concept', 'Severity', 'Attempts', 'Crash Rate', 'Avg Fix', 'Quiz Rate'].map(h => (
                                    <span key={h} style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>{h}</span>
                                ))}
                            </motion.div>
                            <motion.div variants={rowsStagger} initial={shouldAnimate ? 'hidden' : false} animate="show">
                                {heatmap.map((row, i) => {
                                    const rankColors = ['#fb7185', '#f97316', '#fbbf24', '#a5b4fc', '#a5b4fc'];
                                    const crashColor = row.pct > 50 ? '#fb7185' : row.pct > 30 ? '#fbbf24' : '#4ade80';
                                    return (
                                        <motion.div key={i}
                                            className="grid items-center gap-4 py-5 px-2"
                                            style={{
                                                gridTemplateColumns: '200px 1fr 80px 80px 90px 90px',
                                                borderBottom: i < heatmap.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                                willChange: 'transform',
                                            }}
                                            variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] } } }}
                                            whileHover={{ x: 4, background: 'rgba(165,180,252,0.03)' }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span data-rank className="tabular-nums w-8" style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'rgba(255,255,255,0.1)', transition: 'color 0.12s ease' }}>{i + 1}</span>
                                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{row.errorType}</span>
                                            </div>
                                            <div className="overflow-hidden" style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                                                <div className="h-full" style={{ width: `${row.pct}%`, background: rankColors[Math.min(i, 4)], transition: 'width 1s cubic-bezier(0.22,1,0.36,1)', borderRadius: '2px', opacity: 0.8 }} />
                                            </div>
                                            <span className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'rgba(255,255,255,0.85)' }}>{row.attempts.toLocaleString()}</span>
                                            <span className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: crashColor }}>{row.pct}%</span>
                                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{row.avgFixMin} min</span>
                                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{row.quizCompletion}%</span>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </FrostedCard>
                    )}

                    {/* ── STUDENTS ─── */}
                    {activeView === 'students' && (
                        <FrostedCard style={{ padding: '24px' }}>
                            <motion.div
                                className="flex flex-col"
                                variants={cardsStagger}
                                initial={shouldAnimate ? 'hidden' : false}
                                animate="show"
                            >
                                {atRisk.map((s, i) => (
                                    <StudentRow key={i} student={s} delay={i * 80} />
                                ))}
                            </motion.div>
                        </FrostedCard>
                    )}

                    {/* ── MASTERY ─── */}
                    {activeView === 'mastery' && (
                        <FrostedCard style={{ padding: '32px' }}>
                            <motion.div
                                className="space-y-0"
                                variants={rowsStagger}
                                initial={shouldAnimate ? 'hidden' : false}
                                animate="show"
                            >
                                {mastery.map((m, i) => {
                                    const mColor = masteryColor(m.mastery);
                                    const exceeded = m.mastery >= m.target;
                                    const tickColor = exceeded ? '#4ade80' : 'rgba(255,255,255,0.2)';
                                    return (
                                        <motion.div key={i}
                                            className="grid items-center gap-5 py-4"
                                            style={{
                                                gridTemplateColumns: '180px 1fr 80px',
                                                borderBottom: i < mastery.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                            }}
                                            variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] } } }}
                                        >
                                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>{m.concept}</span>
                                            <div className="relative" style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}>
                                                <div className="absolute" style={{ left: `${m.target}%`, top: '-10px', transform: 'translateX(-50%)' }}>
                                                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '8px', letterSpacing: '1px', color: tickColor, textTransform: 'uppercase', textAlign: 'center', marginBottom: '2px' }}>TARGET</div>
                                                    <div style={{ width: '1px', height: '14px', background: tickColor, margin: '0 auto', transition: 'background 0.3s' }} />
                                                </div>
                                                <div className="h-full" style={{ width: `${m.mastery}%`, background: mColor, transition: 'width 1.2s cubic-bezier(0.22,1,0.36,1)', borderRadius: '3px', opacity: 0.85 }} />
                                            </div>
                                            <span className="text-right tabular-nums">
                                                <span style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: mColor }}>{m.mastery}%</span>
                                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}> / {m.target}%</span>
                                            </span>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </FrostedCard>
                    )}

                    {/* ── CURRICULUM ─── */}
                    {activeView === 'curriculum' && (
                        <FrostedCard style={{ padding: '24px' }}>
                            <motion.div
                                className="space-y-3"
                                variants={curriculumStagger}
                                initial={shouldAnimate ? 'hidden' : false}
                                animate="show"
                            >
                                {curriculum.map((item, i) => {
                                    const bColor = curBorder[item.type] || 'rgba(251,191,36,0.4)';
                                    const badgeColor = curBadge[item.type] || '#fbbf24';
                                    return (
                                        <motion.div key={i}
                                            className="p-5 transition-all duration-200"
                                            style={{
                                                background: 'rgba(255,255,255,0.02)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                borderLeft: `2px solid ${bColor}`,
                                                borderRadius: '12px',
                                            }}
                                            variants={fadeUp}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{item.concept}</span>
                                                <span style={{
                                                    fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-sans)',
                                                    letterSpacing: '1px', textTransform: 'uppercase',
                                                    padding: '3px 8px', borderRadius: '6px',
                                                    background: `${badgeColor}18`,
                                                    color: badgeColor,
                                                    border: `1px solid ${badgeColor}30`,
                                                }}>
                                                    {curTypeLabel[item.type]}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mb-3" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                                                <div>Taught: <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{item.taught}</span></div>
                                                <div>Peak Struggle: <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{item.peakStruggle}</span></div>
                                            </div>
                                            <div style={{
                                                fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'rgba(255,255,255,0.4)',
                                                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px',
                                                padding: '12px 16px', fontStyle: 'italic', lineHeight: '1.6',
                                            }}>{item.recommendation}</div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </FrostedCard>
                    )}

                    {/* ── HOMEWORK ─── */}
                    {activeView === 'homework' && (
                        <FrostedCard style={{ padding: '24px' }}>
                            <div className="flex justify-between items-start mb-5">
                                <div>
                                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 700, letterSpacing: '2px', color: 'rgba(255,255,255,0.85)' }}>HOMEWORK QUESTIONS</h3>
                                    <p className="mt-1" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Students see these in VS Code sidebar</p>
                                </div>
                                <button
                                    onClick={() => setHwModal(true)}
                                    className="px-4 py-2 text-xs font-medium transition-all duration-150"
                                    style={{
                                        border: '1px solid rgba(165,180,252,0.3)',
                                        color: '#a5b4fc',
                                        background: 'rgba(165,180,252,0.06)',
                                        borderRadius: '10px',
                                        fontFamily: 'var(--font-sans)',
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(165,180,252,0.12)'; e.currentTarget.style.borderColor = 'rgba(165,180,252,0.5)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(165,180,252,0.06)'; e.currentTarget.style.borderColor = 'rgba(165,180,252,0.3)'; }}
                                >
                                    + New Question
                                </button>
                            </div>

                            {homework.length === 0 ? (
                                <div className="text-center py-16">
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '100px', color: 'rgba(255,255,255,0.04)', lineHeight: 1 }}>0</div>
                                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>No homework yet</p>
                                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>Click + New Question to assign your first problem.</p>
                                </div>
                            ) : (
                                <motion.div
                                    variants={homeworkStagger}
                                    initial={shouldAnimate ? 'hidden' : false}
                                    animate="show"
                                >
                                    {homework.map((q, i) => {
                                        const pct = q.totalStudents ? Math.round((q.submissionCount / q.totalStudents) * 100) : 0;
                                        const isOpen = q.status === 'open';
                                        return (
                                            <motion.div key={q.id}
                                                className="p-5 mb-3"
                                                style={{
                                                    background: 'rgba(255,255,255,0.02)',
                                                    borderLeft: isOpen ? '2px solid rgba(165,180,252,0.5)' : '2px solid rgba(255,255,255,0.08)',
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                    borderRadius: '12px',
                                                    opacity: isOpen ? 1 : 0.5,
                                                }}
                                                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: isOpen ? 1 : 0.5, y: 0, transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] } } }}
                                                whileHover={{ y: -2 }}
                                                transition={{ duration: 0.18 }}
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{q.title}</span>
                                                    <motion.span
                                                        style={{
                                                            fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-sans)',
                                                            letterSpacing: '1px', textTransform: 'uppercase',
                                                            padding: '3px 8px', borderRadius: '6px',
                                                            background: isOpen ? 'rgba(74,222,128,0.1)' : 'transparent',
                                                            color: isOpen ? '#4ade80' : 'rgba(255,255,255,0.25)',
                                                            border: isOpen ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(255,255,255,0.08)',
                                                        }}
                                                        initial={shouldAnimate ? { opacity: 0, x: 8 } : false}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.1 + 0.5, duration: 0.25 }}
                                                    >
                                                        {isOpen ? 'Open' : 'Closed'}
                                                    </motion.span>
                                                </div>
                                                <div className="flex gap-5 mb-2" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                                                    <span>Due: {q.dueDate || 'No deadline'}</span>
                                                    <span>Submissions: <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{q.submissionCount}/{q.totalStudents}</span></span>
                                                    <span>Avg attempts: {q.avgAttempts || '—'}</span>
                                                </div>
                                                <div className="overflow-hidden mb-2" style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                                                    <div className="h-full" style={{ width: `${pct}%`, background: hwBarColor(pct), transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)', borderRadius: '2px' }} />
                                                </div>
                                                <div className="flex justify-between items-center" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>{pct}% submitted · <code style={{ color: '#a5b4fc', fontFamily: 'monospace' }}>{q.filename}</code></span>
                                                    {isOpen && (
                                                        <button onClick={() => closeHw(q.id)}
                                                            className="font-medium px-2.5 py-1 transition-all duration-150"
                                                            style={{
                                                                fontSize: '10px', background: 'transparent', fontFamily: 'var(--font-sans)',
                                                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'rgba(255,255,255,0.3)',
                                                                letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(251,113,133,0.4)'; e.currentTarget.style.color = '#fb7185'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}>
                                                            Close
                                                        </button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </FrostedCard>
                    )}
                </div>
            </main>

            {/* Homework Modal */}
            <AnimatePresence>
                {hwModal && (
                    <motion.div
                        className="fixed inset-0 flex items-center justify-center z-50"
                        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setHwModal(false)}
                    >
                        <motion.div
                            onClick={e => e.stopPropagation()}
                            className="p-8 w-full max-w-md relative"
                            style={{
                                background: '#0d0d10',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '24px',
                                backdropFilter: 'blur(20px)',
                            }}
                            initial={{ opacity: 0, y: 20, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.97 }}
                            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
                        >
                            <button
                                onClick={() => setHwModal(false)}
                                className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(251,113,133,0.4)'; e.currentTarget.style.color = '#fb7185'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>

                            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '22px', fontWeight: 800, letterSpacing: '2px', color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>CREATE HOMEWORK</h2>
                            <p className="mb-6" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Students will see this in VS Code sidebar.</p>

                            {[
                                { label: 'Title', value: hwTitle, onChange: e => setHwTitle(e.target.value), type: 'text', placeholder: 'e.g. Fibonacci with Memoization' },
                            ].map(({ label, value, onChange, type, placeholder }) => (
                                <div key={label} className="mb-4">
                                    <label className="block text-[10px] font-medium uppercase mb-1.5" style={{ letterSpacing: '3px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-sans)' }}>{label}</label>
                                    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
                                        className="w-full px-3.5 py-2.5 text-sm outline-none transition-all"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-sans)' }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(165,180,252,0.5)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                </div>
                            ))}

                            <div className="mb-4">
                                <label className="block text-[10px] font-medium uppercase mb-1.5" style={{ letterSpacing: '3px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-sans)' }}>Problem Statement</label>
                                <textarea value={hwBody} onChange={e => setHwBody(e.target.value)} rows={5} placeholder="Each line becomes a # comment..."
                                    className="w-full px-3.5 py-2.5 text-sm outline-none transition-all resize-y"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-sans)' }}
                                    onFocus={e => e.target.style.borderColor = 'rgba(165,180,252,0.5)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                            </div>

                            <div className="mb-6">
                                <label className="block text-[10px] font-medium uppercase mb-1.5" style={{ letterSpacing: '3px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-sans)' }}>
                                    Due Date <span className="normal-case font-normal">(optional)</span>
                                </label>
                                <input type="date" value={hwDue} onChange={e => setHwDue(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-sm outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-sans)' }}
                                    onFocus={e => e.target.style.borderColor = 'rgba(165,180,252,0.5)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                            </div>

                            <button onClick={createHw}
                                className="w-full py-3 text-sm font-semibold transition-all"
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                                    color: '#fff',
                                    borderRadius: '12px',
                                    border: 'none',
                                    fontFamily: 'var(--font-sans)',
                                    cursor: 'pointer',
                                    letterSpacing: '0.5px',
                                }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                            >
                                Publish to Students
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
