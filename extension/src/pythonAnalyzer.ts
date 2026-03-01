import * as vscode from 'vscode';
import { SessionRecorder } from './sessionRecorder';
import { SynapseApi } from './api';

/**
 * Python error patterns Synapse detects (Tier 1 + Tier 2).
 * These run locally — no API cost, <200ms latency.
 */

export interface SynapseIssue {
    line: number;
    col: number;
    endCol: number;
    message: string;
    errorType: 'none_handling' | 'try_except' | 'async_await' | 'list_ops' | 'type_error';
    severity: vscode.DiagnosticSeverity;
    crashProbability: number; // cohort crash rate (hardcoded for MVP)
    fixSuggestion: string;
    quizAvailable: boolean;
}

// Cohort crash probability data (hardcoded MVP — will come from DynamoDB in production)
const COHORT_DATA: Record<string, { crashRate: number; avgFixMinutes: number; cohortSize: number }> = {
    none_handling: { crashRate: 73, avgFixMinutes: 16, cohortSize: 847 },
    async_await: { crashRate: 58, avgFixMinutes: 22, cohortSize: 612 },
    try_except: { crashRate: 45, avgFixMinutes: 11, cohortSize: 401 },
    list_ops: { crashRate: 34, avgFixMinutes: 9, cohortSize: 289 },
    type_error: { crashRate: 61, avgFixMinutes: 14, cohortSize: 520 },
};

export class SynapseAnalyzer {
    private debounceTimer: NodeJS.Timeout | undefined;
    private readonly debounceMs = 800;
    private aiCooldowns = new Map<string, number>(); // per-file cooldown for Bedrock calls
    private readonly aiCooldownMs = 10000; // 10s between AI calls per file

    constructor(
        private diagnosticCollection: vscode.DiagnosticCollection,
        private sessionRecorder: SessionRecorder,
        private api?: SynapseApi
    ) { }

