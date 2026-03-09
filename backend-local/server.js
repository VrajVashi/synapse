const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    UpdateCommand,
    ScanCommand,
    QueryCommand,
} = require('@aws-sdk/lib-dynamodb');

// ── Groq ──────────────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// ── DynamoDB client ────────────────────────────────────────────────────────────
// Reads AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY from Railway env vars
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const db = DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: { removeUndefinedValues: true },
});

// Table names (must match the SAM template)
const CLASSROOMS_TABLE = 'synapse-classrooms';
const SESSIONS_TABLE = 'synapse-debugging-sessions';
const USER_PROFILES_TABLE = 'synapse-user-profiles';

// ── Express setup ──────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3001;

// ═══════════════════════════════════════════════════════════════════════════════
// SEED DATA  (static — never written to DynamoDB, just for dashboard metrics)
// ═══════════════════════════════════════════════════════════════════════════════

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
    weeklyStats: { totalSessions: 1847, avgFixTime: 13, quizCompletionRate: 47, improvementVsLastWeek: '+12%' },
    homework: [
        { id: 'hw-001', classroomId: 'DEMO', title: 'Fibonacci with Memoization', body: 'Write a function fibonacci(n)...', filename: 'hw_fibonacci_memoization.py', status: 'open', dueDate: '2026-03-10', submissionCount: 18, totalStudents: 34, avgAttempts: 4.2 },
        { id: 'hw-002', classroomId: 'DEMO', title: 'Safe Dictionary Lookup', body: 'Write a function get_user_email(users, user_id)...', filename: 'hw_safe_dict_lookup.py', status: 'open', dueDate: '2026-03-08', submissionCount: 27, totalStudents: 34, avgAttempts: 2.1 },
    ],
};

const ERROR_DISPLAY = {
    none_handling: 'None / Null Handling',
    async_await: 'Async / Await Syntax',
    try_except: 'Missing try / except',
    list_ops: 'List / Index Bounds',
    type_error: 'Type Errors',
};

