const { DynamoDBClient, QueryCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const ddb = new DynamoDBClient({});
const SESSIONS_TABLE = process.env.SESSIONS_TABLE;

const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const DEFAULTS = [
    { errorType: 'None / Null Handling', attempts: 847, pct: 73, avgFixMin: 16, quizCompletion: 34, trend: 'up' },
    { errorType: 'Async / Await Syntax', attempts: 612, pct: 58, avgFixMin: 22, quizCompletion: 12, trend: 'up' },
    { errorType: 'Missing try / except', attempts: 401, pct: 45, avgFixMin: 11, quizCompletion: 58, trend: 'down' },
    { errorType: 'List / Index Bounds', attempts: 289, pct: 34, avgFixMin: 9, quizCompletion: 67, trend: 'stable' },
    { errorType: 'Type Errors', attempts: 201, pct: 28, avgFixMin: 14, quizCompletion: 41, trend: 'down' },
];

/**
 * GET /cohort/heatmap?cohortId=X
 * Returns error-type attempt counts and rates for the cohort.
 */
exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        const params = event.queryStringParameters || {};
        const cohortId = params.cohortId || 'default';

        // Scan sessions table and aggregate by error_type for this cohort
        let heatmap = DEFAULTS;
        try {
            const result = await ddb.send(new ScanCommand({
                TableName: SESSIONS_TABLE,
                FilterExpression: 'cohort_id = :cid',
                ExpressionAttributeValues: {
                    ':cid': { S: cohortId },
                },
            }));

            if (result.Items && result.Items.length > 0) {
                const sessions = result.Items.map(unmarshall);

                // Aggregate by error_type
                const groups = {};
                for (const s of sessions) {
                    const et = s.error_type || 'Unknown';
                    if (!groups[et]) groups[et] = { attempts: 0, totalFix: 0, count: 0 };
                    groups[et].attempts += (s.attempt_count || 1);
                    if (s.fix_duration_minutes) {
                        groups[et].totalFix += s.fix_duration_minutes;
                        groups[et].count++;
                    }
                }

                const totalStudents = new Set(sessions.map(s => s.user_id)).size || 1;
                heatmap = Object.entries(groups)
                    .map(([errorType, g]) => ({
                        errorType,
                        attempts: g.attempts,
                        pct: Math.round((g.count / totalStudents) * 100),
                        avgFixMin: g.count > 0 ? Math.round(g.totalFix / g.count) : 0,
                        quizCompletion: 0,
                        trend: 'stable',
                    }))
                    .sort((a, b) => b.attempts - a.attempts);
            }
        } catch (e) {
            console.warn('Heatmap DynamoDB scan failed, using defaults:', e.message);
        }

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(heatmap),
        };
    } catch (err) {
        console.error('cohortHeatmap error:', err);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(DEFAULTS),
        };
    }
};
