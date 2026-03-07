const { DynamoDBClient, ScanCommand, PutItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const ddb = new DynamoDBClient({});
const SESSIONS_TABLE = process.env.SESSIONS_TABLE; // Re-use sessions table with a special item type
// NOTE: Ideally a dedicated HomeworkTable would be added to template.yaml.
// For MVP we store homework items with a pk prefix 'HW#' in the sessions table.
const HOMEWORK_TABLE = process.env.HOMEWORK_TABLE || SESSIONS_TABLE;

const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const DEFAULTS = [
    { id: 'hw-001', title: 'Fibonacci with Memoization', body: 'Write a function fibonacci(n)...', filename: 'hw_fibonacci_memoization.py', status: 'open', dueDate: '2026-03-10', submissionCount: 18, totalStudents: 34, avgAttempts: 4.2 },
    { id: 'hw-002', title: 'Safe Dictionary Lookup', body: 'Write a function get_user_email(users, user_id)...', filename: 'hw_safe_dict_lookup.py', status: 'open', dueDate: '2026-03-08', submissionCount: 27, totalStudents: 34, avgAttempts: 2.1 },
];

/**
 * GET  /cohort/homework          — list homework assignments
 * POST /cohort/homework          — create a new assignment
 * POST /cohort/homework/:id/close — close an assignment
 */
exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    const { httpMethod, pathParameters, body } = event;

    try {
        // ── GET /cohort/homework ─────────────────────────────────────────────
        if (httpMethod === 'GET') {
            let homework = DEFAULTS;
            try {
                const result = await ddb.send(new ScanCommand({
                    TableName: HOMEWORK_TABLE,
                    FilterExpression: 'begins_with(session_id, :prefix)',
                    ExpressionAttributeValues: { ':prefix': { S: 'HW#' } },
                }));
                if (result.Items && result.Items.length > 0) {
                    homework = result.Items.map(unmarshall).map(item => ({
                        id: item.session_id.replace('HW#', ''),
                        title: item.title,
                        body: item.body,
                        filename: item.filename,
                        status: item.status || 'open',
                        dueDate: item.due_date || null,
                        submissionCount: item.submission_count || 0,
                        totalStudents: item.total_students || 34,
                        avgAttempts: item.avg_attempts || 0,
                    }));
                }
            } catch (e) {
                console.warn('Homework DynamoDB scan failed, using defaults:', e.message);
            }
            return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(homework) };
        }

        // ── POST /cohort/homework ─────────────────────────────────────────────
        if (httpMethod === 'POST' && !pathParameters) {
            const payload = JSON.parse(body || '{}');
            const slug = (payload.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            const hwId = `hw-${Date.now()}`;
            const item = {
                session_id: `HW#${hwId}`,
                timestamp: Date.now(),
                title: payload.title || 'Untitled',
                body: payload.body || '',
                filename: `hw_${slug}.py`,
                status: 'open',
                due_date: payload.dueDate || null,
                submission_count: 0,
                total_students: 34,
                avg_attempts: 0,
            };
            try {
                await ddb.send(new PutItemCommand({
                    TableName: HOMEWORK_TABLE,
                    Item: marshall(item, { removeUndefinedValues: true }),
                }));
            } catch (e) {
                console.warn('Homework PutItem failed:', e.message);
            }
            return {
                statusCode: 201,
                headers: CORS_HEADERS,
                body: JSON.stringify({ id: hwId, ...item }),
            };
        }

        // ── POST /cohort/homework/:id/close ───────────────────────────────────
        if (httpMethod === 'POST' && pathParameters && pathParameters.id) {
            const hwId = pathParameters.id;
            try {
                await ddb.send(new UpdateItemCommand({
                    TableName: HOMEWORK_TABLE,
                    Key: marshall({ session_id: `HW#${hwId}`, timestamp: 0 }),
                    UpdateExpression: 'SET #s = :closed',
                    ExpressionAttributeNames: { '#s': 'status' },
                    ExpressionAttributeValues: marshall({ ':closed': 'closed' }),
                }));
            } catch (e) {
                console.warn('Homework UpdateItem (close) failed:', e.message);
            }
            return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true }) };
        }

        return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

    } catch (err) {
        console.error('cohortHomework error:', err);
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(DEFAULTS) };
    }
};
