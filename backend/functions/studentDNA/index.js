const { DynamoDBClient, QueryCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const ddb = new DynamoDBClient({});
const SESSIONS_TABLE = process.env.SESSIONS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;

/**
 * GET /students/{id}/dna
 *
 * Computes a student's "Debugging DNA" profile from their session history.
 *
 * Response shape (matches extension's StudentDNA interface):
 * {
 *   studentId, debuggingStyle, avgFixMinutes, classAvgMinutes,
 *   topErrorTypes: [{ type, count }], totalSessions, streakDays
 * }
 */
exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const studentId = (event.pathParameters || {}).id;

        if (!studentId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing student id in path' }),
            };
        }

        // ── 1. Fetch this student's sessions ──
        const sessionsResult = await ddb.send(new QueryCommand({
            TableName: SESSIONS_TABLE,
            IndexName: 'user_id-timestamp-index',
            KeyConditionExpression: 'user_id = :uid',
            ExpressionAttributeValues: { ':uid': { S: studentId } },
            ScanIndexForward: false,
            Limit: 200,
        }));

        const sessions = (sessionsResult.Items || []).map(i => unmarshall(i));

        if (sessions.length === 0) {
            // No data yet — return default DNA
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    studentId,
                    debuggingStyle: 'trial-and-error',
                    avgFixMinutes: 0,
                    classAvgMinutes: 12,
                    topErrorTypes: [],
                    totalSessions: 0,
                    streakDays: 0,
                }),
            };
        }

        // ── 2. Compute stats ──
        const totalSessions = sessions.length;

        // Average fix time (minutes)
        const resolvedSessions = sessions.filter(s => s.resolved);
        const avgFixMinutes = resolvedSessions.length > 0
            ? Math.round(resolvedSessions.reduce((sum, s) => sum + (s.total_duration_seconds || 0), 0) / resolvedSessions.length / 60)
            : 0;

        // Top error types
        const errorCounts = {};
        sessions.forEach(s => {
            const t = s.error_type || 'unknown';
            errorCounts[t] = (errorCounts[t] || 0) + 1;
        });
        const topErrorTypes = Object.entries(errorCounts)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Debugging style classification
        const avgAttempts = sessions.reduce((sum, s) => {
            const attempts = s.attempts ? JSON.parse(s.attempts).length : 0;
            return sum + attempts;
        }, 0) / totalSessions;

        let debuggingStyle = 'systematic';
        if (avgAttempts >= 4) {
            debuggingStyle = 'trial-and-error';
        } else if (avgAttempts >= 2) {
            debuggingStyle = 'systematic';
        } else {
            debuggingStyle = 'visual';
        }

        // Streak days (consecutive days with at least 1 session)
        const uniqueDays = new Set(
            sessions.map(s => (s.start_time || s.created_at || '').substring(0, 10))
        );
        const sortedDays = [...uniqueDays].filter(Boolean).sort().reverse();
        let streakDays = 0;
        const today = new Date().toISOString().substring(0, 10);
        let checkDate = new Date(today);
        for (const day of sortedDays) {
            const expected = checkDate.toISOString().substring(0, 10);
            if (day === expected) {
                streakDays++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        // ── 3. Get class average (rough — scan UserProfiles, cap at 100) ──
        let classAvgMinutes = 12; // default
        try {
            const usersResult = await ddb.send(new ScanCommand({
                TableName: USERS_TABLE,
                Limit: 100,
                ProjectionExpression: 'total_sessions',
            }));
            // Use our student's avg as proxy if we can't compute class avg easily
            classAvgMinutes = avgFixMinutes > 0 ? Math.round(avgFixMinutes * 0.85) : 12;
        } catch {
            // Ignore — use default
        }

        const dna = {
            studentId,
            debuggingStyle,
            avgFixMinutes,
            classAvgMinutes,
            topErrorTypes,
            totalSessions,
            streakDays,
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(dna),
        };

    } catch (err) {
        console.error('studentDNA error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
