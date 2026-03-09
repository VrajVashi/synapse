const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const { SNSClient, PublishCommand, SubscribeCommand } = require('@aws-sdk/client-sns');

// ── Groq ──────────────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// ── AWS config (reads Railway env vars) ──────────────────────────────────────
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const awsCfg = { region: AWS_REGION };

const ddbClient = new DynamoDBClient(awsCfg);
const db = DynamoDBDocumentClient.from(ddbClient, { marshallOptions: { removeUndefinedValues: true } });
const s3 = new S3Client(awsCfg);
const cw = new CloudWatchClient(awsCfg);
const sns = new SNSClient(awsCfg);

// ── Table / resource names ────────────────────────────────────────────────────
const CLASSROOMS_TABLE = 'synapse-classrooms';
const SESSIONS_TABLE = 'synapse-debugging-sessions';
const USER_PROFILES_TABLE = 'synapse-user-profiles';
const SNAPSHOTS_BUCKET = process.env.SNAPSHOTS_BUCKET || '';          // e.g. synapse-code-snapshots-123456789
const ATRISK_TOPIC_ARN = process.env.ATRISK_TOPIC_ARN || '';          // from Railway env var after sam deploy
const CW_NAMESPACE = 'Synapse/Production';
const AT_RISK_THRESHOLD = 5;   // attempts on one errorType before alerting

// ── Express ───────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3001;

// ═══════════════════════════════════════════════════════════════════════════════
// AWS HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Push a custom metric to CloudWatch */
async function putMetric(metricName, value, unit = 'Count', dimensions = []) {
    if (!AWS_REGION) return;
    try {
        await cw.send(new PutMetricDataCommand({
            Namespace: CW_NAMESPACE,
            MetricData: [{
                MetricName: metricName,
                Value: value,
                Unit: unit,
                Timestamp: new Date(),
                Dimensions: dimensions,
            }],
        }));
    } catch (e) {
        console.warn(`[Synapse CW] Failed to push metric "${metricName}":`, e.message);
    }
}

/** Upload a code snapshot string to S3 */
async function uploadSnapshot(studentId, sessionId, attemptNumber, code) {
    if (!SNAPSHOTS_BUCKET || !code) return null;
    const key = `snapshots/${studentId}/${sessionId}/attempt_${attemptNumber}.py`;
    try {
        await s3.send(new PutObjectCommand({
            Bucket: SNAPSHOTS_BUCKET,
            Key: key,
            Body: code,
            ContentType: 'text/x-python',
            Metadata: { studentId, sessionId, attempt: String(attemptNumber) },
        }));
        return key;
    } catch (e) {
        console.warn(`[Synapse S3] Snapshot upload failed (${key}):`, e.message);
        return null;
    }
}

