/**
 * Synapse Instructor Dashboard — Mock API Layer
 *
 * HOW TO CONNECT TO REAL BACKEND:
 * Replace the mock return values below with actual fetch() calls.
 * Example: return await fetch(`${API_BASE}/cohort/heatmap`).then(r => r.json());
 *
 * The data shapes are already matched to what the Lambda functions return,
 * so backend integration = uncommenting 2 lines per function.
 */

const API_BASE = 'https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod';

const mockData = {
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
        {
            type: 'gap',
            concept: 'None Handling',
            taught: 'Day 5 (Week 1)',
            peakStruggle: 'Day 12 (Week 3)',
            recommendation: 'Add reinforcement workshop on Day 8 — 7-day gap between teaching and peak struggle'
        },
        {
            type: 'missing',
            concept: 'Async / Await',
            taught: 'Not formally taught yet',
            peakStruggle: '58% encountering in personal projects',
            recommendation: 'Introduce in Week 2 (currently scheduled Week 4)'
        },
        {
            type: 'ok',
            concept: 'List Comprehension',
            taught: 'Day 7',
            peakStruggle: 'Day 9 (expected)',
            recommendation: 'No action needed — students mastering on schedule'
        },
    ],
    weeklyStats: {
        totalSessions: 1847,
        avgFixTime: 13,
        quizCompletionRate: 47,
        improvementVsLastWeek: '+12%',
    }
};

export const API = {
    async getCohortInfo() { return mockData.cohortInfo; },
    async getHeatmap() { return mockData.heatmap; },
    async getAtRisk() { return mockData.atRisk; },
    async getMastery() { return mockData.mastery; },
    async getCurriculum() { return mockData.curriculum; },
    async getWeeklyStats() { return mockData.weeklyStats; },
};
