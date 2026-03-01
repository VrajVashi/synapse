const { DynamoDBClient, PutItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

const ddb = new DynamoDBClient({});
const SESSIONS_TABLE = process.env.SESSIONS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;

/**
 * POST /sessions
 *
 * Receives a debugging session from the VS Code extension and:
 * 1. Writes the full session to DebuggingSessions table
 * 2. Upserts the student's UserProfile (increments total_sessions)
 *
 * Expected body (camelCase from extension):
 * {
 *   sessionId, studentId, cohortId, filePath, errorType,
 *   startTime, attempts[], resolved, totalDurationSeconds
 * }
 */
exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const body = JSON.parse(event.body || '{}');

        // ── Validate required fields ──
        const { sessionId, studentId, cohortId, errorType, attempts } = body;

        if (!sessionId || !studentId || !errorType || !Array.isArray(attempts)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Missing required fields: sessionId, studentId, errorType, attempts',
                }),
            };
        }

        const now = Date.now();

        // ── 1. Write session to DebuggingSessions table ──
        const sessionItem = {
            session_id: sessionId,
            timestamp: now,
            user_id: studentId,
            cohort_id: cohortId || 'default',
            error_type: errorType,
            file_path: body.filePath || '',
            start_time: body.startTime || new Date().toISOString(),
            attempts: JSON.stringify(attempts),
            resolved: body.resolved || false,
            total_duration_seconds: body.totalDurationSeconds || 0,
            created_at: new Date().toISOString(),
        };

        await ddb.send(new PutItemCommand({
            TableName: SESSIONS_TABLE,
            Item: marshall(sessionItem, { removeUndefinedValues: true }),
        }));

        // ── 2. Upsert UserProfile (increment total_sessions) ──
        await ddb.send(new UpdateItemCommand({
            TableName: USERS_TABLE,
            Key: marshall({ user_id: studentId }),
            UpdateExpression: 'SET total_sessions = if_not_exists(total_sessions, :zero) + :one, last_active = :now, cohort_id = :cohort',
            ExpressionAttributeValues: marshall({
                ':zero': 0,
                ':one': 1,
                ':now': new Date().toISOString(),
                ':cohort': cohortId || 'default',
            }),
        }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Session recorded', sessionId }),
        };

    } catch (err) {
        console.error('sessionWriter error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
