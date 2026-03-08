const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

// Groq client for Tier 3 AI analysis
// Set GROQ_API_KEY in your environment: $env:GROQ_API_KEY="gsk_..."
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const app = express();
app.use(cors());
app.use(express.json());

// Log every incoming request
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

const PORT = 3001;

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STATE  (persists only while server is running — perfect for demos)
// ═══════════════════════════════════════════════════════════════════════════════

// Classrooms: { id, name, lang, batch, students: [studentId...], createdAt }
let classrooms = [];

// Ingested debug sessions from VS Code extension
let sessions = [];

// Quiz results from VS Code extension
let quizResults = [];

// Seed mock data — used as baseline, augmented by real ingestion
const SEED = {
    cohortInfo: {
        name: 'Full Stack Cohort 12',
        week: 3,
        totalStudents: 34,
        activeToday: 27,
    },
    heatmap: [
        { errorType: 'None / Null Handling', key: 'none_handling', attempts: 847, pct: 73, avgFixMin: 16, quizCompletion: 34, trend: 'up' },
        { errorType: 'Async / Await Syntax', key: 'async_await', attempts: 612, pct: 58, avgFixMin: 22, quizCompletion: 12, trend: 'up' },
        { errorType: 'Missing try / except', key: 'try_except', attempts: 401, pct: 45, avgFixMin: 11, quizCompletion: 58, trend: 'down' },
        { errorType: 'List / Index Bounds', key: 'list_ops', attempts: 289, pct: 34, avgFixMin: 9, quizCompletion: 67, trend: 'stable' },
        { errorType: 'Type Errors', key: 'type_error', attempts: 201, pct: 28, avgFixMin: 14, quizCompletion: 41, trend: 'down' },
    ],
    atRisk: [
        { name: 'Arjun Kumar', studentId: 'arjun', attempts: 12, classAvg: 4, errorType: 'None Handling', lastSeen: '35 min ago', action: '1-on-1 recommended' },
        { name: 'Priya Sharma', studentId: 'priya', attempts: 9, classAvg: 4, errorType: 'Async / Await', lastSeen: '2 hrs ago', action: 'Quiz not started' },
        { name: 'Ravi Mehta', studentId: 'ravi', attempts: 7, classAvg: 4, errorType: 'try / except', lastSeen: '1 hr ago', action: 'Below 40% quiz rate' },
        { name: 'Sneha Patel', studentId: 'sneha', attempts: 6, classAvg: 4, errorType: 'None Handling', lastSeen: '4 hrs ago', action: 'Peer mentor suggested' },
    ],
    mastery: [
        { concept: 'Functions & Scope', mastery: 89, target: 80, status: 'good' },
        { concept: 'Loops & Iteration', mastery: 82, target: 80, status: 'good' },
        { concept: 'List Comprehension', mastery: 71, target: 70, status: 'good' },
        { concept: 'Exception Handling', mastery: 45, target: 70, status: 'warn' },
        { concept: 'None / Null Safety', mastery: 38, target: 70, status: 'danger' },
        { concept: 'Async / Await', mastery: 29, target: 60, status: 'danger' },
    ],
    curriculum: [
        { type: 'gap', concept: 'None Handling', taught: 'Day 5 (Week 1)', peakStruggle: 'Day 12 (Week 3)', recommendation: 'Add reinforcement workshop on Day 8 — 7-day gap between teaching and peak struggle' },
        { type: 'missing', concept: 'Async / Await', taught: 'Not formally taught yet', peakStruggle: '58% encountering in personal projects', recommendation: 'Introduce in Week 2 (currently scheduled Week 4)' },
        { type: 'ok', concept: 'List Comprehension', taught: 'Day 7', peakStruggle: 'Day 9 (expected)', recommendation: 'No action needed — students mastering on schedule' },
    ],
    weeklyStats: {
        totalSessions: 1847,
        avgFixTime: 13,
        quizCompletionRate: 47,
        improvementVsLastWeek: '+12%',
    },
    homework: [
        { id: 'hw-001', classroomId: 'DEMO', title: 'Fibonacci with Memoization', body: 'Write a function fibonacci(n)...', filename: 'hw_fibonacci_memoization.py', status: 'open', dueDate: '2026-03-10', submissionCount: 18, totalStudents: 34, avgAttempts: 4.2 },
        { id: 'hw-002', classroomId: 'DEMO', title: 'Safe Dictionary Lookup', body: 'Write a function get_user_email(users, user_id)...', filename: 'hw_safe_dict_lookup.py', status: 'open', dueDate: '2026-03-08', submissionCount: 27, totalStudents: 34, avgAttempts: 2.1 },
    ],
};

