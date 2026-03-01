import * as vscode from 'vscode';
import { DebugSession } from './sessionRecorder';

const BASE_URL_CONFIG_KEY = 'synapse.apiEndpoint';

export class SynapseApi {
    private getBase(): string {
        const config = vscode.workspace.getConfiguration('synapse');
        return config.get<string>(BASE_URL_CONFIG_KEY) || '';
    }

    async recordSession(session: DebugSession): Promise<void> {
        const base = this.getBase();
        if (!base) { return; } // No API configured yet

        // Inject cohortId from VS Code settings so the Lambda can write it to DynamoDB
        const config = vscode.workspace.getConfiguration('synapse');
        const cohortId = config.get<string>('cohortId') || '';
        await this.post('/sessions', { ...session, cohortId });
    }

    async getSessions(studentId: string): Promise<DebugSession[]> {
        const base = this.getBase();
        if (!base) { return []; }

        try {
            const response = await fetch(`${base}/sessions?studentId=${encodeURIComponent(studentId)}`);
            if (!response.ok) { return []; }
            const data = await response.json() as { sessions: DebugSession[] };
            return data.sessions || [];
        } catch {
            return [];
        }
    }

    async getCohortPatterns(errorType: string): Promise<CohortPattern | null> {
        const base = this.getBase();
        if (!base) { return null; }

        try {
            const response = await fetch(`${base}/cohort/patterns?errorType=${encodeURIComponent(errorType)}`);
            if (!response.ok) { return null; }
            return await response.json() as CohortPattern;
        } catch {
            return null;
        }
    }

    async getStudentDNA(studentId: string): Promise<StudentDNA | null> {
        const base = this.getBase();
        if (!base) { return null; }

        try {
            const response = await fetch(`${base}/students/${encodeURIComponent(studentId)}/dna`);
            if (!response.ok) { return null; }
            return await response.json() as StudentDNA;
        } catch {
            return null;
        }
    }

    async getQuiz(errorType: string): Promise<QuizQuestion[]> {
        const base = this.getBase();
        if (!base) { return getHardcodedQuiz(errorType); }

        try {
            const response = await fetch(`${base}/quiz?errorType=${encodeURIComponent(errorType)}`);
            if (!response.ok) { return getHardcodedQuiz(errorType); }
            const data = await response.json() as { questions: QuizQuestion[] };
            return data.questions || getHardcodedQuiz(errorType);
        } catch {
            return getHardcodedQuiz(errorType);
        }
    }

    async submitQuizResult(studentId: string, errorType: string, score: number, total: number): Promise<void> {
        const base = this.getBase();
        if (!base) { return; }

        await this.post('/quiz/results', { studentId, errorType, score, total, timestamp: new Date().toISOString() });
    }