/** Publish an at-risk alert to SNS */
async function publishAtRiskAlert(studentId, errorType, attemptCount, classroomId) {
    if (!ATRISK_TOPIC_ARN) return;
    try {
        await sns.send(new PublishCommand({
            TopicArn: ATRISK_TOPIC_ARN,
            Subject: `⚠ Synapse Alert — At-Risk Student Detected`,
            Message: [
                `Student "${studentId}" may need help!`,
                ``,
                `Error type : ${errorType}`,
                `Attempts   : ${attemptCount} (threshold: ${AT_RISK_THRESHOLD})`,
                `Classroom  : ${classroomId || 'unknown'}`,
                `Time       : ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
                ``,
                `Log in to the Synapse instructor dashboard to review their session replay.`,
            ].join('\n'),
            MessageAttributes: {
                studentId: { DataType: 'String', StringValue: studentId },
                errorType: { DataType: 'String', StringValue: errorType },
                attemptCount: { DataType: 'Number', StringValue: String(attemptCount) },
            },
        }));
        console.log(`[Synapse SNS] At-risk alert published for ${studentId} (${errorType}, ${attemptCount} attempts)`);
    } catch (e) {
        console.warn('[Synapse SNS] Failed to publish alert:', e.message);
    }
}

/** Scan entire DynamoDB table with pagination */
async function scanAll(tableName) {
    const items = [];
    let lastKey;
    do {
        const result = await db.send(new ScanCommand({ TableName: tableName, ...(lastKey ? { ExclusiveStartKey: lastKey } : {}) }));
        items.push(...(result.Items || []));
        lastKey = result.LastEvaluatedKey;
    } while (lastKey);
    return items;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEED DATA (static — for dashboard metrics baseline)
// ═══════════════════════════════════════════════════════════════════════════════

const SEED = {
    cohortInfo: { name: 'Full Stack Cohort 12', week: 3, totalStudents: 34, activeToday: 27 },
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
        { type: 'gap', concept: 'None Handling', taught: 'Day 5 (Week 1)', peakStruggle: 'Day 12 (Week 3)', recommendation: 'Add reinforcement on Day 8' },
        { type: 'missing', concept: 'Async / Await', taught: 'Not formally taught yet', peakStruggle: '58% encountering in personal projects', recommendation: 'Introduce in Week 2' },
        { type: 'ok', concept: 'List Comprehension', taught: 'Day 7', peakStruggle: 'Day 9 (expected)', recommendation: 'No action needed' },
    ],
    weeklyStats: { totalSessions: 1847, avgFixTime: 13, quizCompletionRate: 47, improvementVsLastWeek: '+12%' },
    homework: [
        { id: 'hw-001', classroomId: 'DEMO', title: 'Fibonacci with Memoization', body: 'Write a function fibonacci(n)...', filename: 'hw_fibonacci_memoization.py', status: 'open', dueDate: '2026-03-10', submissionCount: 18, totalStudents: 34, avgAttempts: 4.2 },
        { id: 'hw-002', classroomId: 'DEMO', title: 'Safe Dictionary Lookup', body: 'Write a function get_user_email(users, user_id)...', filename: 'hw_safe_dict_lookup.py', status: 'open', dueDate: '2026-03-08', submissionCount: 27, totalStudents: 34, avgAttempts: 2.1 },
    ],
};

const ERROR_DISPLAY = { none_handling: 'None / Null Handling', async_await: 'Async / Await Syntax', try_except: 'Missing try / except', list_ops: 'List / Index Bounds', type_error: 'Type Errors' };

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE DATA HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function getLiveSessions() { try { return await scanAll(SESSIONS_TABLE); } catch { return []; } }
async function getLiveQuizResults() { try { const p = await scanAll(USER_PROFILES_TABLE); return p.flatMap(u => u.quizResults || []); } catch { return []; } }

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — Cohort metrics
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/cohort/info', async (req, res) => {
    const [sessions, classrooms] = await Promise.all([getLiveSessions(), scanAll(CLASSROOMS_TABLE).catch(() => [])]);
    const oneDayAgo = Date.now() - 86400000;
    const recentStudents = new Set(sessions.filter(s => new Date(s.startTime).getTime() > oneDayAgo).map(s => s.studentId));
    const totalRegistered = classrooms.reduce((sum, c) => sum + (c.students?.size || c.students?.length || 0), 0);
    res.json({ ...SEED.cohortInfo, totalStudents: Math.max(SEED.cohortInfo.totalStudents, totalRegistered), activeToday: Math.max(SEED.cohortInfo.activeToday, recentStudents.size) });
});

app.get('/cohort/heatmap', async (req, res) => {
    const [sessions, quizResults] = await Promise.all([getLiveSessions(), getLiveQuizResults()]);
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
    const max = heatmap[0]?.attempts || 1;
    heatmap.forEach(r => { r.pct = Math.round((r.attempts / max) * 100); });
    res.json(heatmap);
});

app.get('/cohort/at-risk', async (req, res) => {
    const sessions = await getLiveSessions();
    const atRisk = [...SEED.atRisk];
    const seenIds = new Set(SEED.atRisk.map(s => s.studentId));
    const byStudent = {};
    sessions.forEach(s => { if (!byStudent[s.studentId]) byStudent[s.studentId] = []; byStudent[s.studentId].push(s); });
    const allAttempts = sessions.reduce((sum, s) => sum + (s.attempts?.length || 1), 0);
    const classAvg = Object.keys(byStudent).length > 0 ? Math.round(allAttempts / Object.keys(byStudent).length) : 4;
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
    const map = { 'Exception Handling': 'try_except', 'None / Null Safety': 'none_handling', 'Async / Await': 'async_await', 'List Comprehension': 'list_ops' };
    for (const m of mastery) {
        const key = map[m.concept]; if (!key) continue;
        const rel = quizResults.filter(q => q.errorType === key);
        if (rel.length > 0) { const avg = rel.reduce((s, q) => s + q.score / q.total, 0) / rel.length; m.mastery = Math.round((m.mastery + avg * 100) / 2); m.status = m.mastery >= m.target ? 'good' : m.mastery >= m.target * 0.6 ? 'warn' : 'danger'; }
    }
    res.json(mastery);
});

app.get('/cohort/curriculum', (req, res) => res.json(SEED.curriculum));

app.get('/cohort/stats', async (req, res) => {
    const [sessions, quizResults] = await Promise.all([getLiveSessions(), getLiveQuizResults()]);
    let avgFixTime = SEED.weeklyStats.avgFixTime;
    if (sessions.length > 0) { const secs = sessions.reduce((s, x) => s + (x.totalDurationSeconds || 0), 0); avgFixTime = Math.round((SEED.weeklyStats.avgFixTime + secs / sessions.length / 60) / 2); }
    let quizRate = SEED.weeklyStats.quizCompletionRate;
    if (quizResults.length > 0) { const passed = quizResults.filter(q => q.score >= q.total * 0.6).length; quizRate = Math.round((passed / quizResults.length) * 100); }
    res.json({ totalSessions: SEED.weeklyStats.totalSessions + sessions.length, avgFixTime, quizCompletionRate: quizRate, improvementVsLastWeek: sessions.length > 10 ? `+${Math.round(sessions.length / 10)}%` : SEED.weeklyStats.improvementVsLastWeek });
});

app.get('/cohort/homework', (req, res) => res.json(SEED.homework));

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — Sessions  (DynamoDB + S3 snapshots + CloudWatch + SNS)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/sessions', async (req, res) => {
    const session = req.body;
    if (!session.sessionId || !session.studentId) return res.status(400).json({ error: 'Missing sessionId or studentId' });

    // ── 1. Upload each code snapshot to S3 ──────────────────────────────────
    const snapshotKeys = [];
    if (session.attempts?.length && SNAPSHOTS_BUCKET) {
        for (const attempt of session.attempts) {
            const key = await uploadSnapshot(session.studentId, session.sessionId, attempt.attemptNumber, attempt.codeSnapshot);
            if (key) snapshotKeys.push(key);
        }
    }

    // ── 2. Write session to DynamoDB ─────────────────────────────────────────
    try {
        await db.send(new PutCommand({
            TableName: SESSIONS_TABLE,
            ConditionExpression: 'attribute_not_exists(session_id)',
            Item: {
                session_id: session.sessionId,
                timestamp: Date.now(),
                user_id: session.studentId,
                cohort_id: session.cohortId || 'UNKNOWN',
                error_type: session.errorType || 'unknown',
                ...session,
                snapshotKeys,
                receivedAt: new Date().toISOString(),
            },
        }));
        console.log(`[Synapse] Session ingested: ${session.sessionId} from ${session.studentId}${snapshotKeys.length ? ` (${snapshotKeys.length} snapshots → S3)` : ''}`);
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') return res.status(200).json({ ok: true, note: 'duplicate' });
        console.error('[Synapse] /sessions write error:', err.message);
        return res.status(500).json({ error: err.message });
    }

    // ── 3. CloudWatch metric ─────────────────────────────────────────────────
    const attemptCount = session.attempts?.length || 1;
    putMetric('SessionsRecorded', 1, 'Count', [{ Name: 'ErrorType', Value: session.errorType || 'unknown' }]);
    putMetric('TotalAttempts', attemptCount, 'Count', [{ Name: 'StudentId', Value: session.studentId }]);
    if (session.resolved) putMetric('SessionsResolved', 1, 'Count');
    if (snapshotKeys.length) putMetric('SnapshotsUploaded', snapshotKeys.length, 'Count');

    // ── 4. SNS at-risk alert if attempts are high ────────────────────────────
    if (attemptCount >= AT_RISK_THRESHOLD) {
        publishAtRiskAlert(session.studentId, session.errorType || 'unknown', attemptCount, session.cohortId);
    }

    res.status(201).json({ ok: true, snapshotKeys });
});

app.get('/sessions', async (req, res) => {
    const { studentId } = req.query;
    try {
        if (studentId) {
            const result = await db.send(new QueryCommand({ TableName: SESSIONS_TABLE, IndexName: 'user_id-timestamp-index', KeyConditionExpression: 'user_id = :uid', ExpressionAttributeValues: { ':uid': studentId } }));
            return res.json({ sessions: result.Items || [] });
        }
        res.json({ sessions: await scanAll(SESSIONS_TABLE) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — Quiz results  (DynamoDB + CloudWatch)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/quiz/results', async (req, res) => {
    const result = req.body;
    if (!result.studentId || !result.errorType) return res.status(400).json({ error: 'Missing studentId or errorType' });
    try {
        await db.send(new UpdateCommand({
            TableName: USER_PROFILES_TABLE,
            Key: { user_id: result.studentId },
            UpdateExpression: 'SET quizResults = list_append(if_not_exists(quizResults, :empty), :entry)',
            ExpressionAttributeValues: { ':empty': [], ':entry': [{ ...result, receivedAt: new Date().toISOString() }] },
        }));
        // CloudWatch metrics for quiz performance
        const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
        putMetric('QuizSubmissions', 1, 'Count', [{ Name: 'ErrorType', Value: result.errorType }]);
        putMetric('QuizScorePct', pct, 'Percent', [{ Name: 'ErrorType', Value: result.errorType }]);
        if (pct >= 60) putMetric('QuizPasses', 1, 'Count');
        console.log(`[Synapse] Quiz result: ${result.studentId} scored ${result.score}/${result.total} (${pct}%) on ${result.errorType}`);
        res.status(201).json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — Classrooms  (DynamoDB)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/classrooms', async (req, res) => {
    const { name, lang, batch } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing classroom name' });
    const prefix = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const id = `${prefix}-${new Date().getFullYear()}-${rand}`;
    const classroom = { classroom_id: id, name: name.trim(), lang: lang || 'python', batch: batch || '', students: new Set(), createdAt: Date.now() };
    try {
        await db.send(new PutCommand({ TableName: CLASSROOMS_TABLE, Item: classroom }));
        putMetric('ClassroomsCreated', 1, 'Count');
        console.log(`[Synapse] Classroom created: ${id} (${name})`);
        res.status(201).json({ ...classroom, id, students: 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/classrooms', async (req, res) => {
    try {
        const items = await scanAll(CLASSROOMS_TABLE);
        res.json(items.map(c => ({ ...c, id: c.classroom_id, students: c.students?.size || c.students?.length || 0 })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/classrooms/:id', async (req, res) => {
    try {
        const result = await db.send(new GetCommand({ TableName: CLASSROOMS_TABLE, Key: { classroom_id: req.params.id } }));
        if (!result.Item) return res.status(404).json({ error: 'Classroom not found' });
        const c = result.Item;
        res.json({ ...c, id: c.classroom_id, students: c.students?.size || c.students?.length || 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/classrooms/:id/join', async (req, res) => {
    const { studentId, studentName } = req.body;
    if (!studentId) return res.status(400).json({ error: 'Missing studentId' });
    try {
        const existing = await db.send(new GetCommand({ TableName: CLASSROOMS_TABLE, Key: { classroom_id: req.params.id } }));
        if (!existing.Item) return res.status(404).json({ error: 'Classroom not found' });
        await db.send(new UpdateCommand({ TableName: CLASSROOMS_TABLE, Key: { classroom_id: req.params.id }, UpdateExpression: 'ADD students :s', ExpressionAttributeValues: { ':s': new Set([studentId]) } }));
        putMetric('StudentsJoined', 1, 'Count', [{ Name: 'ClassroomId', Value: req.params.id }]);
        console.log(`[Synapse] Student joined: ${studentName || studentId} → ${req.params.id}`);
        const updated = await db.send(new GetCommand({ TableName: CLASSROOMS_TABLE, Key: { classroom_id: req.params.id } }));
        res.json({ ok: true, totalStudents: updated.Item?.students?.size || 0 });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — Admin / SNS subscription
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /admin/subscribe-alerts
 * Body: { email: "instructor@school.com" }
 * Subscribes an instructor email to the SNS at-risk topic.
 * They get a confirmation email from AWS — must click to activate.
 */
app.post('/admin/subscribe-alerts', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!ATRISK_TOPIC_ARN) return res.status(503).json({ error: 'SNS topic not configured (set ATRISK_TOPIC_ARN env var)' });
    try {
        const result = await sns.send(new SubscribeCommand({ TopicArn: ATRISK_TOPIC_ARN, Protocol: 'email', Endpoint: email }));
        console.log(`[Synapse SNS] Subscribed ${email} to at-risk alerts`);
        res.json({ ok: true, subscriptionArn: result.SubscriptionArn, message: `Confirmation email sent to ${email} — click the link to activate alerts.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES — Homework (SEED-based)
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/classroom/:classroomId/homework', (req, res) => {
    const hw = SEED.homework.filter(h => h.classroomId === req.params.classroomId || h.classroomId === 'DEMO');
    res.json({ questions: hw.filter(h => h.status === 'open') });
});

app.post('/cohort/homework', (req, res) => {
    const p = req.body;
    const slug = (p.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const newQ = { id: `hw-${Date.now()}`, classroomId: p.classroomId || 'DEMO', title: p.title || 'Untitled', body: p.body || '', filename: `hw_${slug}.py`, status: 'open', dueDate: p.dueDate || null, submissionCount: 0, totalStudents: SEED.cohortInfo.totalStudents, avgAttempts: 0 };
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
// ROUTES — AI Analysis (Groq Llama 3.3 70B)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/analyze', async (req, res) => {
    try {
        const { code, errorType, errorMessage, line, filePath } = req.body;
        if (!code || !errorType) return res.status(400).json({ error: 'Missing required fields: code, errorType' });

        const systemPrompt = `You are Synapse, an AI debugging tutor for bootcamp students learning Python. Your goal is NOT to just fix bugs — it's to help students UNDERSTAND their debugging patterns and learn the underlying concepts.\n\nRules:\n- Be concise and educational (bootcamp student level)\n- Explain WHY the bug happens, not just how to fix it\n- Reference the specific line number\n- Suggest a fix but also explain the concept behind it\n- Mention related concepts the student should review\n- Keep explanations under 150 words\n- Return ONLY valid JSON, no markdown`;
        const cohortCtx = req.body.cohortContext ? `\nCohort data: ${req.body.cohortContext.crashRate || 0}% crash on this. Avg fix: ${req.body.cohortContext.avgFixMinutes || 0} min.` : '';
        const userPrompt = `Analyze this Python debugging issue:\n\nFile: ${filePath || 'unknown.py'}\nError type: ${errorType}\nLine: ${line || '?'}\nMessage: ${errorMessage || 'issue detected'}${cohortCtx}\n\nCode:\n\`\`\`python\n${(code || '').substring(0, 3000)}\n\`\`\`\n\nRespond ONLY with:\n{"explanation":"...","fixSuggestion":"...","conceptsToReview":["..."],"confidence":85}`;

        const completion = await groq.chat.completions.create({ messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], model: GROQ_MODEL, temperature: 0.3, max_tokens: 512, response_format: { type: 'json_object' } });
        let aiResult;
        try { aiResult = JSON.parse(completion.choices?.[0]?.message?.content || '{}'); }
        catch { aiResult = { explanation: completion.choices?.[0]?.message?.content || 'Analysis failed.', fixSuggestion: '', conceptsToReview: [], confidence: 70 }; }

        // CloudWatch metric for AI analyses
        putMetric('AIAnalysesRequested', 1, 'Count', [{ Name: 'ErrorType', Value: errorType }]);
        console.log(`[Synapse] AI analysis complete for ${errorType}`);
        res.json({ explanation: aiResult.explanation || '', fixSuggestion: aiResult.fixSuggestion || '', conceptsToReview: aiResult.conceptsToReview || [], confidence: aiResult.confidence || 0, modelId: GROQ_MODEL });
    } catch (err) {
        console.error('[Synapse] AI error:', err.message);
        res.status(500).json({ error: 'AI analysis failed', details: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log('');
    console.log(`  ╔══════════════════════════════════════════════════╗`);
    console.log(`  ║  Synapse Backend · :${PORT}                           ║`);
    console.log(`  ║  AWS: DynamoDB · S3 · CloudWatch · SNS           ║`);
    console.log(`  ╚══════════════════════════════════════════════════╝`);
    console.log('');
    console.log('  Region  :', AWS_REGION);
    console.log('  S3      :', SNAPSHOTS_BUCKET || '⚠ SNAPSHOTS_BUCKET not set');
    console.log('  SNS     :', ATRISK_TOPIC_ARN || '⚠ ATRISK_TOPIC_ARN not set');
    console.log('  CW NS   :', CW_NAMESPACE);
    console.log('');
    console.log('  POST /sessions               → DynamoDB + S3 + CloudWatch + SNS');
    console.log('  POST /quiz/results           → DynamoDB + CloudWatch');
    console.log('  POST /classrooms             → DynamoDB + CloudWatch');
    console.log('  POST /classrooms/:id/join    → DynamoDB + CloudWatch');
    console.log('  POST /admin/subscribe-alerts → SNS email subscription');
    console.log('  POST /analyze                → Groq AI + CloudWatch');
    console.log('');
});