// Error type key → display name mapping
const ERROR_DISPLAY = {
    none_handling: 'None / Null Handling',
    async_await: 'Async / Await Syntax',
    try_except: 'Missing try / except',
    list_ops: 'List / Index Bounds',
    type_error: 'Type Errors',
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS — Dynamic data computation
// ═══════════════════════════════════════════════════════════════════════════════

function computeCohortInfo() {
    const totalRegistered = classrooms.reduce((sum, c) => sum + c.students.length, 0);
    const totalStudents = Math.max(SEED.cohortInfo.totalStudents, totalRegistered);

    // Active today = unique studentIds with sessions in last 24h
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentStudents = new Set(
        sessions.filter(s => new Date(s.startTime).getTime() > oneDayAgo).map(s => s.studentId)
    );
    const activeToday = Math.max(SEED.cohortInfo.activeToday, recentStudents.size);

    return { ...SEED.cohortInfo, totalStudents, activeToday };
}

function computeHeatmap() {
    // Start with seed data, augment from real sessions
    const heatmap = SEED.heatmap.map(row => ({ ...row }));

    // Count real sessions by error type
    const sessionsByType = {};
    sessions.forEach(s => {
        const key = s.errorType;
        if (!sessionsByType[key]) sessionsByType[key] = { attempts: 0, totalFix: 0, count: 0 };
        sessionsByType[key].attempts += s.attempts?.length || 1;
        sessionsByType[key].totalFix += s.totalDurationSeconds || 0;
        sessionsByType[key].count++;
    });

    // Merge real data into heatmap
    for (const [key, data] of Object.entries(sessionsByType)) {
        let row = heatmap.find(r => r.key === key);
        if (!row) {
            // New error type not in seed
            row = { errorType: ERROR_DISPLAY[key] || key, key, attempts: 0, pct: 0, avgFixMin: 0, quizCompletion: 0, trend: 'up' };
            heatmap.push(row);
        }
        row.attempts += data.attempts;
        if (data.count > 0) {
            row.avgFixMin = Math.round((row.avgFixMin + (data.totalFix / data.count / 60)) / 2);
        }
    }

    // Update quiz completion from quizResults
    const quizByType = {};
    quizResults.forEach(q => {
        if (!quizByType[q.errorType]) quizByType[q.errorType] = { total: 0, passed: 0 };
        quizByType[q.errorType].total++;
        if (q.score >= q.total * 0.6) quizByType[q.errorType].passed++;
    });
    for (const [key, data] of Object.entries(quizByType)) {
        const row = heatmap.find(r => r.key === key);
        if (row && data.total > 0) {
            row.quizCompletion = Math.round((data.passed / data.total) * 100);
        }
    }

    // Sort by attempts descending
    heatmap.sort((a, b) => b.attempts - a.attempts);

    // Recompute pct relative to max
    const maxAttempts = heatmap[0]?.attempts || 1;
    heatmap.forEach(r => { r.pct = Math.round((r.attempts / maxAttempts) * 100); });

    return heatmap;
}

function computeAtRisk() {
    // Start with seed, add students from real sessions that are struggling
    const atRisk = [...SEED.atRisk];
    const seenIds = new Set(SEED.atRisk.map(s => s.studentId));

    // Group sessions by studentId
    const studentSessions = {};
    sessions.forEach(s => {
        if (!studentSessions[s.studentId]) studentSessions[s.studentId] = [];
        studentSessions[s.studentId].push(s);
    });

    const allAttempts = sessions.reduce((sum, s) => sum + (s.attempts?.length || 1), 0);
    const uniqueStudents = Object.keys(studentSessions).length;
    const classAvg = uniqueStudents > 0 ? Math.round(allAttempts / uniqueStudents) : 4;

    for (const [studentId, studentSess] of Object.entries(studentSessions)) {
        if (seenIds.has(studentId)) continue;

        const totalAttempts = studentSess.reduce((sum, s) => sum + (s.attempts?.length || 1), 0);
        if (totalAttempts > classAvg * 1.5) {
            // This student is struggling
            const topError = studentSess.sort((a, b) => (b.attempts?.length || 0) - (a.attempts?.length || 0))[0];
            const lastSession = studentSess.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];
            const minsAgo = Math.round((Date.now() - new Date(lastSession.startTime).getTime()) / 60000);
            const lastSeenStr = minsAgo < 60 ? `${minsAgo} min ago` : `${Math.round(minsAgo / 60)} hrs ago`;

            atRisk.push({
                name: studentId,
                studentId,
                attempts: totalAttempts,
                classAvg,
                errorType: ERROR_DISPLAY[topError.errorType] || topError.errorType,
                lastSeen: lastSeenStr,
                action: totalAttempts > classAvg * 3 ? '1-on-1 recommended' : 'Monitor closely',
            });
        }
    }

    // Sort by attempts descending
    atRisk.sort((a, b) => b.attempts - a.attempts);
    return atRisk;
}

