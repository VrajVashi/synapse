import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import ParticleField from '../components/ParticleField';
import AuroraBackground from '../components/AuroraBackground';
import NavSidebar from '../components/NavSidebar';
import StatCard from '../components/StatCard';
import StruggleRow from '../components/StruggleRow';
import StudentRow from '../components/StudentRow';

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [activeView, setActiveView] = useState(searchParams.get('view') || 'overview');
    const [data, setData] = useState(null);
    const [hoveredStudent, setHoveredStudent] = useState(null);

    // Homework state
    const [hwModal, setHwModal] = useState(false);
    const [hwTitle, setHwTitle] = useState('');
    const [hwBody, setHwBody] = useState('');
    const [hwDue, setHwDue] = useState('');

    useEffect(() => {
        if (!user || user.role !== 'teacher') { navigate('/auth'); return; }
        (async () => {
            const [cohort, stats, heatmap, atRisk, mastery, curriculum, homework] = await Promise.all([
                API.getCohortInfo(), API.getWeeklyStats(), API.getHeatmap(), API.getAtRisk(), API.getMastery(), API.getCurriculum(), API.getHomework(),
            ]);
            setData({ cohort, stats, heatmap, atRisk, mastery, curriculum, homework });
        })();
    }, [user, navigate]);

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
        <div className="h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
        </div>
    );

    const { cohort, stats, heatmap, atRisk, mastery, curriculum, homework } = data;

    const barColor = (p) => p >= 60 ? '#EF4444' : p >= 40 ? '#F59E0B' : '#06B6D4';
    const masteryColor = (s) => s === 'good' ? '#22C55E' : s === 'warn' ? '#F59E0B' : '#EF4444';
    const curTypeLabel = { gap: 'Reinforcement Gap', missing: 'Missing Prerequisite', ok: 'On Track' };
    const curBorder = { gap: '#F59E0B', missing: '#EF4444', ok: '#22C55E' };

    return (
        <div className="min-h-screen flex relative">
            <ParticleField />
            <AuroraBackground />
            <NavSidebar activeView={activeView} onViewChange={handleViewChange} />

            <main className="ml-56 flex-1 flex flex-col min-h-screen relative z-10">
                {/* Topbar */}
                <header className="flex items-center justify-between px-7 py-4 border-b border-white/[0.04] shrink-0"
                    style={{ background: 'rgba(5,5,12,0.45)', backdropFilter: 'blur(24px) saturate(120%)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)' }}>
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <a href="/classrooms" className="text-xs text-text-muted hover:text-cyan transition-colors flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                                Classrooms
                            </a>
                        </div>
                        <h1 className="text-lg font-extrabold tracking-tight capitalize">{activeView === 'overview' ? 'Overview' : activeView.replace(/([A-Z])/g, ' $1')}</h1>
                        <p className="text-[11px] text-text-muted">{cohort.name} · Week {cohort.week}</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Active today</div>
                            <div className="text-xl font-extrabold text-cyan tabular-nums">{cohort.activeToday}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Total students</div>
                            <div className="text-xl font-extrabold text-cyan tabular-nums">{cohort.totalStudents}</div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-7">
                    {/* ── OVERVIEW ─── */}
                    {activeView === 'overview' && (
                        <>
                            <div className="grid grid-cols-4 gap-4 mb-5">
                                <StatCard label="Total Debug Sessions" value={stats.totalSessions} delta={`${stats.improvementVsLastWeek} vs last week`} deltaType="positive" sparkData={[12, 18, 14, 22, 19, 27, 24]} delay={0} />
                                <StatCard label="Avg Fix Time" value={parseFloat(stats.avgFixTime)} unit="min" delta="cohort average" sparkData={[18, 15, 17, 13, 16, 14, 13]} delay={80} />
                                <StatCard label="Quiz Completion Rate" value={stats.quizCompletionRate} unit="%" delta="" sparkData={[30, 35, 38, 42, 40, 45, 47]} delay={160} />
                                <StatCard label="At-Risk Students" value={atRisk.length} warn={true} delta="require intervention" deltaType="warn" sparkData={[6, 5, 7, 4, 5, 4, 4]} delay={240} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-xl p-6 border border-white/[0.04] relative overflow-hidden"
                                    style={{ background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(24px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06), 0 24px 48px -12px rgba(0,0,0,0.5)' }}>
                                    <div className="absolute top-0 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
                                    <div className="flex justify-between items-start mb-5">
                                        <h3 className="text-sm font-bold tracking-tight">Top Struggles This Week</h3>
                                        <button onClick={() => setActiveView('heatmap')} className="text-[11px] text-cyan font-semibold hover:text-white transition-colors">See all</button>
                                    </div>
                                    <div className="flex flex-col gap-2.5">
                                        {heatmap.slice(0, 3).map((row, i) => (
                                            <StruggleRow key={i} row={row} delay={i * 100} />
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-xl p-6 border border-white/[0.04] relative overflow-hidden"
                                    style={{ background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(24px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06), 0 24px 48px -12px rgba(0,0,0,0.5)' }}>
                                    <div className="absolute top-0 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
                                    <div className="flex justify-between items-start mb-5">
                                        <h3 className="text-sm font-bold tracking-tight">Students Needing Attention</h3>
                                        <button onClick={() => setActiveView('students')} className="text-[11px] text-cyan font-semibold hover:text-white transition-colors">See all</button>
                                    </div>
                                    <div className="flex flex-col gap-2.5">
                                        {atRisk.slice(0, 3).map((s, i) => (
                                            <StudentRow key={i} student={s} delay={i * 100} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── HEATMAP ─── */}
                    {activeView === 'heatmap' && (
                        <div className="rounded-xl p-6 border border-white/[0.04] relative overflow-hidden"
                            style={{ background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(24px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06), 0 24px 48px -12px rgba(0,0,0,0.5)' }}>
                            <h3 className="text-sm font-bold mb-1 tracking-tight">Struggle Heatmap — Last 7 Days</h3>
                            <p className="text-xs text-text-muted mb-5">Ranked by debugging attempts across cohort</p>
                            <div className="space-y-3">
                                {heatmap.map((row, i) => (
                                    <div key={i} className="grid items-center gap-4 py-3 border-b border-white/[0.03] last:border-b-0 transition-all duration-200 hover:bg-white/[0.015] hover:translate-x-1 rounded-lg px-2"
                                        style={{ gridTemplateColumns: '200px 1fr 80px 80px 90px 90px', opacity: 0, animation: `slide-left 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms forwards` }}>
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-lg font-black text-cyan tabular-nums w-6">{i + 1}</span>
                                            <span className="text-sm font-semibold">{row.errorType}</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                                            <div className="h-full rounded-full relative overflow-hidden" style={{ width: `${row.pct}%`, background: barColor(row.pct), transition: 'width 1s cubic-bezier(0.22,1,0.36,1)' }}>
                                                <div className="absolute inset-0 animate-shimmer" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', width: '50%' }} />
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-cyan tabular-nums">{row.attempts.toLocaleString()}</span>
                                        <span className="text-sm font-bold tabular-nums" style={{ color: barColor(row.pct) }}>{row.pct}%</span>
                                        <span className="text-xs text-text-secondary">{row.avgFixMin} min</span>
                                        <span className="text-xs" style={{ color: row.quizCompletion >= 60 ? '#22C55E' : '#8B8B9E' }}>{row.quizCompletion}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── STUDENTS ─── */}
                    {activeView === 'students' && (
                        <div className="rounded-xl p-6 border border-white/[0.04] relative overflow-hidden"
                            style={{ background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(24px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06), 0 24px 48px -12px rgba(0,0,0,0.5)' }}>
                            <h3 className="text-sm font-bold mb-1 tracking-tight">At-Risk Students</h3>
                            <p className="text-xs text-text-muted mb-5">Flagged based on attempt count, quiz completion, and time-to-fix</p>
                            <div className="space-y-3">
                                {atRisk.map((s, i) => (
                                    <StudentRow key={i} student={s} delay={i * 80} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── MASTERY ─── */}
                    {activeView === 'mastery' && (
                        <div className="rounded-xl p-6 border border-white/[0.04] relative overflow-hidden"
                            style={{ background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(24px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06), 0 24px 48px -12px rgba(0,0,0,0.5)' }}>
                            <h3 className="text-sm font-bold mb-1 tracking-tight">Concept Mastery Tracking</h3>
                            <p className="text-xs text-text-muted mb-5">Based on quiz completion and time-to-fix improvements</p>
                            <div className="space-y-4">
                                {mastery.map((m, i) => (
                                    <div key={i} className="grid items-center gap-5 p-3.5 rounded-xl bg-white/[0.015] border border-white/[0.03] hover:bg-white/[0.03] hover:translate-x-1 transition-all duration-200"
                                        style={{ gridTemplateColumns: '180px 1fr 80px', opacity: 0, animation: `slide-left 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 80}ms forwards` }}>
                                        <span className="text-sm font-semibold text-text-secondary">{m.concept}</span>
                                        <div className="relative h-2 rounded-full bg-white/[0.04]">
                                            <div className="absolute top-[-4px] bottom-[-4px] w-0.5 rounded-sm bg-white/15" style={{ left: `${m.target}%` }} title={`Target: ${m.target}%`} />
                                            <div className="h-full rounded-full" style={{ width: `${m.mastery}%`, background: `linear-gradient(90deg, ${masteryColor(m.status)}88, ${masteryColor(m.status)})`, transition: 'width 1.2s cubic-bezier(0.22,1,0.36,1)' }} />
                                        </div>
                                        <span className="text-sm font-extrabold text-right tabular-nums" style={{ color: masteryColor(m.status) }}>
                                            {m.mastery}%<span className="text-[10px] font-medium text-text-muted"> / {m.target}%</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── CURRICULUM ─── */}
                    {activeView === 'curriculum' && (
                        <div className="rounded-xl p-6 border border-white/[0.04] relative overflow-hidden"
                            style={{ background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(24px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06), 0 24px 48px -12px rgba(0,0,0,0.5)' }}>
                            <h3 className="text-sm font-bold mb-1 tracking-tight">Curriculum Optimization Insights</h3>
                            <p className="text-xs text-text-muted mb-5">AI-generated recommendations based on real student struggle timing</p>
                            <div className="space-y-3">
                                {curriculum.map((item, i) => (
                                    <div key={i} className="rounded-xl p-5 bg-white/[0.02] border border-white/[0.04] hover:translate-x-1 transition-all duration-200 relative overflow-hidden"
                                        style={{ borderLeft: `3px solid ${curBorder[item.type]}`, opacity: 0, animation: `slide-up 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 100}ms forwards` }}>
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-sm font-bold tracking-tight">{item.concept}</span>
                                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                                                style={{ background: `${curBorder[item.type]}14`, color: curBorder[item.type], border: `1px solid ${curBorder[item.type]}30` }}>
                                                {curTypeLabel[item.type]}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-text-muted">
                                            <div>Taught: <span className="text-text-secondary font-semibold">{item.taught}</span></div>
                                            <div>Peak Struggle: <span className="text-text-secondary font-semibold">{item.peakStruggle}</span></div>
                                        </div>
                                        <div className="text-xs text-text-secondary p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] leading-relaxed">{item.recommendation}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── HOMEWORK ─── */}
                    {activeView === 'homework' && (
                        <div className="rounded-xl p-6 border border-white/[0.04] relative overflow-hidden"
                            style={{ background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(24px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06), 0 24px 48px -12px rgba(0,0,0,0.5)' }}>
                            <div className="flex justify-between items-start mb-5">
                                <div>
                                    <h3 className="text-sm font-bold tracking-tight">Homework Questions</h3>
                                    <p className="text-xs text-text-muted mt-1">Students see these in VS Code sidebar</p>
                                </div>
                                <button onClick={() => setHwModal(true)} className="px-4 py-2 rounded-lg text-xs font-bold bg-white/[0.03] border border-white/[0.06] text-text-secondary hover:bg-cyan/[0.08] hover:border-cyan/[0.18] hover:text-cyan transition-all">+ New Question</button>
                            </div>

                            {homework.length === 0 ? (
                                <div className="text-center py-16">
                                    <svg className="w-10 h-10 mx-auto mb-3 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                    <p className="font-bold mb-1">No homework yet</p>
                                    <p className="text-xs text-text-muted">Click + New Question to assign your first problem.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {homework.map((q, i) => {
                                        const pct = q.totalStudents ? Math.round((q.submissionCount / q.totalStudents) * 100) : 0;
                                        const statusCol = q.status === 'open' ? '#22C55E' : '#3E3E52';
                                        return (
                                            <div key={q.id} className="rounded-xl p-5 border border-white/[0.04] bg-white/[0.02] hover:translate-x-1 transition-all duration-200"
                                                style={{ opacity: q.status === 'open' ? 1 : 0.55, borderLeft: `3px solid ${statusCol}`, animation: `slide-up 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 80}ms forwards` }}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-bold">{q.title}</span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${statusCol}18`, color: statusCol, border: `1px solid ${statusCol}35` }}>
                                                        {q.status === 'open' ? 'Open' : 'Closed'}
                                                    </span>
                                                </div>
                                                <div className="flex gap-5 text-xs text-text-muted mb-2">
                                                    <span>Due: {q.dueDate || 'No deadline'}</span>
                                                    <span>Submissions: <span className="text-cyan font-bold">{q.submissionCount}/{q.totalStudents}</span></span>
                                                    <span>Avg attempts: {q.avgAttempts || '—'}</span>
                                                </div>
                                                <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden mb-2">
                                                    <div className="h-full rounded-full bg-cyan" style={{ width: `${pct}%`, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-text-muted">{pct}% submitted · <code className="text-cyan">{q.filename}</code></span>
                                                    {q.status === 'open' && (
                                                        <button onClick={() => closeHw(q.id)} className="text-text-muted hover:text-white transition-colors bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-md text-[11px] font-semibold">Close</button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Homework Modal */}
            {hwModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }} onClick={() => setHwModal(false)}>
                    <div onClick={e => e.stopPropagation()}
                        className="rounded-2xl p-9 w-full max-w-md relative border border-white/[0.06] animate-slide-up"
                        style={{ background: 'rgba(8,8,16,0.85)', backdropFilter: 'blur(48px) saturate(140%)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 40px 80px -16px rgba(0,0,0,0.75)' }}>
                        <button onClick={() => setHwModal(false)} className="absolute top-5 right-5 w-7 h-7 rounded-md bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-text-muted hover:text-danger transition-all">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                        <h2 className="text-xl font-extrabold mb-1.5 tracking-tight">Create Homework</h2>
                        <p className="text-xs text-text-muted mb-7">Students will see this in VS Code sidebar.</p>
                        <div className="mb-4">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Title</label>
                            <input type="text" value={hwTitle} onChange={e => setHwTitle(e.target.value)} placeholder="e.g. Fibonacci with Memoization"
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan/40 focus:ring-2 focus:ring-cyan/10 transition-all placeholder:text-text-muted" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Problem Statement</label>
                            <textarea value={hwBody} onChange={e => setHwBody(e.target.value)} rows={5} placeholder="Each line becomes a # comment..."
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan/40 focus:ring-2 focus:ring-cyan/10 transition-all placeholder:text-text-muted resize-y" />
                        </div>
                        <div className="mb-6">
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Due Date <span className="normal-case font-normal">(optional)</span></label>
                            <input type="date" value={hwDue} onChange={e => setHwDue(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan/40 transition-all" />
                        </div>
                        <button onClick={createHw} className="w-full py-3 rounded-xl text-sm font-extrabold text-black hover:scale-[1.03] active:scale-[0.97] transition-all"
                            style={{ background: 'linear-gradient(180deg, #22D3EE, #06B6D4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                            Publish to Students
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