    private async post(path: string, body: unknown): Promise<void> {
        const base = this.getBase();
        if (!base) { return; }

        try {
            await fetch(`${base}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        } catch {
            // Silently fail — offline mode
        }
    }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CohortPattern {
    errorType: string;
    crashRate: number;
    avgFixMinutes: number;
    totalSessions: number;
    topFixes: string[];
}

export interface StudentDNA {
    studentId: string;
    debuggingStyle: 'trial-and-error' | 'systematic' | 'visual';
    avgFixMinutes: number;
    classAvgMinutes: number;
    topErrorTypes: Array<{ type: string; count: number }>;
    totalSessions: number;
    streakDays: number;
}

export interface QuizQuestion {
    id: string;
    errorType: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

// ─── Hardcoded Quiz Questions (MVP — zero hallucination risk) ─────────────

function getHardcodedQuiz(errorType: string): QuizQuestion[] {
    const quizzes: Record<string, QuizQuestion[]> = {
        none_handling: [
            {
                id: 'nh1',
                errorType: 'none_handling',
                question: 'What does `dict.get("key")` return if the key doesn\'t exist?',
                options: ['Raises KeyError', 'Returns None', 'Returns empty string ""', 'Returns False'],
                correctIndex: 1,
                explanation: '`dict.get()` returns None by default if the key is missing. Use `dict.get("key", default_value)` to provide a fallback.'
            },
            {
                id: 'nh2',
                errorType: 'none_handling',
                question: 'Which code safely accesses `user.name` when `user` could be None?',
                options: [
                    'name = user.name',
                    'name = user.name if user else "Unknown"',
                    'name = user["name"]',
                    'name = str(user.name)'
                ],
                correctIndex: 1,
                explanation: 'The conditional expression `user.name if user else "Unknown"` checks for None before accessing the attribute. This is the Pythonic way to handle optional values.'
            },
            {
                id: 'nh3',
                errorType: 'none_handling',
                question: 'What error is raised when you do `result.name` and `result` is None?',
                options: ['ValueError', 'TypeError', 'AttributeError', 'NullPointerError'],
                correctIndex: 2,
                explanation: 'Python raises `AttributeError: \'NoneType\' object has no attribute \'name\'`. None is of type NoneType, which has no attributes. Always check `if result is not None:` first.'
            },
            {
                id: 'nh4',
                errorType: 'none_handling',
                question: 'What\'s the safest way to chain attribute access that might be None?',
                options: [
                    'user.address.city',
                    'user and user.address and user.address.city',
                    'getattr(user, "address", None) and getattr(user.address, "city", None)',
                    'try: user.address.city except: pass'
                ],
                correctIndex: 2,
                explanation: '`getattr(obj, attr, default)` is safer than direct access. It returns the default if the attribute doesn\'t exist or the object is None-like. Option B also works but is less Pythonic.'
            },
            {
                id: 'nh5',
                errorType: 'none_handling',
                question: 'Which operator helps with None defaults in Python 3.x?',
                options: ['?? (nullish)', '|| (or)', 'or keyword', ':= (walrus)'],
                correctIndex: 2,
                explanation: 'Python uses `or` for defaults: `value = result or "default"`. Note: this also catches other falsy values (0, "", []). For strict None check use: `value = result if result is not None else "default"`. Python 3.8+ also has `:=` walrus but that\'s assignment, not default.'
            },
        ],
        async_await: [
            {
                id: 'aa1',
                errorType: 'async_await',
                question: 'What happens if you call an async function without `await`?',
                options: [
                    'It runs synchronously',
                    'It raises an error immediately',
                    'You get a coroutine object (not the result)',
                    'It runs in a background thread'
                ],
                correctIndex: 2,
                explanation: 'Calling an async function without await returns a coroutine object — Python\'s way of saying "here\'s the recipe, but you haven\'t cooked it yet." You need `await` to actually execute it and get the result.'
            },
            {
                id: 'aa2',
                errorType: 'async_await',
                question: '`await` can only be used inside what type of function?',
                options: ['Any function', 'Generator functions only', 'async def functions', 'Class methods only'],
                correctIndex: 2,
                explanation: '`await` is only valid inside `async def` functions. Using it in a regular `def` function is a SyntaxError. The entire call chain from top to bottom must be async.'
            },
            {
                id: 'aa3',
                errorType: 'async_await',
                question: 'How do you run an async function from synchronous Python code (e.g., script top-level)?',
                options: [
                    'async_func()',
                    'await async_func()',
                    'asyncio.run(async_func())',
                    'Thread(target=async_func).start()'
                ],
                correctIndex: 2,
                explanation: '`asyncio.run()` is the standard way to run an async function from synchronous code. It creates an event loop, runs the coroutine to completion, and closes the loop. Never call `await` at the module top level (unless using Python 3.10+ `asyncio.run()`).'
            },
        ],
        try_except: [
            {
                id: 'te1',
                errorType: 'try_except',
                question: 'Which is the correct way to catch multiple exception types?',
                options: [
                    'except ValueError, TypeError:',
                    'except (ValueError, TypeError):',
                    'except ValueError | TypeError:',
                    'except ValueError or TypeError:'
                ],
                correctIndex: 1,
                explanation: 'Use a tuple `except (ValueError, TypeError):` to catch multiple exception types. You can also stack multiple `except` blocks. The comma syntax `except ValueError, TypeError:` is Python 2 only.'
            },
            {
                id: 'te2',
                errorType: 'try_except',
                question: 'What\'s wrong with using bare `except:` (no exception type)?',
                options: [
                    'Nothing, it\'s fine',
                    'It\'s slower than specific exceptions',
                    'It catches everything including KeyboardInterrupt and SystemExit',
                    'It only works in Python 2'
                ],
                correctIndex: 2,
                explanation: 'Bare `except:` catches absolutely everything, including `KeyboardInterrupt` (Ctrl+C) and `SystemExit`. This means you can\'t stop the program! Always catch specific exceptions, or at minimum use `except Exception:` which excludes system exceptions.'
            },
        ],
        list_ops: [
            {
                id: 'lo1',
                errorType: 'list_ops',
                question: 'What does `items[-1]` return?',
                options: ['Raises IndexError', 'Returns None', 'Returns the last element', 'Returns the second-to-last element'],
                correctIndex: 2,
                explanation: 'Negative indexing in Python accesses elements from the end. `items[-1]` is the last element, `items[-2]` is second-to-last, etc. If the list is empty, `items[-1]` raises `IndexError`.'
            },
            {
                id: 'lo2',
                errorType: 'list_ops',
                question: 'How do you safely get the first element of a list that might be empty?',
                options: [
                    'items[0]',
                    'items.first()',
                    'items[0] if items else None',
                    'items.get(0)'
                ],
                correctIndex: 2,
                explanation: '`items[0] if items else None` is Pythonic and safe. An empty list is falsy in Python. `items[0]` alone raises `IndexError` on empty lists. Lists don\'t have `.first()` or `.get()` methods.'
            },
        ]
    };

    return quizzes[errorType] || quizzes.none_handling;
}