function computeWeeklyStats() {
    const realSessions = sessions.length;
    const totalSessions = SEED.weeklyStats.totalSessions + realSessions;

    // Average fix time from real + seed
    let avgFixTime = SEED.weeklyStats.avgFixTime;
    if (realSessions > 0) {
        const totalFixSecs = sessions.reduce((sum, s) => sum + (s.totalDurationSeconds || 0), 0);
        const realAvg = totalFixSecs / realSessions / 60;
        avgFixTime = Math.round((SEED.weeklyStats.avgFixTime + realAvg) / 2);
    }

    // Quiz completion from results
    let quizRate = SEED.weeklyStats.quizCompletionRate;
    if (quizResults.length > 0) {
        const passed = quizResults.filter(q => q.score >= q.total * 0.6).length;
        quizRate = Math.round((passed / quizResults.length) * 100);
    }

    const improvement = realSessions > 10 ? `+${Math.round(realSessions / 10)}%` : SEED.weeklyStats.improvementVsLastWeek;

    return { totalSessions, avgFixTime, quizCompletionRate: quizRate, improvementVsLastWeek: improvement };
}

function computeMastery() {
    const mastery = SEED.mastery.map(m => ({ ...m }));

    // Adjust mastery based on quiz scores by concept/errorType mapping
    const conceptToError = {
        'Exception Handling': 'try_except',
        'None / Null Safety': 'none_handling',
        'Async / Await': 'async_await',
        'List Comprehension': 'list_ops',
    };

    for (const m of mastery) {
        const errorKey = conceptToError[m.concept];
        if (!errorKey) continue;

        const relevant = quizResults.filter(q => q.errorType === errorKey);
        if (relevant.length > 0) {
            const avgScore = relevant.reduce((sum, q) => sum + (q.score / q.total), 0) / relevant.length;
            // Blend seed mastery with real quiz performance
            m.mastery = Math.round((m.mastery + avgScore * 100) / 2);
            m.status = m.mastery >= m.target ? 'good' : m.mastery >= m.target * 0.6 ? 'warn' : 'danger';
        }
    }

    return mastery;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — Cohort data (dynamic)
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/cohort/info', (req, res) => res.json(computeCohortInfo()));
app.get('/cohort/heatmap', (req, res) => res.json(computeHeatmap()));
app.get('/cohort/at-risk', (req, res) => res.json(computeAtRisk()));
app.get('/cohort/mastery', (req, res) => res.json(computeMastery()));
app.get('/cohort/curriculum', (req, res) => res.json(SEED.curriculum));
app.get('/cohort/stats', (req, res) => res.json(computeWeeklyStats()));
app.get('/cohort/homework', (req, res) => res.json(SEED.homework));

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — Session ingestion (from VS Code extension)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/sessions', (req, res) => {
    const session = req.body;
    if (!session.sessionId || !session.studentId) {
        return res.status(400).json({ error: 'Missing sessionId or studentId' });
    }

    // Avoid duplicates
    if (!sessions.find(s => s.sessionId === session.sessionId)) {
        sessions.push({
            ...session,
            receivedAt: new Date().toISOString(),
        });
        console.log(`[Synapse] Session ingested: ${session.sessionId} from ${session.studentId} (${session.errorType})`);
    }

    res.status(201).json({ ok: true, totalSessions: sessions.length });
});

