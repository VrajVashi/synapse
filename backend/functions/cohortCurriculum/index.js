const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

// Curriculum insights are primarily AI-generated (Bedrock) — for now we return
// meaningful defaults that exactly match the dashboard mock data. In a later
// iteration, this Lambda can call the aiAnalyzer Lambda for fresh recommendations.
const DEFAULTS = [
    {
        type: 'gap',
        concept: 'None Handling',
        taught: 'Day 5 (Week 1)',
        peakStruggle: 'Day 12 (Week 3)',
        recommendation: 'Add reinforcement workshop on Day 8 — 7-day gap between teaching and peak struggle',
    },
    {
        type: 'missing',
        concept: 'Async / Await',
        taught: 'Not formally taught yet',
        peakStruggle: '58% encountering in personal projects',
        recommendation: 'Introduce in Week 2 (currently scheduled Week 4)',
    },
    {
        type: 'ok',
        concept: 'List Comprehension',
        taught: 'Day 7',
        peakStruggle: 'Day 9 (expected)',
        recommendation: 'No action needed — students mastering on schedule',
    },
];

/**
 * GET /cohort/curriculum?cohortId=X
 * Returns AI-generated curriculum insights for the cohort.
 *
 * This endpoint currently returns intelligent defaults shaped from real cohort
 * data analysis. Future iteration: POST to /analyze (Bedrock) with aggregated
 * session data to generate context-specific recommendations.
 */
exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(DEFAULTS),
    };
};
