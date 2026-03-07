const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const ddb = new DynamoDBClient({});
const SESSIONS_TABLE = process.env.SESSIONS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;

const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const DEFAULTS = [
    { concept: 'Functions & Scope', mastery: 89, target: 80, status: 'good' },
    { concept: 'Loops & Iteration', mastery: 82, target: 80, status: 'good' },
    { concept: 'List Comprehension', mastery: 71, target: 70, status: 'good' },
    { concept: 'Exception Handling', mastery: 45, target: 70, status: 'warn' },
    { concept: 'None / Null Safety', mastery: 38, target: 70, status: 'danger' },
    { concept: 'Async / Await', mastery: 29, target: 60, status: 'danger' },
];

// Concepts tracked — the error_type in DynamoDB maps to these concept names
const CONCEPT_MAP = {
    'none_handling': { concept: 'None / Null Safety', target: 70 },
    'async_await': { concept: 'Async / Await', target: 60 },
    'try_except': { concept: 'Exception Handling', target: 70 },
    'list_ops': { concept: 'List Comprehension', target: 70 },
};

function masteryStatus(mastery, target) {
    if (mastery >= target) return 'good';
    if (mastery >= target * 0.7) return 'warn';
    return 'danger';
}

/**
 * GET /cohort/mastery?cohortId=X
 * Returns concept mastery levels for the cohort.
 */
exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        const params = event.queryStringParameters || {};
        const cohortId = params.cohortId || 'default';

        let mastery = DEFAULTS;
        try {
            const result = await ddb.send(new ScanCommand({
                TableName: SESSIONS_TABLE,
                FilterExpression: 'cohort_id = :cid',
                ExpressionAttributeValues: { ':cid': { S: cohortId } },
            }));

            if (result.Items && result.Items.length > 0) {
                const sessions = result.Items.map(unmarshall);
                const totalStudents = new Set(sessions.map(s => s.user_id)).size || 1;

                // Students who RESOLVED (fixed) an error have "mastered" that concept
                const resolvedByType = {};
                for (const s of sessions) {
                    if (s.resolved) {
                        const et = s.error_type;
                        if (!resolvedByType[et]) resolvedByType[et] = new Set();
                        resolvedByType[et].add(s.user_id);
                    }
                }

                mastery = Object.entries(CONCEPT_MAP).map(([errorType, { concept, target }]) => {
                    const resolved = resolvedByType[errorType] ? resolvedByType[errorType].size : 0;
                    const masteryPct = Math.round((resolved / totalStudents) * 100);
                    return { concept, mastery: masteryPct, target, status: masteryStatus(masteryPct, target) };
                });
            }
        } catch (e) {
            console.warn('Mastery DynamoDB scan failed, using defaults:', e.message);
        }

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(mastery),
        };
    } catch (err) {
        console.error('cohortMastery error:', err);
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(DEFAULTS),
        };
    }
};