app.get('/sessions', (req, res) => {
    const { studentId } = req.query;
    if (studentId) {
        return res.json({ sessions: sessions.filter(s => s.studentId === studentId) });
    }
    res.json({ sessions });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — Quiz results (from VS Code extension)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/quiz/results', (req, res) => {
    const result = req.body;
    if (!result.studentId || !result.errorType) {
        return res.status(400).json({ error: 'Missing studentId or errorType' });
    }
    quizResults.push({ ...result, receivedAt: new Date().toISOString() });
    console.log(`[Synapse] Quiz result: ${result.studentId} scored ${result.score}/${result.total} on ${result.errorType}`);
    res.status(201).json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — Classroom CRUD
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/classrooms', (req, res) => {
    const { name, lang, batch } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing classroom name' });

    const prefix = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const id = `${prefix}-${new Date().getFullYear()}-${rand}`;

    const classroom = {
        id,
        name: name.trim(),
        lang: lang || 'python',
        batch: batch || '',
        students: [],
        sessions: 0,
        createdAt: Date.now(),
    };
    classrooms.push(classroom);
    console.log(`[Synapse] Classroom created: ${id} (${name})`);
    res.status(201).json(classroom);
});

app.get('/classrooms', (req, res) => {
    // Enrich with live session counts
    const enriched = classrooms.map(c => ({
        ...c,
        students: c.students.length,
        sessions: sessions.filter(s => s.cohortId === c.id).length,
    }));
    res.json(enriched);
});