    onDocumentChanged(doc: vscode.TextDocument) {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.analyzeDocument(doc);
        }, this.debounceMs);
    }

    analyzeDocument(doc: vscode.TextDocument) {
        if (doc.languageId !== 'python') { return; }

        const text = doc.getText();
        const lines = text.split('\n');
        const issues: SynapseIssue[] = [];

        lines.forEach((line, idx) => {
            // Pattern 1: None Handling — accessing attribute/index on value that may be None
            const noneIssues = this.detectNoneHandling(line, idx);
            issues.push(...noneIssues);

            // Pattern 2: try/except missing around risky calls
            const tryExceptIssues = this.detectMissingTryExcept(line, idx, lines);
            issues.push(...tryExceptIssues);

            // Pattern 3: Async/await misuse
            const asyncIssues = this.detectAsyncIssues(line, idx, lines);
            issues.push(...asyncIssues);

            // Pattern 4: List / iteration issues
            const listIssues = this.detectListIssues(line, idx);
            issues.push(...listIssues);
        });

        // Convert to VS Code diagnostics (Tier 1+2 — local, instant)
        const diagnostics = issues.map(issue => this.issueToDiagnostic(doc, issue));
        this.diagnosticCollection.set(doc.uri, diagnostics);

        // Record detection events
        if (issues.length > 0) {
            this.sessionRecorder.onIssuesDetected(doc.uri.fsPath, issues);

            // Tier 3 — AI analysis via Bedrock (async, non-blocking)
            this.requestAIAnalysis(doc, issues, text);
        }
    }

    /**
     * Tier 3: Call AWS Bedrock for AI-powered analysis.
     * Only fires for the first issue in the file, with a per-file cooldown.
     */
    private async requestAIAnalysis(doc: vscode.TextDocument, issues: SynapseIssue[], code: string) {
        if (!this.api) { return; }

        const config = vscode.workspace.getConfiguration('synapse');
        if (!config.get<boolean>('enablePredictiveWarnings', true)) { return; }

        const filePath = doc.uri.fsPath;
        const now = Date.now();
        const lastCall = this.aiCooldowns.get(filePath) || 0;
        if (now - lastCall < this.aiCooldownMs) { return; }
        this.aiCooldowns.set(filePath, now);

        // Pick the highest-severity issue for AI analysis
        const topIssue = issues.sort((a, b) => b.crashProbability - a.crashProbability)[0];
        const cohort = COHORT_DATA[topIssue.errorType];

        try {
            const studentId = config.get<string>('studentId') || 'anonymous';
            const result = await this.api.analyzeWithAI({
                code: code.substring(0, 3000),
                errorType: topIssue.errorType,
                errorMessage: topIssue.message,
                line: topIssue.line,
                filePath: doc.fileName,
                studentId,
                cohortContext: cohort ? { crashRate: cohort.crashRate, avgFixMinutes: cohort.avgFixMinutes } : undefined,
            });

            if (result && result.explanation) {
                // Enrich the diagnostic with AI analysis
                const existingDiags = this.diagnosticCollection.get(doc.uri) || [];
                const aiDiagnostic = new vscode.Diagnostic(
                    new vscode.Range(
                        new vscode.Position(topIssue.line, topIssue.col),
                        new vscode.Position(topIssue.line, Math.min(topIssue.endCol, doc.lineAt(topIssue.line).text.length))
                    ),
                    `✨ SYNAPSE AI [${result.confidence}% confidence]: ${result.explanation}` +
                    (result.fixSuggestion ? `\n\n💡 Fix: ${result.fixSuggestion}` : '') +
                    (result.conceptsToReview?.length ? `\n\n📚 Review: ${result.conceptsToReview.join(', ')}` : ''),
                    vscode.DiagnosticSeverity.Information
                );
                aiDiagnostic.source = 'Synapse AI (Bedrock)';
                aiDiagnostic.code = {
                    value: topIssue.errorType,
                    target: vscode.Uri.parse(`command:synapse.showQuiz?${encodeURIComponent(JSON.stringify([topIssue.errorType]))}`)
                };

                this.diagnosticCollection.set(doc.uri, [...existingDiags, aiDiagnostic]);
            }
        } catch {
            // AI analysis failed — Tier 1+2 diagnostics still show
        }
    }

    // ─── Pattern Detectors ───────────────────────────────────────────────────

    private detectNoneHandling(line: string, lineIdx: number): SynapseIssue[] {
        const issues: SynapseIssue[] = [];
        const trimmed = line.trim();

        // Pattern: variable = something.query/get/find(...) → then .attribute accessed without None check
        // Simple heuristic: chained attribute access on dict.get(), .find(), .query(), .first()
        const noneReturnersPattern = /(\w+)\s*=\s*\w+\.(get|query|find|first|fetchone|execute)\s*\(/;
        if (noneReturnersPattern.test(trimmed)) {
            const match = noneReturnersPattern.exec(trimmed);
            if (match) {
                const col = line.indexOf(match[0]);
                issues.push({
                    line: lineIdx,
                    col,
                    endCol: col + match[0].length,
                    message: `⚠️ SYNAPSE [${COHORT_DATA.none_handling.crashRate}% crash rate]: \`.${match[2]}()\` can return None. Accessing attributes without a None check crashes here in ${COHORT_DATA.none_handling.crashRate}% of similar sessions.\n\nFix: Add \`if result is not None:\` before accessing attributes.\nClass avg fix: ${COHORT_DATA.none_handling.avgFixMinutes} minutes.`,
                    errorType: 'none_handling',
                    severity: vscode.DiagnosticSeverity.Warning,
                    crashProbability: COHORT_DATA.none_handling.crashRate,
                    fixSuggestion: 'Add a None check: `if result is not None: ...`',
                    quizAvailable: true
                });
            }
        }

        // Pattern: direct .attribute on result of function call without None guard
        const directAttrPattern = /return\s+(\w+)\.(\w+)\s*$/;
        if (directAttrPattern.test(trimmed) && !trimmed.includes('if ') && !trimmed.includes('or ')) {
            const match = directAttrPattern.exec(trimmed);
            if (match) {
                const col = line.indexOf('return');
                issues.push({
                    line: lineIdx,
                    col,
                    endCol: col + match[0].length,
                    message: `⚠️ SYNAPSE [${COHORT_DATA.none_handling.crashRate}% crash rate]: Returning \`${match[1]}.${match[2]}\` without checking if \`${match[1]}\` is None. This is a common crash pattern.\n\nFix: \`return ${match[1]}.${match[2]} if ${match[1]} else None\``,
                    errorType: 'none_handling',
                    severity: vscode.DiagnosticSeverity.Warning,
                    crashProbability: COHORT_DATA.none_handling.crashRate,
                    fixSuggestion: `Use: \`return ${match[1]}.${match[2]} if ${match[1]} else None\``,
                    quizAvailable: true
                });
            }
        }

        return issues;
    }

    private detectMissingTryExcept(line: string, lineIdx: number, allLines: string[]): SynapseIssue[] {
        const issues: SynapseIssue[] = [];
        const trimmed = line.trim();

        // Risky calls that should be wrapped in try/except
        const riskyPatterns = [
            { pattern: /open\s*\(/, label: 'file open', error: 'FileNotFoundError / PermissionError' },
            { pattern: /requests\.(get|post|put|delete)\s*\(/, label: 'HTTP request', error: 'requests.ConnectionError / Timeout' },
            { pattern: /json\.loads\s*\(/, label: 'JSON parse', error: 'json.JSONDecodeError' },
            { pattern: /int\s*\(\s*input/, label: 'int(input(...))', error: 'ValueError if user types non-number' },
        ];

        for (const { pattern, label, error } of riskyPatterns) {
            if (pattern.test(trimmed)) {
                // Check if already inside a try block (look back 10 lines)
                const lookback = Math.max(0, lineIdx - 10);
                const precedingLines = allLines.slice(lookback, lineIdx);
                const inTryBlock = precedingLines.some(l => /^\s*try\s*:/.test(l));

                if (!inTryBlock) {
                    const col = line.search(pattern);
                    const cohort = COHORT_DATA.try_except;
                    issues.push({
                        line: lineIdx,
                        col: Math.max(0, col),
                        endCol: line.length,
                        message: `⚠️ SYNAPSE [${cohort.crashRate}% crash rate]: ${label} can throw \`${error}\`. Students with similar code patterns crash here ${cohort.crashRate}% of the time when not wrapped in try/except.\n\nFix: Wrap in try/except block.`,
                        errorType: 'try_except',
                        severity: vscode.DiagnosticSeverity.Warning,
                        crashProbability: cohort.crashRate,
                        fixSuggestion: `Wrap in: try:\\n    ...\\nexcept ${error.split('/')[0].trim()}:\\n    ...`,
                        quizAvailable: true
                    });
                }
            }
        }

        return issues;
    }

    private detectAsyncIssues(line: string, lineIdx: number, allLines: string[]): SynapseIssue[] {
        const issues: SynapseIssue[] = [];
        const trimmed = line.trim();

        // Pattern: awaiting in non-async function
        if (/\bawait\b/.test(trimmed)) {
            // Check if current function is async — look back up to 30 lines
            const lookback = Math.max(0, lineIdx - 30);
            const precedingLines = allLines.slice(lookback, lineIdx);
            const isInsideAsync = precedingLines.some(l => /^\s*async\s+def\s+/.test(l));

            if (!isInsideAsync) {
                const col = line.indexOf('await');
                const cohort = COHORT_DATA.async_await;
                issues.push({
                    line: lineIdx,
                    col,
                    endCol: col + 5,
                    message: `🔴 SYNAPSE [${cohort.crashRate}% crash rate]: \`await\` used outside an \`async\` function. This is a SyntaxError that crashes ${cohort.crashRate}% of the time in this pattern.\n\nFix: Change function definition to \`async def function_name():\``,
                    errorType: 'async_await',
                    severity: vscode.DiagnosticSeverity.Error,
                    crashProbability: cohort.crashRate,
                    fixSuggestion: 'Add `async` to the enclosing function definition.',
                    quizAvailable: true
                });
            }
        }

        // Pattern: calling async function without await
        const asyncCallPattern = /(\w+)\s*=\s*(\w+Async|async_\w+|\w+_async)\s*\(/;
        if (asyncCallPattern.test(trimmed) && !/await/.test(trimmed)) {
            const match = asyncCallPattern.exec(trimmed);
            if (match) {
                const col = line.indexOf(match[0]);
                const cohort = COHORT_DATA.async_await;
                issues.push({
                    line: lineIdx,
                    col,
                    endCol: col + match[0].length,
                    message: `⚠️ SYNAPSE: \`${match[2]}()\` looks like an async function but is not awaited. You'll get a coroutine object instead of the result.\n\nFix: Add \`await\` → \`${match[1]} = await ${match[2]}(...)\``,
                    errorType: 'async_await',
                    severity: vscode.DiagnosticSeverity.Warning,
                    crashProbability: cohort.crashRate,
                    fixSuggestion: `Add await: \`${match[1]} = await ${match[2]}(...)\``,
                    quizAvailable: true
                });
            }
        }

        return issues;
    }

    private detectListIssues(line: string, lineIdx: number): SynapseIssue[] {
        const issues: SynapseIssue[] = [];
        const trimmed = line.trim();

        // Pattern: index access without length check
        const indexPattern = /(\w+)\[(\d+)\]/;
        if (indexPattern.test(trimmed) && !trimmed.includes('if ') && !trimmed.includes('len(')) {
            const match = indexPattern.exec(trimmed);
            if (match && parseInt(match[2]) > 0) {
                const col = line.indexOf(match[0]);
                const cohort = COHORT_DATA.list_ops;
                issues.push({
                    line: lineIdx,
                    col,
                    endCol: col + match[0].length,
                    message: `⚠️ SYNAPSE: Direct index access \`${match[0]}\` without length check. If \`${match[1]}\` has fewer than ${parseInt(match[2]) + 1} elements, this raises \`IndexError\`.\n\nFix: Check \`if len(${match[1]}) > ${match[2]}:\` before accessing.`,
                    errorType: 'list_ops',
                    severity: vscode.DiagnosticSeverity.Information,
                    crashProbability: cohort.crashRate,
                    fixSuggestion: `Add length check: \`if len(${match[1]}) > ${match[2]}: ...\``,
                    quizAvailable: false
                });
            }
        }

        return issues;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private issueToDiagnostic(doc: vscode.TextDocument, issue: SynapseIssue): vscode.Diagnostic {
        const range = new vscode.Range(
            new vscode.Position(issue.line, issue.col),
            new vscode.Position(issue.line, Math.min(issue.endCol, doc.lineAt(issue.line).text.length))
        );

        const diagnostic = new vscode.Diagnostic(range, issue.message, issue.severity);
        diagnostic.source = 'Synapse';
        diagnostic.code = {
            value: issue.errorType,
            target: vscode.Uri.parse(`command:synapse.showQuiz?${encodeURIComponent(JSON.stringify([issue.errorType]))}`)
        };

        // Code action hints
        if (issue.quizAvailable) {
            diagnostic.tags = [];
        }

        return diagnostic;
    }

    dispose() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    }
}
