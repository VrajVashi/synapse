// ─── Base URL from environment (set VITE_API_BASE_URL in .env) ───────────────
// Local dev:  VITE_API_BASE_URL=http://localhost:3001
// AWS prod:   VITE_API_BASE_URL=https://abc123.execute-api.ap-south-1.amazonaws.com/prod
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// ─── Mock data fallbacks (used when the API is unreachable) ──────────────────
const MOCK = {
    cohortInfo: {
        name: 'Full Stack Cohort 12',
        week: 3,
        totalStudents: 34,
        activeToday: 27,
    },
    heatmap: [
        { errorType: 'None / Null Handling', attempts: 847, pct: 73, avgFixMin: 16, quizCompletion: 34, trend: 'up' },
        { errorType: 'Async / Await Syntax', attempts: 612, pct: 58, avgFixMin: 22, quizCompletion: 12, trend: 'up' },
        { errorType: 'Missing try / except', attempts: 401, pct: 45, avgFixMin: 11, quizCompletion: 58, trend: 'down' },
        { errorType: 'List / Index Bounds', attempts: 289, pct: 34, avgFixMin: 9, quizCompletion: 67, trend: 'stable' },
        { errorType: 'Type Errors', attempts: 201, pct: 28, avgFixMin: 14, quizCompletion: 41, trend: 'down' },
    ],
    atRisk: [
        { name: 'Arjun Kumar', attempts: 12, classAvg: 4, errorType: 'None Handling', lastSeen: '35 min ago', action: '1-on-1 recommended' },
        { name: 'Priya Sharma', attempts: 9, classAvg: 4, errorType: 'Async / Await', lastSeen: '2 hrs ago', action: 'Quiz not started' },
        { name: 'Ravi Mehta', attempts: 7, classAvg: 4, errorType: 'try / except', lastSeen: '1 hr ago', action: 'Below 40% quiz rate' },
        { name: 'Sneha Patel', attempts: 6, classAvg: 4, errorType: 'None Handling', lastSeen: '4 hrs ago', action: 'Peer mentor suggested' },
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
        { id: 'hw-001', title: 'Fibonacci with Memoization', body: 'Write a function fibonacci(n)...', filename: 'hw_fibonacci_memoization.py', status: 'open', dueDate: '2026-03-10', submissionCount: 18, totalStudents: 34, avgAttempts: 4.2 },
        { id: 'hw-002', title: 'Safe Dictionary Lookup', body: 'Write a function get_user_email(users, user_id)...', filename: 'hw_safe_dict_lookup.py', status: 'open', dueDate: '2026-03-08', submissionCount: 27, totalStudents: 34, avgAttempts: 2.1 },
    ],
    classrooms: [],
};

// ─── Helper: fetch with fallback ─────────────────────────────────────────────
async function fetchWithFallback(endpoint, fallback) {
    try {
        const res = await fetch(`${BASE_URL}${endpoint}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.warn(`[Synapse API] ${endpoint} failed (${e.message}), using fallback data.`);
        return fallback;
    }
}

// ─── API object ───────────────────────────────────────────────────────────────
export const API = {
    // ── Cohort data ──────────────────────────────────────────────────────────
    async getCohortInfo() {
        return fetchWithFallback('/cohort/info', MOCK.cohortInfo);
    },

    async getHeatmap() {
        return fetchWithFallback('/cohort/heatmap', MOCK.heatmap);
    },

    async getAtRisk() {
        return fetchWithFallback('/cohort/at-risk', MOCK.atRisk);
    },

    async getMastery() {
        return fetchWithFallback('/cohort/mastery', MOCK.mastery);
    },

    async getCurriculum() {
        return fetchWithFallback('/cohort/curriculum', MOCK.curriculum);
    },

    async getWeeklyStats() {
        return fetchWithFallback('/cohort/stats', MOCK.weeklyStats);
    },

    async getHomework() {
        return fetchWithFallback('/cohort/homework', MOCK.homework);
    },

    // ── Homework mutations ───────────────────────────────────────────────────
    async createHomework(payload) {
        try {
            const res = await fetch(`${BASE_URL}/cohort/homework`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.warn(`[Synapse API] POST /cohort/homework failed (${e.message}), using local fallback.`);
            const slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            const newQ = {
                id: `hw-${Date.now()}`,
                title: payload.title,
                body: payload.body,
                filename: `hw_${slug}.py`,
                status: 'open',
                dueDate: payload.dueDate || null,
                submissionCount: 0,
                totalStudents: MOCK.cohortInfo.totalStudents,
                avgAttempts: 0,
            };
            MOCK.homework.unshift(newQ);
            return newQ;
        }
    },

    async closeHomework(hwId) {
        try {
            const res = await fetch(`${BASE_URL}/cohort/homework/${hwId}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } catch (e) {
            console.warn(`[Synapse API] POST /cohort/homework/${hwId}/close failed (${e.message}), using local fallback.`);
            const q = MOCK.homework.find(h => h.id === hwId);
            if (q) q.status = 'closed';
        }
    },

    // ── Classroom CRUD ───────────────────────────────────────────────────────
    async getClassrooms() {
        return fetchWithFallback('/classrooms', MOCK.classrooms);
    },

    async createClassroom(payload) {
        try {
            const res = await fetch(`${BASE_URL}/classrooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.warn(`[Synapse API] POST /classrooms failed (${e.message}), using local fallback.`);
            const prefix = (payload.name || 'CLASS').replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
            const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
            const classroom = {
                id: `${prefix}-${new Date().getFullYear()}-${rand}`,
                name: payload.name,
                lang: payload.lang || 'python',
                batch: payload.batch || '',
                students: 0,
                sessions: 0,
                createdAt: Date.now(),
            };
            MOCK.classrooms.push(classroom);
            return classroom;
        }
    },

    async joinClassroom(classroomId, studentId, studentName) {
        try {
            const res = await fetch(`${BASE_URL}/classrooms/${classroomId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId, studentName }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.warn(`[Synapse API] POST /classrooms/${classroomId}/join failed (${e.message}).`);
            return { ok: false };
        }
    },
};
