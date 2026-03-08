const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const ddb = new DynamoDBClient({});
const SESSIONS_TABLE = process.env.SESSIONS_TABLE;

/**
 * GET /sessions?studentId=X
 *
 * Returns all debugging sessions for a given student, ordered by timestamp (newest first).
 * Uses GSI: user_id-timestamp-index
 *
 * Response: { sessions: DebugSession[] }
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
        const studentId = (event.queryStringParameters || {}).studentId;

        if (!studentId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required query param: studentId' }),
            };
        }

        const result = await ddb.send(new QueryCommand({
            TableName: SESSIONS_TABLE,
            IndexName: 'user_id-timestamp-index',
            KeyConditionExpression: 'user_id = :uid',
            ExpressionAttributeValues: {
                ':uid': { S: studentId },
            },
            ScanIndexForward: false, // newest first
            Limit: 50,
        }));

        const sessions = (result.Items || []).map(item => {
            const row = unmarshall(item);
            return {
                sessionId: row.session_id,
                studentId: row.user_id,
                filePath: row.file_path || '',
                errorType: row.error_type,
                startTime: row.start_time || row.created_at,
                attempts: JSON.parse(row.attempts || '[]'),
                resolved: row.resolved || false,
                totalDurationSeconds: row.total_duration_seconds || 0,
                snapshotKey: row.snapshot_key || null,
            };
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ sessions }),
        };

    } catch (err) {
        console.error('sessionReader error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
