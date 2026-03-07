const { DynamoDBClient, GetItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const ddb = new DynamoDBClient({});
const COHORT_TABLE = process.env.COHORT_TABLE;
const SESSIONS_TABLE = process.env.SESSIONS_TABLE;

/**
 * Hardcoded MVP defaults — used when the CohortPatterns table has no data yet.
 * These match the values in the extension's pythonAnalyzer.ts.
 */
const DEFAULTS = {
    none_handling: { crashRate: 73, avgFixMinutes: 16, totalSessions: 847, topFixes: ['Add None check before access', 'Use dict.get() with default', 'Wrap in try/except'] },
    async_await: { crashRate: 58, avgFixMinutes: 22, totalSessions: 612, topFixes: ['Add await keyword', 'Wrap in asyncio.run()', 'Use async def'] },
    try_except: { crashRate: 45, avgFixMinutes: 11, totalSessions: 401, topFixes: ['Use specific exception type', 'Add except block around I/O', 'Use with statement'] },
    list_ops: { crashRate: 34, avgFixMinutes: 9, totalSessions: 289, topFixes: ['Check list length before index', 'Use if items guard', 'Use list comprehension'] },
    type_error: { crashRate: 61, avgFixMinutes: 14, totalSessions: 520, topFixes: ['Convert types explicitly', 'Check isinstance() first', 'Use str() or int() cast'] },
};

/**
 * GET /cohort/patterns?errorType=X&cohortId=Y
 *
 * Returns cohort-wide pattern data for a given error type.
 * First checks the CohortPatterns DynamoDB table; falls back to hardcoded defaults.
 *
 * Response: { errorType, crashRate, avgFixMinutes, totalSessions, topFixes }
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
        const params = event.queryStringParameters || {};
        const errorType = params.errorType;
        const cohortId = params.cohortId || 'default';

        if (!errorType) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required query param: errorType' }),
            };
        }

        // Try reading from CohortPatterns table
        let pattern = null;
        try {
            const result = await ddb.send(new GetItemCommand({
                TableName: COHORT_TABLE,
                Key: marshall({ cohort_id: cohortId, error_type: errorType }),
            }));

            if (result.Item) {
                const row = unmarshall(result.Item);
                pattern = {
                    errorType: row.error_type,
                    crashRate: row.crash_rate || 0,
                    avgFixMinutes: row.avg_fix_minutes || 0,
                    totalSessions: row.total_sessions || 0,
                    topFixes: row.top_fixes ? JSON.parse(row.top_fixes) : [],
                };
            }
        } catch (e) {
            console.warn('CohortPatterns lookup failed, using defaults:', e.message);
        }

        // Fall back to hardcoded defaults
        if (!pattern) {
            const def = DEFAULTS[errorType] || DEFAULTS.none_handling;
            pattern = { errorType, ...def };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(pattern),
        };

    } catch (err) {
        console.error('cohortReader error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
