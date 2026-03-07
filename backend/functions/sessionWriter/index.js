const { DynamoDBClient, PutItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { marshall } = require('@aws-sdk/util-dynamodb');

const ddb = new DynamoDBClient({});
const s3 = new S3Client({});
const SESSIONS_TABLE = process.env.SESSIONS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const SNAPSHOTS_BUCKET = process.env.SNAPSHOTS_BUCKET;

/**
 * POST /sessions
 *
 * Receives a debugging session from the VS Code extension and:
 * 1. Uploads code snapshot to S3 (for debugging replay)
 * 2. Writes the full session to DebuggingSessions table
 * 3. Upserts the student's UserProfile (increments total_sessions)
 *
 * Expected body (camelCase from extension):
 * {
 *   sessionId, studentId, cohortId, filePath, errorType,
 *   startTime, attempts[], resolved, totalDurationSeconds,
 *   codeSnapshot?: string   // <-- NEW: full file contents for replay
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
        let snapshotKey = null;

        // ── 1. Upload code snapshot to S3 (if provided) ──
        if (body.codeSnapshot && SNAPSHOTS_BUCKET) {
            snapshotKey = `${studentId}/${sessionId}.py`;
            await s3.send(new PutObjectCommand({
                Bucket: SNAPSHOTS_BUCKET,
                Key: snapshotKey,
                Body: body.codeSnapshot,
                ContentType: 'text/x-python',
                Metadata: {
                    'student-id': studentId,
                    'session-id': sessionId,
                    'error-type': errorType,
                    'file-path': body.filePath || '',
                },
            }));
        }

        // ── 2. Write session to DebuggingSessions table ──
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
            snapshot_key: snapshotKey, // S3 key for replay
        };

        await ddb.send(new PutItemCommand({
            TableName: SESSIONS_TABLE,
            Item: marshall(sessionItem, { removeUndefinedValues: true }),
        }));

        // ── 3. Upsert UserProfile (increment total_sessions) ──
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
            body: JSON.stringify({
                message: 'Session recorded',
                sessionId,
                snapshotKey, // Return S3 key so extension knows it was saved
            }),
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