app.get('/classrooms/:id', (req, res) => {
    const c = classrooms.find(c => c.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Classroom not found' });
    res.json({
        ...c,
        students: c.students.length,
        sessions: sessions.filter(s => s.cohortId === c.id).length,
    });
});

app.post('/classrooms/:id/join', (req, res) => {
    const { studentId, studentName } = req.body;
    if (!studentId) return res.status(400).json({ error: 'Missing studentId' });

    const c = classrooms.find(c => c.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Classroom not found' });

    if (!c.students.includes(studentId)) {
        c.students.push(studentId);
        console.log(`[Synapse] Student joined: ${studentName || studentId} → ${c.id}`);
    }
    res.json({ ok: true, totalStudents: c.students.length });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — Homework (per-classroom)
// ═══════════════════════════════════════════════════════════════════════════════

// Extension fetches this
app.get('/classroom/:classroomId/homework', (req, res) => {
    // Return homework assigned to this specific classroom + global (DEMO) assignments
    const hw = SEED.homework.filter(h => h.classroomId === req.params.classroomId || h.classroomId === 'DEMO');
    res.json({ questions: hw.filter(h => h.status === 'open') });
});

app.post('/cohort/homework', (req, res) => {
    const payload = req.body;
    const slug = (payload.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const cohortInfo = computeCohortInfo();
    const newQ = {
        id: `hw-${Date.now()}`,
        classroomId: payload.classroomId || 'DEMO',
        title: payload.title || 'Untitled',
        body: payload.body || '',
        filename: `hw_${slug}.py`,
        status: 'open',
        dueDate: payload.dueDate || null,
        submissionCount: 0,
        totalStudents: cohortInfo.totalStudents,
        avgAttempts: 0,
    };
    SEED.homework.unshift(newQ);
    console.log(`[Synapse] Homework created: ${newQ.title}`);
    res.status(201).json(newQ);
});

app.post('/cohort/homework/:id/close', (req, res) => {
    const hw = SEED.homework.find(h => h.id === req.params.id);
    if (hw) {
        hw.status = 'closed';
        console.log(`[Synapse] Homework closed: ${hw.title}`);
    }
    res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — AI Analysis (Tier 3 — Groq Llama 3.3 70B)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/analyze', async (req, res) => {
    try {
        const { code, errorType, errorMessage, line, filePath } = req.body;
        if (!code || !errorType) {
            return res.status(400).json({ error: 'Missing required fields: code, errorType' });
        }

        const systemPrompt = `You are Synapse, an AI debugging tutor for bootcamp students learning Python. Your goal is NOT to just fix bugs — it's to help students UNDERSTAND their debugging patterns and learn the underlying concepts.

Rules:
- Be concise and educational (bootcamp student level)
- Explain WHY the bug happens, not just how to fix it
- Reference the specific line number
- Suggest a fix but also explain the concept behind it
- Mention related concepts the student should review
- Keep explanations under 150 words
- Return ONLY valid JSON, no markdown`;

        const cohortContext = req.body.cohortContext
            ? `\nCohort data: ${req.body.cohortContext.crashRate || 0}% of students crash on this pattern. Average fix time: ${req.body.cohortContext.avgFixMinutes || 0} minutes.`
            : '';

        const userPrompt = `Analyze this Python debugging issue and respond in JSON format:

File: ${filePath || 'unknown.py'}
Error type: ${errorType}
Error at line: ${line || 'unknown'}
Local analysis message: ${errorMessage || 'Issue detected'}
${cohortContext}

Code:
\`\`\`python
${(code || '').substring(0, 3000)}
\`\`\`

Respond ONLY with this JSON structure (no markdown, no code fences):
{
  "explanation": "Clear explanation of why this bug happens (2-3 sentences)",
  "fixSuggestion": "The corrected code snippet (just the relevant lines)",
  "conceptsToReview": ["concept1", "concept2"],
  "confidence": 85
}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            model: GROQ_MODEL,
            temperature: 0.3,
            max_tokens: 512,
            response_format: { type: 'json_object' },
        });

        const aiText = chatCompletion.choices?.[0]?.message?.content || '{}';

        let aiResult;
        try {
            aiResult = JSON.parse(aiText);
        } catch {
            aiResult = {
                explanation: aiText,
                fixSuggestion: '',
                conceptsToReview: [errorType.replace('_', ' ')],
                confidence: 70,
            };
        }

        console.log(`[Synapse] AI analysis complete for ${errorType} (${GROQ_MODEL})`);
        res.json({
            explanation: aiResult.explanation || 'Analysis could not be completed.',
            fixSuggestion: aiResult.fixSuggestion || '',
            conceptsToReview: aiResult.conceptsToReview || [],
            confidence: aiResult.confidence || 0,
            modelId: GROQ_MODEL,
        });

    } catch (err) {
        console.error('[Synapse] AI analysis error:', err.message);
        res.status(500).json({ error: 'AI analysis failed', details: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log('');
    console.log(`  ╔══════════════════════════════════════════╗`);
    console.log(`  ║  Synapse Local Backend · :${PORT}            ║`);
    console.log(`  ╚══════════════════════════════════════════╝`);
    console.log('');
    console.log('  Cohort:     GET  /cohort/info|heatmap|at-risk|mastery|curriculum|stats|homework');
    console.log('  Sessions:   POST /sessions          GET /sessions?studentId=...');
    console.log('  Quiz:       POST /quiz/results');
    console.log('  AI:         POST /analyze            (Groq Llama 3.3 70B)');
    console.log('  Classrooms: POST /classrooms         GET /classrooms');
    console.log('              POST /classrooms/:id/join');
    console.log('  Homework:   GET  /classroom/:id/homework');
    console.log('              POST /cohort/homework    POST /cohort/homework/:id/close');
    console.log('');
});