// ═══════════════════════════════════════════════════════════════════════════════
// DynamoDB HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Scan entire table — use sparingly on large tables */
async function scanAll(tableName) {
    const items = [];
    let lastKey;
    do {
        const cmd = new ScanCommand({
            TableName: tableName,
            ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
        });
        const result = await db.send(cmd);
        items.push(...(result.Items || []));
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return items;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — Cohort metrics (still uses SEED + live DynamoDB sessions)
// ═══════════════════════════════════════════════════════════════════════════════

async function getLiveSessions() {
    try { return await scanAll(SESSIONS_TABLE); } catch { return []; }
}
async function getLiveQuizResults() {
    try {
        const profiles = await scanAll(USER_PROFILES_TABLE);
        return profiles.flatMap(p => p.quizResults || []);
    } catch { return []; }
}

app.get('/cohort/info', async (req, res) => {
    const sessions = await getLiveSessions();
    const oneDayAgo = Date.now() - 86400000;
    const recentStudents = new Set(sessions.filter(s => new Date(s.startTime).getTime() > oneDayAgo).map(s => s.studentId));
    const classrooms = await scanAll(CLASSROOMS_TABLE).catch(() => []);
    const totalRegistered = classrooms.reduce((sum, c) => sum + (c.students?.length || 0), 0);
    res.json({
        ...SEED.cohortInfo,
        totalStudents: Math.max(SEED.cohortInfo.totalStudents, totalRegistered),
        activeToday: Math.max(SEED.cohortInfo.activeToday, recentStudents.size),
    });
});

app.get('/cohort/heatmap', async (req, res) => {
    const sessions = await getLiveSessions();
    const quizResults = await getLiveQuizResults();
    const heatmap = SEED.heatmap.map(r => ({ ...r }));

    const byType = {};
    sessions.forEach(s => {
        if (!byType[s.errorType]) byType[s.errorType] = { attempts: 0, totalFix: 0, count: 0 };
        byType[s.errorType].attempts += s.attempts?.length || 1;
        byType[s.errorType].totalFix += s.totalDurationSeconds || 0;
        byType[s.errorType].count++;
    });
    for (const [key, data] of Object.entries(byType)) {
        let row = heatmap.find(r => r.key === key);
        if (!row) { row = { errorType: ERROR_DISPLAY[key] || key, key, attempts: 0, pct: 0, avgFixMin: 0, quizCompletion: 0, trend: 'up' }; heatmap.push(row); }
        row.attempts += data.attempts;
        if (data.count > 0) row.avgFixMin = Math.round((row.avgFixMin + data.totalFix / data.count / 60) / 2);
    }

    const quizByType = {};
    quizResults.forEach(q => {
        if (!quizByType[q.errorType]) quizByType[q.errorType] = { total: 0, passed: 0 };
        quizByType[q.errorType].total++;
        if (q.score >= q.total * 0.6) quizByType[q.errorType].passed++;
    });
    for (const [key, data] of Object.entries(quizByType)) {
        const row = heatmap.find(r => r.key === key);
        if (row && data.total > 0) row.quizCompletion = Math.round((data.passed / data.total) * 100);
    }

    heatmap.sort((a, b) => b.attempts - a.attempts);
    const maxAttempts = heatmap[0]?.attempts || 1;
    heatmap.forEach(r => { r.pct = Math.round((r.attempts / maxAttempts) * 100); });
    res.json(heatmap);
});

app.get('/cohort/at-risk', async (req, res) => {
    const sessions = await getLiveSessions();
    const atRisk = [...SEED.atRisk];
    const seenIds = new Set(SEED.atRisk.map(s => s.studentId));
    const byStudent = {};
    sessions.forEach(s => { if (!byStudent[s.studentId]) byStudent[s.studentId] = []; byStudent[s.studentId].push(s); });
    const allAttempts = sessions.reduce((sum, s) => sum + (s.attempts?.length || 1), 0);
    const uniqueStudents = Object.keys(byStudent).length;
    const classAvg = uniqueStudents > 0 ? Math.round(allAttempts / uniqueStudents) : 4;
    for (const [studentId, ss] of Object.entries(byStudent)) {
        if (seenIds.has(studentId)) continue;
        const total = ss.reduce((sum, s) => sum + (s.attempts?.length || 1), 0);
        if (total > classAvg * 1.5) {
            const top = ss.sort((a, b) => (b.attempts?.length || 0) - (a.attempts?.length || 0))[0];
            const last = ss.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];
            const mins = Math.round((Date.now() - new Date(last.startTime).getTime()) / 60000);
            atRisk.push({ name: studentId, studentId, attempts: total, classAvg, errorType: ERROR_DISPLAY[top.errorType] || top.errorType, lastSeen: mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} hrs ago`, action: total > classAvg * 3 ? '1-on-1 recommended' : 'Monitor closely' });
        }
    }
    atRisk.sort((a, b) => b.attempts - a.attempts);
    res.json(atRisk);
});

app.get('/cohort/mastery', async (req, res) => {
    const quizResults = await getLiveQuizResults();
    const mastery = SEED.mastery.map(m => ({ ...m }));
    const conceptMap = { 'Exception Handling': 'try_except', 'None / Null Safety': 'none_handling', 'Async / Await': 'async_await', 'List Comprehension': 'list_ops' };
    for (const m of mastery) {
        const key = conceptMap[m.concept];
        if (!key) continue;
        const relevant = quizResults.filter(q => q.errorType === key);
        if (relevant.length > 0) {
            const avg = relevant.reduce((sum, q) => sum + (q.score / q.total), 0) / relevant.length;
            m.mastery = Math.round((m.mastery + avg * 100) / 2);
            m.status = m.mastery >= m.target ? 'good' : m.mastery >= m.target * 0.6 ? 'warn' : 'danger';
        }
    }
    res.json(mastery);
});

app.get('/cohort/curriculum', (req, res) => res.json(SEED.curriculum));

app.get('/cohort/stats', async (req, res) => {
    const sessions = await getLiveSessions();
    const quizResults = await getLiveQuizResults();
    const total = SEED.weeklyStats.totalSessions + sessions.length;
    let avgFixTime = SEED.weeklyStats.avgFixTime;
    if (sessions.length > 0) {
        const secs = sessions.reduce((sum, s) => sum + (s.totalDurationSeconds || 0), 0);
        avgFixTime = Math.round((SEED.weeklyStats.avgFixTime + secs / sessions.length / 60) / 2);
    }
    let quizRate = SEED.weeklyStats.quizCompletionRate;
    if (quizResults.length > 0) {
        const passed = quizResults.filter(q => q.score >= q.total * 0.6).length;
        quizRate = Math.round((passed / quizResults.length) * 100);
    }
    const improvement = sessions.length > 10 ? `+${Math.round(sessions.length / 10)}%` : SEED.weeklyStats.improvementVsLastWeek;
    res.json({ totalSessions: total, avgFixTime, quizCompletionRate: quizRate, improvementVsLastWeek: improvement });
});

app.get('/cohort/homework', (req, res) => res.json(SEED.homework));

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — Sessions  (DynamoDB: synapse-debugging-sessions)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/sessions', async (req, res) => {
    const session = req.body;
    if (!session.sessionId || !session.studentId) {
        return res.status(400).json({ error: 'Missing sessionId or studentId' });
    }
    try {
        await db.send(new PutCommand({
            TableName: SESSIONS_TABLE,
            ConditionExpression: 'attribute_not_exists(session_id)',   // no duplicates
            Item: {
                session_id: session.sessionId,
                timestamp: Date.now(),
                user_id: session.studentId,
                cohort_id: session.cohortId || 'UNKNOWN',
                error_type: session.errorType || 'unknown',
                ...session,
                receivedAt: new Date().toISOString(),
            },
        }));
        console.log(`[Synapse] Session ingested: ${session.sessionId} from ${session.studentId}`);
        res.status(201).json({ ok: true });
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return res.status(200).json({ ok: true, note: 'duplicate — ignored' });
        }
        console.error('[Synapse] /sessions POST error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/sessions', async (req, res) => {
    const { studentId } = req.query;
    try {
        if (studentId) {
            const result = await db.send(new QueryCommand({
                TableName: SESSIONS_TABLE,
                IndexName: 'user_id-timestamp-index',
                KeyConditionExpression: 'user_id = :uid',
                ExpressionAttributeValues: { ':uid': studentId },
            }));
            return res.json({ sessions: result.Items || [] });
        }
        res.json({ sessions: await scanAll(SESSIONS_TABLE) });
    } catch (err) {
        console.error('[Synapse] /sessions GET error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — Quiz results  (DynamoDB: synapse-user-profiles, list attribute)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/quiz/results', async (req, res) => {
    const result = req.body;
    if (!result.studentId || !result.errorType) {
        return res.status(400).json({ error: 'Missing studentId or errorType' });
    }
    const quizEntry = { ...result, receivedAt: new Date().toISOString() };
    try {
        // Append to the quizResults list on the user's profile (create profile if absent)
        await db.send(new UpdateCommand({
            TableName: USER_PROFILES_TABLE,
            Key: { user_id: result.studentId },
            UpdateExpression: 'SET quizResults = list_append(if_not_exists(quizResults, :empty), :entry)',
            ExpressionAttributeValues: { ':empty': [], ':entry': [quizEntry] },
        }));
        console.log(`[Synapse] Quiz result saved: ${result.studentId} scored ${result.score}/${result.total} on ${result.errorType}`);
        res.status(201).json({ ok: true });
    } catch (err) {
        console.error('[Synapse] /quiz/results POST error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — Classrooms  (DynamoDB: synapse-classrooms)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/classrooms', async (req, res) => {
    const { name, lang, batch } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing classroom name' });

    const prefix = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const id = `${prefix}-${new Date().getFullYear()}-${rand}`;

    const classroom = {
        classroom_id: id,
        name: name.trim(),
        lang: lang || 'python',
        batch: batch || '',
        students: [],
        createdAt: Date.now(),
    };
    try {
        await db.send(new PutCommand({ TableName: CLASSROOMS_TABLE, Item: classroom }));
        console.log(`[Synapse] Classroom created: ${id} (${name})`);
        res.status(201).json({ ...classroom, id });            // expose `id` for extension compatibility
    } catch (err) {
        console.error('[Synapse] /classrooms POST error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/classrooms', async (req, res) => {
    try {
        const items = await scanAll(CLASSROOMS_TABLE);
        res.json(items.map(c => ({ ...c, id: c.classroom_id, students: c.students?.length || 0 })));
    } catch (err) {
        console.error('[Synapse] /classrooms GET error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/classrooms/:id', async (req, res) => {
    try {
        const result = await db.send(new GetCommand({
            TableName: CLASSROOMS_TABLE,
            Key: { classroom_id: req.params.id },
        }));
        if (!result.Item) return res.status(404).json({ error: 'Classroom not found' });
        const c = result.Item;
        res.json({ ...c, id: c.classroom_id, students: c.students?.length || 0 });
    } catch (err) {
        console.error('[Synapse] /classrooms/:id GET error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/classrooms/:id/join', async (req, res) => {
    const { studentId, studentName } = req.body;
    if (!studentId) return res.status(400).json({ error: 'Missing studentId' });

    try {
        // First, verify classroom exists
        const existing = await db.send(new GetCommand({
            TableName: CLASSROOMS_TABLE,
            Key: { classroom_id: req.params.id },
        }));
        if (!existing.Item) return res.status(404).json({ error: 'Classroom not found' });

        // Append studentId to students list if not already present
        // DynamoDB doesn't have a native "add if not in set" for lists, so we use ADD with a StringSet
        await db.send(new UpdateCommand({
            TableName: CLASSROOMS_TABLE,
            Key: { classroom_id: req.params.id },
            UpdateExpression: 'ADD students :s',
            ExpressionAttributeValues: { ':s': new Set([studentId]) },
        }));

        console.log(`[Synapse] Student joined: ${studentName || studentId} → ${req.params.id}`);
        const updated = await db.send(new GetCommand({ TableName: CLASSROOMS_TABLE, Key: { classroom_id: req.params.id } }));
        res.json({ ok: true, totalStudents: updated.Item?.students?.size || 0 });
    } catch (err) {
        console.error('[Synapse] /classrooms/:id/join POST error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — Homework  (still SEED-based — instructors post via dashboard)
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/classroom/:classroomId/homework', (req, res) => {
    const hw = SEED.homework.filter(h => h.classroomId === req.params.classroomId || h.classroomId === 'DEMO');
    res.json({ questions: hw.filter(h => h.status === 'open') });
});

app.post('/cohort/homework', (req, res) => {
    const payload = req.body;
    const slug = (payload.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const newQ = {
        id: `hw-${Date.now()}`,
        classroomId: payload.classroomId || 'DEMO',
        title: payload.title || 'Untitled',
        body: payload.body || '',
        filename: `hw_${slug}.py`,
        status: 'open',
        dueDate: payload.dueDate || null,
        submissionCount: 0,
        totalStudents: SEED.cohortInfo.totalStudents,
        avgAttempts: 0,
    };
    SEED.homework.unshift(newQ);
    console.log(`[Synapse] Homework created: ${newQ.title}`);
    res.status(201).json(newQ);
});

app.post('/cohort/homework/:id/close', (req, res) => {
    const hw = SEED.homework.find(h => h.id === req.params.id);
    if (hw) { hw.status = 'closed'; console.log(`[Synapse] Homework closed: ${hw.title}`); }
    res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — AI Analysis  (Groq Llama 3.3 70B)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/analyze', async (req, res) => {
    try {
        const { code, errorType, errorMessage, line, filePath } = req.body;
        if (!code || !errorType) return res.status(400).json({ error: 'Missing required fields: code, errorType' });

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
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
            model: GROQ_MODEL,
            temperature: 0.3,
            max_tokens: 512,
            response_format: { type: 'json_object' },
        });

        let aiResult;
        try { aiResult = JSON.parse(chatCompletion.choices?.[0]?.message?.content || '{}'); }
        catch { aiResult = { explanation: chatCompletion.choices?.[0]?.message?.content || 'Analysis could not be completed.', fixSuggestion: '', conceptsToReview: [errorType.replace('_', ' ')], confidence: 70 }; }

        console.log(`[Synapse] AI analysis complete for ${errorType} (${GROQ_MODEL})`);
        res.json({ explanation: aiResult.explanation || 'Analysis could not be completed.', fixSuggestion: aiResult.fixSuggestion || '', conceptsToReview: aiResult.conceptsToReview || [], confidence: aiResult.confidence || 0, modelId: GROQ_MODEL });
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
    console.log(`  ║  Synapse Backend · :${PORT}                  ║`);
    console.log(`  ║  Storage: AWS DynamoDB                   ║`);
    console.log(`  ╚══════════════════════════════════════════╝`);
    console.log('');
    console.log('  Region:', process.env.AWS_REGION || 'ap-south-1 (default)');
    console.log('  Tables:', CLASSROOMS_TABLE, '|', SESSIONS_TABLE, '|', USER_PROFILES_TABLE);
    console.log('');
    console.log('  Cohort:     GET  /cohort/info|heatmap|at-risk|mastery|curriculum|stats|homework');
    console.log('  Sessions:   POST /sessions          GET /sessions?studentId=...');
    console.log('  Quiz:       POST /quiz/results');
    console.log('  AI:         POST /analyze');
    console.log('  Classrooms: POST /classrooms         GET /classrooms');
    console.log('              GET  /classrooms/:id     POST /classrooms/:id/join');
    console.log('  Homework:   GET  /classroom/:id/homework');
    console.log('              POST /cohort/homework    POST /cohort/homework/:id/close');
    console.log('');
});
