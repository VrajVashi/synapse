import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import ParticleField from '../components/ParticleField';
import AuroraBackground from '../components/AuroraBackground';
import NavSidebar from '../components/NavSidebar';
import StatCard from '../components/StatCard';
import StruggleRow from '../components/StruggleRow';
import StudentRow from '../components/StudentRow';
import { staggerContainer, fadeUp, slideInLeft, prefersReducedMotion } from '../lib/animations';

const shouldAnimate = !prefersReducedMotion;
const rowsStagger = staggerContainer(0.1, 0.25);
const cardsStagger = staggerContainer(0.09, 0.2);
const homeworkStagger = staggerContainer(0.1, 0.3);
const curriculumStagger = staggerContainer(0.1, 0.25);


export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [activeView, setActiveView] = useState(searchParams.get('view') || 'overview');
    const [data, setData] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [secondsAgo, setSecondsAgo] = useState(0);
    const pollRef = useRef(null);
    const tickRef = useRef(null);

    // Homework state
    const [hwModal, setHwModal] = useState(false);
    const [hwTitle, setHwTitle] = useState('');
    const [hwBody, setHwBody] = useState('');
    const [hwDue, setHwDue] = useState('');

    // Fetch all cohort data
    const fetchAll = useCallback(async () => {
        const [cohort, stats, heatmap, atRisk, mastery, curriculum, homework] = await Promise.all([
            API.getCohortInfo(), API.getWeeklyStats(), API.getHeatmap(), API.getAtRisk(), API.getMastery(), API.getCurriculum(), API.getHomework(),
        ]);
        setData({ cohort, stats, heatmap, atRisk, mastery, curriculum, homework });
        setLastUpdated(Date.now());
        setSecondsAgo(0);
    }, []);

    // Initial fetch + 10-second polling
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
        await API.createHomework({ classroomId: 'DEMO', title: hwTitle, body: hwBody, dueDate: hwDue });
        const hw = await API.getHomework();
        setData(d => ({ ...d, homework: hw }));
        setHwModal(false); setHwTitle(''); setHwBody(''); setHwDue('');
    };

    const closeHw = async (id) => {
        await API.closeHomework(id);
        const hw = await API.getHomework();
        setData(d => ({ ...d, homework: hw }));
    };

    if (!data) return (
        <div className="h-screen flex items-center justify-center" style={{ background: '#0D0D0D' }}>
            <div className="w-8 h-8 border-2 border-[#E8FF4730] border-t-[#E8FF47] rounded-full animate-spin" />
        </div>
    );

    const { cohort, stats, heatmap, atRisk, mastery, curriculum, homework } = data;

    const hwBarColor = (pct) => pct > 60 ? '#E8FF47' : pct > 30 ? '#E8B835' : '#FF6B35';
    const masteryColor = (s) => s >= 80 ? '#4ADE80' : s >= 60 ? '#E8FF47' : s >= 40 ? '#E8B835' : '#FF6B35';
    const curTypeLabel = { gap: 'Reinforcement Gap', missing: 'Missing Prerequisite', ok: 'On Track' };
    const curBorder = { gap: '#FF6B35', missing: '#FF6B35', ok: '#4ADE80' };
    const curBadge = { gap: '#FF6B35', missing: '#FF6B35', ok: '#4ADE80' };

    const viewTitles = {
        overview: 'OVERVIEW',
        heatmap: 'STRUGGLE HEATMAP',
        students: 'AT-RISK STUDENTS',
        mastery: 'MASTERY TRACKING',
        curriculum: 'CURRICULUM INSIGHTS',
        homework: 'HOMEWORK',
    };

    return (
        <div className="min-h-screen flex relative">
            <ParticleField />
            <AuroraBackground />
            <NavSidebar activeView={activeView} onViewChange={handleViewChange} />

            <main className="ml-56 flex-1 flex flex-col min-h-screen relative z-10">
                {/* Topbar */}
                <header className="flex items-center justify-between px-7 py-4 shrink-0"
                    style={{ background: '#0D0D0D', borderBottom: '1px solid #1E1E1E' }}>
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <a href="/classrooms" className="flex items-center gap-1 transition-colors duration-150"
                                style={{ fontSize: '12px', color: '#555', fontFamily: 'var(--font-sans)', textDecoration: 'none' }}
                                onMouseEnter={e => e.currentTarget.style.color = '#E8FF47'}
                                onMouseLeave={e => e.currentTarget.style.color = '#555'}>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                                Classrooms
                            </a>
                        </div>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '42px', letterSpacing: '2px', lineHeight: 1, color: '#F5F5F5' }}>
                            {viewTitles[activeView] || activeView.toUpperCase()}
                        </h1>
                        {/* Enhancement 9: subtitle with yellow dot separator */}
                        <p className="mt-1" style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: '#444', letterSpacing: '1px' }}>
                            {cohort.name} <span style={{ color: '#E8FF47', margin: '0 4px' }}>·</span> Week {cohort.week}
                        </p>
                    </div>
                    <div className="flex items-center gap-0">
                        <div className="text-right pr-6">
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#555', fontWeight: 500 }}>Active today</div>
                            <div className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '36px', color: '#E8FF47', lineHeight: 1 }}>{cohort.activeToday}</div>
                        </div>
                        {/* Enhancement 10: vertical divider */}
                        <div style={{ width: '1px', height: '32px', background: '#222', margin: '0 24px' }} />
                        <div className="text-right">
                            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#555', fontWeight: 500 }}>Total students</div>
                            <div className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '36px', color: '#F5F5F5', lineHeight: 1 }}>{cohort.totalStudents}</div>
                        </div>
                        {/* Live polling indicator */}
                        <div style={{ width: '1px', height: '32px', background: '#222', margin: '0 24px' }} />
                        <div className="text-right">
                            <div className="flex items-center gap-1.5">
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ADE80', animation: 'pulse-glow 2s infinite' }} />
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#555', fontWeight: 500 }}>LIVE</span>
                            </div>
                            <div className="tabular-nums mt-0.5" style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: '#444' }}>
                                {secondsAgo < 2 ? 'Just now' : `${secondsAgo}s ago`}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-7 page-content">
                    {/* ── OVERVIEW ─── */}
                    {activeView === 'overview' && (
                        <>
                            {/* Enhancement 4: asymmetric grid */}
                            <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: '2fr 1fr 1fr 1.5fr' }}>
                                <StatCard label="Total Debug Sessions" value={stats.totalSessions} delta={`${stats.improvementVsLastWeek} vs last week`} deltaType="positive" sparkData={[12, 18, 14, 22, 19, 27, 24]} delay={0} />
                                <StatCard label="Avg Fix Time" value={parseFloat(stats.avgFixTime)} unit="min" delta="cohort average" sparkData={[18, 15, 17, 13, 16, 14, 13]} delay={80} />
                                <StatCard label="Quiz Completion Rate" value={stats.quizCompletionRate} unit="%" delta="" sparkData={[30, 35, 38, 42, 40, 45, 47]} delay={160} />
                                <StatCard label="At-Risk Students" value={atRisk.length} warn={true} delta="require intervention" deltaType="warn" sparkData={[6, 5, 7, 4, 5, 4, 4]} delay={240} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '2px' }}>
                                    <div className="flex justify-between items-start mb-5">
                                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '1px', color: '#F5F5F5' }}>TOP STRUGGLES THIS WEEK</h3>
                                        <button onClick={() => setActiveView('heatmap')}
                                            className="transition-colors duration-150"
                                            style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#E8FF47', background: 'none', border: 'none' }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#F5F5F5'}
                                            onMouseLeave={e => e.currentTarget.style.color = '#E8FF47'}>See all</button>
                                    </div>
                                    <div className="flex flex-col">
                                        {heatmap.slice(0, 3).map((row, i) => (
                                            <StruggleRow key={i} row={row} delay={i * 100} />
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '2px' }}>
                                    <div className="flex justify-between items-start mb-5">
                                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '1px', color: '#F5F5F5' }}>STUDENTS NEEDING ATTENTION</h3>
                                        <button onClick={() => setActiveView('students')}
                                            className="transition-colors duration-150"
                                            style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#E8FF47', background: 'none', border: 'none' }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#F5F5F5'}
                                            onMouseLeave={e => e.currentTarget.style.color = '#E8FF47'}>See all</button>
                                    </div>
                                    <div className="flex flex-col">
                                        {atRisk.slice(0, 3).map((s, i) => (
                                            <StudentRow key={i} student={s} delay={i * 100} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeView === 'heatmap' && (
                        <div className="p-6" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '2px' }}>
                            {/* Column headers */}
                            <motion.div
                                className="grid items-center gap-4 pb-3 mb-2"
                                style={{ gridTemplateColumns: '200px 1fr 80px 80px 90px 90px', borderBottom: '1px solid #1E1E1E' }}
                                initial={shouldAnimate ? { opacity: 0 } : false}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.3 }}
                            >
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#444' }}>Concept</span>
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#444' }}>Severity</span>
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#444' }}>Attempts</span>
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#444' }}>Crash Rate</span>
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#444' }}>Avg Fix</span>
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#444' }}>Quiz Rate</span>
                            </motion.div>
                            <motion.div
                                variants={rowsStagger}
                                initial={shouldAnimate ? 'hidden' : false}
                                animate="show"
                            >
                                {heatmap.map((row, i) => {
                                    const rankColors = ['#FF6B35', '#FF8C35', '#E8B835', '#E8FF47', '#E8FF47'];
                                    const crashColor = row.pct > 50 ? '#FF6B35' : row.pct > 30 ? '#E8B835' : '#4ADE80';
                                    return (
                                        <motion.div key={i}
                                            className="grid items-center gap-4 py-5 px-2"
                                            style={{
                                                gridTemplateColumns: '200px 1fr 80px 80px 90px 90px',
                                                borderBottom: i < heatmap.length - 1 ? '1px solid #1E1E1E' : 'none',
                                                transition: 'background 0.12s ease',
                                                willChange: 'transform',
                                            }}
                                            variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] } } }}
                                            whileHover={{ x: 4, background: 'rgba(232,255,71,0.04)' }}
                                            transition={{ duration: 0.15, ease: [0.0, 0.0, 0.2, 1] }}
                                            onMouseEnter={e => {
                                                const rank = e.currentTarget.querySelector('[data-rank]');
                                                if (rank) rank.style.color = '#E8FF47';
                                            }}
                                            onMouseLeave={e => {
                                                const rank = e.currentTarget.querySelector('[data-rank]');
                                                if (rank) rank.style.color = '#2A2A2A';
                                            }}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span data-rank className="tabular-nums w-8" style={{ fontFamily: 'var(--font-display)', fontSize: '32px', color: '#2A2A2A', transition: 'color 0.12s ease' }}>{i + 1}</span>
                                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, color: '#F5F5F5' }}>{row.errorType}</span>
                                            </div>
                                            <div className="overflow-hidden" style={{ height: '6px', background: '#222', borderRadius: 0 }}>
                                                <div className="h-full" style={{ width: `${row.pct}%`, background: rankColors[Math.min(i, 4)], transition: 'width 1s cubic-bezier(0.22,1,0.36,1)', borderRadius: 0 }} />
                                            </div>
                                            <span className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: '#F5F5F5' }}>{row.attempts.toLocaleString()}</span>
                                            <span className="tabular-nums" style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: crashColor }}>{row.pct}%</span>
                                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#888' }}>{row.avgFixMin} min</span>
                                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#888' }}>{row.quizCompletion}%</span>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </div>
                    )}

                    {/* ── STUDENTS ─── */}
                    {activeView === 'students' && (
                        <div className="p-6" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '2px' }}>
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
                        </div>
                    )}

                    {/* ── MASTERY ─── */}
                    {activeView === 'mastery' && (
                        <div className="p-8" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '2px' }}>
                            <motion.div
                                className="space-y-0"
                                variants={rowsStagger}
                                initial={shouldAnimate ? 'hidden' : false}
                                animate="show"
                            >
                                {mastery.map((m, i) => {
                                    const mColor = masteryColor(m.mastery);
                                    const exceeded = m.mastery >= m.target;
                                    const tickColor = exceeded ? '#4ADE80' : '#444';
                                    return (
                                        <motion.div key={i}
                                            className="grid items-center gap-5 py-4"
                                            style={{
                                                gridTemplateColumns: '180px 1fr 80px',
                                                borderBottom: i < mastery.length - 1 ? '1px solid #1E1E1E' : 'none',
                                            }}
                                            variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] } } }}
                                        >
                                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: '#F5F5F5' }}>{m.concept}</span>
                                            <div className="relative" style={{ height: '8px', background: '#222', borderRadius: 0 }}>
                                                {/* Threshold marker with TARGET label */}
                                                <div className="absolute" style={{ left: `${m.target}%`, top: '-12px', transform: 'translateX(-50%)' }}>
                                                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '8px', letterSpacing: '1px', color: tickColor, textTransform: 'uppercase', textAlign: 'center', marginBottom: '2px' }}>TARGET</div>
                                                    <div style={{ width: '2px', height: '16px', background: tickColor, margin: '0 auto', transition: 'background 0.3s' }} />
                                                </div>
                                                <div className="h-full" style={{ width: `${m.mastery}%`, background: mColor, transition: 'width 1.2s cubic-bezier(0.22,1,0.36,1)', borderRadius: 0 }} />
                                            </div>
                                            <span className="text-right tabular-nums">
                                                <span style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: mColor }}>{m.mastery}%</span>
                                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: '#444' }}> / {m.target}%</span>
                                            </span>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </div>
                    )}

                    {/* ── CURRICULUM ─── */}
                    {activeView === 'curriculum' && (
                        <div className="p-6" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '2px' }}>
                            <motion.div
                                className="space-y-3"
                                variants={curriculumStagger}
                                initial={shouldAnimate ? 'hidden' : false}
                                animate="show"
                            >
                                {curriculum.map((item, i) => {
                                    const bColor = curBorder[item.type] || '#E8B835';
                                    const badgeColor = curBadge[item.type] || '#E8B835';
                                    return (
                                        <motion.div key={i}
                                            className="p-5 transition-all duration-200"
                                            style={{
                                                background: '#141414',
                                                border: '1px solid #2A2A2A',
                                                borderLeft: `3px solid ${bColor}`,
                                                borderRadius: '2px',
                                            }}
                                            variants={fadeUp}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: '#F5F5F5' }}>{item.concept}</span>
                                                <span style={{
                                                    fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-sans)',
                                                    letterSpacing: '1px', textTransform: 'uppercase',
                                                    padding: '3px 8px', borderRadius: '2px',
                                                    background: `${badgeColor}14`,
                                                    color: badgeColor,
                                                    border: `1px solid ${badgeColor}30`,
                                                }}>
                                                    {curTypeLabel[item.type]}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mb-3" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#555' }}>
                                                <div>Taught: <span style={{ color: '#888', fontWeight: 500 }}>{item.taught}</span></div>
                                                <div>Peak Struggle: <span style={{ color: '#888', fontWeight: 500 }}>{item.peakStruggle}</span></div>
                                            </div>
                                            <div className="leading-relaxed" style={{
                                                fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#888',
                                                background: '#111111', border: '1px solid #222222', borderRadius: '2px',
                                                padding: '12px 16px', fontStyle: 'italic',
                                            }}>{item.recommendation}</div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </div>
                    )}

                    {/* ── HOMEWORK ─── (Enhancement 6: bar colors) */}
                    {activeView === 'homework' && (
                        <div className="p-6" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '2px' }}>
                            <div className="flex justify-between items-start mb-5">
                                <div>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', letterSpacing: '2px', color: '#F5F5F5' }}>HOMEWORK QUESTIONS</h3>
                                    <p className="mt-1" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#555' }}>Students see these in VS Code sidebar</p>
                                </div>
                                <button onClick={() => setHwModal(true)}
                                    className="px-4 py-2 text-xs font-medium transition-all duration-150"
                                    style={{ border: '1px solid #E8FF47', color: '#E8FF47', background: 'transparent', borderRadius: '2px', fontFamily: 'var(--font-sans)' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,255,71,0.1)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    + New Question
                                </button>
                            </div>

                            {homework.length === 0 ? (
                                <div className="text-center py-16">
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '120px', color: '#1E1E1E', lineHeight: 1 }}>0</div>
                                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: '#F5F5F5', marginBottom: '4px' }}>No homework yet</p>
                                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#555' }}>Click + New Question to assign your first problem.</p>
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
                                        const barColor = hwBarColor(pct);
                                        return (
                                            <motion.div key={q.id}
                                                className="p-5"
                                                style={{
                                                    background: '#141414',
                                                    borderLeft: isOpen ? '3px solid #E8FF47' : '3px solid #2A2A2A',
                                                    borderBottom: '1px solid #1E1E1E',
                                                    opacity: isOpen ? 1 : 0.55,
                                                }}
                                                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: isOpen ? 1 : 0.55, y: 0, transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] } } }}
                                                whileHover={{ y: -3 }}
                                                transition={{ duration: 0.18, ease: [0.0, 0.0, 0.2, 1] }}
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 600, color: '#F5F5F5' }}>{q.title}</span>
                                                    <motion.span
                                                        style={{
                                                            fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-sans)',
                                                            letterSpacing: '1px', textTransform: 'uppercase',
                                                            padding: '3px 8px', borderRadius: '2px',
                                                            background: isOpen ? 'rgba(74,222,128,0.12)' : 'transparent',
                                                            color: isOpen ? '#4ADE80' : '#444',
                                                            border: isOpen ? '1px solid rgba(74,222,128,0.25)' : '1px solid #2A2A2A',
                                                        }}
                                                        initial={shouldAnimate ? { opacity: 0, x: 8 } : false}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.1 + 0.5, duration: 0.25 }}
                                                    >
                                                        {isOpen ? 'Open' : 'Closed'}
                                                    </motion.span>
                                                </div>
                                                <div className="flex gap-5 mb-2" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#555' }}>
                                                    <span>Due: {q.dueDate || 'No deadline'}</span>
                                                    <span>Submissions: <span style={{ color: '#E8FF47', fontWeight: 600 }}>{q.submissionCount}/{q.totalStudents}</span></span>
                                                    <span>Avg attempts: {q.avgAttempts || '—'}</span>
                                                </div>
                                                <div className="overflow-hidden mb-2" style={{ height: '3px', background: '#1E1E1E', borderRadius: 0 }}>
                                                    <div className="h-full" style={{ width: `${pct}%`, background: barColor, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)', borderRadius: 0 }} />
                                                </div>
                                                <div className="flex justify-between items-center" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px' }}>
                                                    <span style={{ color: '#888' }}>{pct}% submitted · <code style={{ color: '#E8FF47', fontFamily: 'monospace' }}>{q.filename}</code></span>
                                                    {isOpen && (
                                                        <button onClick={() => closeHw(q.id)}
                                                            className="font-medium px-2.5 py-1 transition-all duration-150"
                                                            style={{
                                                                fontSize: '10px', background: 'transparent', fontFamily: 'var(--font-sans)',
                                                                border: '1px solid #2A2A2A', borderRadius: '2px', color: '#555',
                                                                letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600,
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF6B35'; e.currentTarget.style.color = '#FF6B35'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.color = '#555'; }}>
                                                            Close
                                                        </button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Homework Modal */}
            {hwModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }} onClick={() => setHwModal(false)}>
                    <div onClick={e => e.stopPropagation()}
                        className="p-9 w-full max-w-md relative animate-slide-up"
                        style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '2px' }}>
                        <button onClick={() => setHwModal(false)} className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center transition-all"
                            style={{ background: 'transparent', border: '1px solid #2A2A2A', borderRadius: '2px', color: '#444' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A2A'; e.currentTarget.style.color = '#444'; }}>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', letterSpacing: '2px', color: '#F5F5F5', marginBottom: '4px' }}>CREATE HOMEWORK</h2>
                        <p className="mb-7" style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: '#555' }}>Students will see this in VS Code sidebar.</p>
                        <div className="mb-4">
                            <label className="block text-[10px] font-medium uppercase mb-1.5" style={{ letterSpacing: '3px', color: '#666', fontFamily: 'var(--font-sans)' }}>Title</label>
                            <input type="text" value={hwTitle} onChange={e => setHwTitle(e.target.value)} placeholder="e.g. Fibonacci with Memoization"
                                className="w-full px-3.5 py-2.5 text-sm outline-none transition-all"
                                style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '2px', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}
                                onFocus={e => e.target.style.borderColor = '#E8FF47'}
                                onBlur={e => e.target.style.borderColor = '#2A2A2A'} />
                        </div>
                        <div className="mb-4">
                            <label className="block text-[10px] font-medium uppercase mb-1.5" style={{ letterSpacing: '3px', color: '#666', fontFamily: 'var(--font-sans)' }}>Problem Statement</label>
                            <textarea value={hwBody} onChange={e => setHwBody(e.target.value)} rows={5} placeholder="Each line becomes a # comment..."
                                className="w-full px-3.5 py-2.5 text-sm outline-none transition-all resize-y"
                                style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '2px', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}
                                onFocus={e => e.target.style.borderColor = '#E8FF47'}
                                onBlur={e => e.target.style.borderColor = '#2A2A2A'} />
                        </div>
                        <div className="mb-6">
                            <label className="block text-[10px] font-medium uppercase mb-1.5" style={{ letterSpacing: '3px', color: '#666', fontFamily: 'var(--font-sans)' }}>Due Date <span className="normal-case font-normal">(optional)</span></label>
                            <input type="date" value={hwDue} onChange={e => setHwDue(e.target.value)}
                                className="w-full px-3.5 py-2.5 text-sm outline-none transition-all"
                                style={{ background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: '2px', color: '#F5F5F5', fontFamily: 'var(--font-sans)' }}
                                onFocus={e => e.target.style.borderColor = '#E8FF47'}
                                onBlur={e => e.target.style.borderColor = '#2A2A2A'} />
                        </div>
                        <button onClick={createHw}
                            className="w-full py-3 text-sm font-semibold transition-all"
                            style={{ background: '#E8FF47', color: '#0D0D0D', borderRadius: '2px', border: 'none', fontFamily: 'var(--font-sans)' }}>
                            Publish to Students
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
