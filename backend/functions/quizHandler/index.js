const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

const ddb = new DynamoDBClient({});
const USERS_TABLE = process.env.USERS_TABLE;

// ─── Hardcoded Quiz Questions (MVP — zero hallucination risk) ──────────────
// Mirror of the extension's api.ts getHardcodedQuiz() so the backend is the
// canonical source of truth.
const QUIZZES = {
    none_handling: [
        {
            id: 'nh1', errorType: 'none_handling',
            question: 'What does `dict.get("key")` return if the key doesn\'t exist?',
            options: ['Raises KeyError', 'Returns None', 'Returns empty string ""', 'Returns False'],
            correctIndex: 1,
            explanation: '`dict.get()` returns None by default if the key is missing. Use `dict.get("key", default_value)` to provide a fallback.',
        },
        {
            id: 'nh2', errorType: 'none_handling',
            question: 'Which code safely accesses `user.name` when `user` could be None?',
            options: ['name = user.name', 'name = user.name if user else "Unknown"', 'name = user["name"]', 'name = str(user.name)'],
            correctIndex: 1,
            explanation: 'The conditional expression checks for None before accessing the attribute.',
        },
        {
            id: 'nh3', errorType: 'none_handling',
            question: 'What error is raised when you do `result.name` and `result` is None?',
            options: ['ValueError', 'TypeError', 'AttributeError', 'NullPointerError'],
            correctIndex: 2,
            explanation: 'Python raises `AttributeError: \'NoneType\' object has no attribute \'name\'`.',
        },
        {
            id: 'nh4', errorType: 'none_handling',
            question: 'What\'s the safest way to chain attribute access that might be None?',
            options: ['user.address.city', 'user and user.address and user.address.city', 'getattr(user, "address", None) and getattr(user.address, "city", None)', 'try: user.address.city except: pass'],
            correctIndex: 2,
            explanation: '`getattr(obj, attr, default)` is safer than direct access.',
        },
        {
            id: 'nh5', errorType: 'none_handling',
            question: 'Which operator helps with None defaults in Python 3.x?',
            options: ['?? (nullish)', '|| (or)', 'or keyword', ':= (walrus)'],
            correctIndex: 2,
            explanation: 'Python uses `or` for defaults: `value = result or "default"`.',
        },
    ],
    async_await: [
        {
            id: 'aa1', errorType: 'async_await',
            question: 'What happens if you call an async function without `await`?',
            options: ['It runs synchronously', 'It raises an error immediately', 'You get a coroutine object (not the result)', 'It runs in a background thread'],
            correctIndex: 2,
            explanation: 'Calling an async function without await returns a coroutine object.',
        },
        {
            id: 'aa2', errorType: 'async_await',
            question: '`await` can only be used inside what type of function?',
            options: ['Any function', 'Generator functions only', 'async def functions', 'Class methods only'],
            correctIndex: 2,
            explanation: '`await` is only valid inside `async def` functions.',
        },
        {
            id: 'aa3', errorType: 'async_await',
            question: 'How do you run an async function from synchronous Python code?',
            options: ['async_func()', 'await async_func()', 'asyncio.run(async_func())', 'Thread(target=async_func).start()'],
            correctIndex: 2,
            explanation: '`asyncio.run()` is the standard way to run an async function from synchronous code.',
        },
    ],
    try_except: [
        {
            id: 'te1', errorType: 'try_except',
            question: 'Which is the correct way to catch multiple exception types?',
            options: ['except ValueError, TypeError:', 'except (ValueError, TypeError):', 'except ValueError | TypeError:', 'except ValueError or TypeError:'],
            correctIndex: 1,
            explanation: 'Use a tuple `except (ValueError, TypeError):` to catch multiple exception types.',
        },
        {
            id: 'te2', errorType: 'try_except',
            question: 'What\'s wrong with using bare `except:` (no exception type)?',
            options: ['Nothing, it\'s fine', 'It\'s slower than specific exceptions', 'It catches everything including KeyboardInterrupt and SystemExit', 'It only works in Python 2'],
            correctIndex: 2,
            explanation: 'Bare `except:` catches absolutely everything, including `KeyboardInterrupt` and `SystemExit`.',
        },
    ],
    list_ops: [
        {
            id: 'lo1', errorType: 'list_ops',
            question: 'What does `items[-1]` return?',
            options: ['Raises IndexError', 'Returns None', 'Returns the last element', 'Returns the second-to-last element'],
            correctIndex: 2,
            explanation: 'Negative indexing in Python accesses elements from the end.',
        },
        {
            id: 'lo2', errorType: 'list_ops',
            question: 'How do you safely get the first element of a list that might be empty?',
            options: ['items[0]', 'items.first()', 'items[0] if items else None', 'items.get(0)'],
            correctIndex: 2,
            explanation: '`items[0] if items else None` is Pythonic and safe.',
        },
    ],
};

/**
 * GET  /quiz?errorType=X        → returns quiz questions
 * POST /quiz/results             → saves quiz result to user profile
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

    // ── GET /quiz?errorType=X ──
    if (event.httpMethod === 'GET') {
        const errorType = (event.queryStringParameters || {}).errorType || 'none_handling';
        const questions = QUIZZES[errorType] || QUIZZES.none_handling;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ questions }),
        };
    }

    // ── POST /quiz/results ──
    if (event.httpMethod === 'POST') {
        try {
            const body = JSON.parse(event.body || '{}');
            const { studentId, errorType, score, total } = body;

            if (!studentId || !errorType || score === undefined || !total) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Missing required fields: studentId, errorType, score, total' }),
                };
            }

            // Append quiz result to user profile
            const resultEntry = JSON.stringify({
                errorType,
                score,
                total,
                percentage: Math.round((score / total) * 100),
                timestamp: body.timestamp || new Date().toISOString(),
            });

            await ddb.send(new UpdateItemCommand({
                TableName: USERS_TABLE,
                Key: marshall({ user_id: studentId }),
                UpdateExpression: 'SET quiz_results = list_append(if_not_exists(quiz_results, :empty), :result), last_quiz_at = :now',
                ExpressionAttributeValues: marshall({
                    ':empty': [],
                    ':result': [resultEntry],
                    ':now': new Date().toISOString(),
                }),
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Quiz result saved', studentId, errorType, score, total }),
            };

        } catch (err) {
            console.error('quizHandler POST error:', err);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Internal server error' }),
            };
        }
    }

    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
    };
};
