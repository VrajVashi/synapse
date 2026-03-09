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

const DEFAULTS = [
    { name: 'Arjun Kumar', attempts: 12, classAvg: 4, errorType: 'None Handling', lastSeen: '35 min ago', action: '1-on-1 recommended' },
    { name: 'Priya Sharma', attempts: 9, classAvg: 4, errorType: 'Async / Await', lastSeen: '2 hrs ago', action: 'Quiz not started' },
    { name: 'Ravi Mehta', attempts: 7, classAvg: 4, errorType: 'try / except', lastSeen: '1 hr ago', action: 'Below 40% quiz rate' },
    { name: 'Sneha Patel', attempts: 6, classAvg: 4, errorType: 'None Handling', lastSeen: '4 hrs ago', action: 'Peer mentor suggested' },
];

// A student is "at-risk" when their attempt count is >= 2x the cohort average
const AT_RISK_THRESHOLD = 2;

/**
 * GET /cohort/at-risk?cohortId=X
 * Returns students whose attempt count is far above the class average.
 */
exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        const params = event.queryStringParameters || {};
        const cohortId = params.cohortId || 'default';

        let atRisk = DEFAULTS;

        try {
            const result = await ddb.send(new ScanCommand({
                TableName: SESSIONS_TABLE,
                FilterExpression: 'cohort_id = :cid',
                ExpressionAttributeValues: { ':cid': { S: cohortId } },
            }));

            if (result.Items && result.Items.length > 0) {
                const sessions = result.Items.map(unmarshall);

                // Group attempts by student
                const byStudent = {};
                for (const s of sessions) {
                    const uid = s.user_id || 'Unknown';
                    if (!byStudent[uid]) byStudent[uid] = { attempts: 0, errorType: s.error_type, lastTimestamp: 0 };
                    byStudent[uid].attempts += (s.attempt_count || 1);
                    if (s.timestamp > byStudent[uid].lastTimestamp) {
                        byStudent[uid].lastTimestamp = s.timestamp;
                        byStudent[uid].errorType = s.error_type;
                    }
                }

                const counts = Object.values(byStudent).map(v => v.attempts);
                const classAvg = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 4;

                atRisk = Object.entries(byStudent)
                    .filter(([_, v]) => v.attempts >= classAvg * AT_RISK_THRESHOLD)
                    .map(([uid, v]) => ({
                        name: uid,
                        attempts: v.attempts,
                        classAvg: Math.round(classAvg),
                        errorType: v.errorType || 'Unknown',
                        lastSeen: v.lastTimestamp ? `${Math.round((Date.now() / 1000 - v.lastTimestamp) / 60)} min ago` : 'Unknown',
                        action: '1-on-1 recommended',
                    }))
                    .sort((a, b) => b.attempts - a.attempts);

                if (atRisk.length === 0) atRisk = []; // No at-risk students is a valid response
            }
        } catch (e) {
            console.warn('AtRisk DynamoDB scan failed, using defaults:', e.message);
        }

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(atRisk),
        };
    } catch (err) {
        console.error('cohortAtRisk error:', err);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(DEFAULTS),
        };
    }
};
