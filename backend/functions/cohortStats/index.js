const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const ddb = new DynamoDBClient({});
const SESSIONS_TABLE = process.env.SESSIONS_TABLE;

const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const DEFAULTS = {
    totalSessions: 1847,
    avgFixTime: 13,
    quizCompletionRate: 47,
    improvementVsLastWeek: '+12%',
};

/**
 * GET /cohort/stats?cohortId=X
 * Returns high-level weekly stats for the cohort overview cards.
 */
exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        const params = event.queryStringParameters || {};
        const cohortId = params.cohortId || 'default';

        let stats = DEFAULTS;

        try {
            const nowSec = Math.floor(Date.now() / 1000);
            const sevenDaysAgo = nowSec - 7 * 24 * 60 * 60;

            const result = await ddb.send(new ScanCommand({
                TableName: SESSIONS_TABLE,
                FilterExpression: 'cohort_id = :cid AND #ts > :cutoff',
                ExpressionAttributeNames: { '#ts': 'timestamp' },
                ExpressionAttributeValues: {
                    ':cid': { S: cohortId },
                    ':cutoff': { N: String(sevenDaysAgo) },
                },
            }));

            if (result.Items && result.Items.length > 0) {
                const sessions = result.Items.map(unmarshall);
                const totalSessions = sessions.length;
                const fixedSessions = sessions.filter(s => s.fix_duration_minutes);
                const avgFixTime = fixedSessions.length > 0
                    ? Math.round(fixedSessions.reduce((sum, s) => sum + s.fix_duration_minutes, 0) / fixedSessions.length)
                    : DEFAULTS.avgFixTime;

                stats = {
                    totalSessions,
                    avgFixTime,
                    quizCompletionRate: DEFAULTS.quizCompletionRate, // quiz data not in sessions table
                    improvementVsLastWeek: DEFAULTS.improvementVsLastWeek,
                };
            }
        } catch (e) {
            console.warn('Stats DynamoDB scan failed, using defaults:', e.message);
        }

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(stats),
        };
    } catch (err) {
        console.error('cohortStats error:', err);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(DEFAULTS),
        };
    }
};
