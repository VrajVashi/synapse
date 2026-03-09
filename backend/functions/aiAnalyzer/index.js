const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

/**
 * POST /analyze
 *
 * Tier 3 — AI-powered code analysis using Groq (Llama 3.3 70B).
 * Called by the VS Code extension when local analysis (Tier 1+2) detects an
 * issue that needs deeper explanation or predictive analysis.
 *
 * Request body:
 * {
 *   code: string,           // The code snippet (up to 500 lines)
 *   errorType: string,      // e.g. "none_handling", "async_await"
 *   errorMessage: string,   // The local analysis message
 *   line: number,           // Line number of the issue
 *   filePath: string,       // File name for context
 *   studentId: string,      // For personalization (optional)
 *   cohortContext?: object   // Cohort crash data (optional)
 * }
 *
 * Response:
 * {
 *   explanation: string,    // AI-generated explanation of the bug
 *   fixSuggestion: string,  // Suggested fix (code)
 *   conceptsToReview: string[], // Related concepts
 *   confidence: number,     // 0-100 confidence score
 *   modelId: string         // Which model was used
 * }
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
        const body = JSON.parse(event.body || '{}');
        const { code, errorType, errorMessage, line, filePath } = body;

        if (!code || !errorType) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields: code, errorType' }),
            };
        }

        // Build the system prompt for educational debugging analysis
        const systemPrompt = `You are Synapse, an AI debugging tutor for bootcamp students learning Python. Your goal is NOT to just fix bugs — it's to help students UNDERSTAND their debugging patterns and learn the underlying concepts.

Rules:
- Be concise and educational (bootcamp student level)
- Explain WHY the bug happens, not just how to fix it
- Reference the specific line number
- Suggest a fix but also explain the concept behind it
- Mention related concepts the student should review
- Keep explanations under 150 words
- Return ONLY valid JSON, no markdown`;

        // Build the user prompt with context
        const cohortContext = body.cohortContext
            ? `\nCohort data: ${body.cohortContext.crashRate || 0}% of students crash on this pattern. Average fix time: ${body.cohortContext.avgFixMinutes || 0} minutes.`
            : '';

        const userPrompt = `Analyze this Python debugging issue and respond in JSON format:

File: ${filePath || 'unknown.py'}
Error type: ${errorType}
Error at line: ${line || 'unknown'}
Local analysis message: ${errorMessage || 'Issue detected'}
${cohortContext}

Code:
\`\`\`python
${code.substring(0, 3000)}
\`\`\`

Respond ONLY with this JSON structure (no markdown, no code fences):
{
  "explanation": "Clear explanation of why this bug happens (2-3 sentences)",
  "fixSuggestion": "The corrected code snippet (just the relevant lines)",
  "conceptsToReview": ["concept1", "concept2"],
  "confidence": 85
}`;

        // Call Groq API
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            model: GROQ_MODEL,
            temperature: 0.3,
            max_tokens: 512,
            response_format: { type: 'json_object' },
        });

        const aiText = chatCompletion.choices?.[0]?.message?.content || '{}';

        let aiResult;
        try {
            // Try to parse the AI response as JSON
            aiResult = JSON.parse(aiText);
        } catch {
            // If AI didn't return valid JSON, wrap the text
            aiResult = {
                explanation: aiText,
                fixSuggestion: '',
                conceptsToReview: [errorType.replace('_', ' ')],
                confidence: 70,
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                explanation: aiResult.explanation || 'Analysis could not be completed.',
                fixSuggestion: aiResult.fixSuggestion || '',
                conceptsToReview: aiResult.conceptsToReview || [],
                confidence: aiResult.confidence || 0,
                modelId: GROQ_MODEL,
            }),
        };

    } catch (err) {
        console.error('aiAnalyzer error:', err);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'AI analysis failed', details: err.message }),
        };
    }
};
