const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const ddb = new DynamoDBClient({});
const USERS_TABLE = process.env.USERS_TABLE;

const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const DEFAULTS = {
    name: 'Full Stack Cohort 12',
    week: 3,
    totalStudents: 34,
    activeToday: 27,
};

/**
 * GET /cohort/info
 * Returns basic information about the current cohort.
 */
exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        // Attempt to count students from the UserProfiles table
        let totalStudents = DEFAULTS.totalStudents;
        try {
            const result = await ddb.send(new ScanCommand({
                TableName: USERS_TABLE,
                Select: 'COUNT',
            }));
            if (result.Count != null) totalStudents = result.Count;
        } catch (e) {
            console.warn('UserProfiles scan failed, using defaults:', e.message);
        }

        const info = { ...DEFAULTS, totalStudents };

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(info),
        };
    } catch (err) {
        console.error('cohortInfo error:', err);
        return {
            statusCode: 200,          // still 200 — return defaults so UI never breaks
            headers: CORS_HEADERS,
            body: JSON.stringify(DEFAULTS),
        };
    }
};
