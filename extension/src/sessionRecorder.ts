import * as vscode from 'vscode';
import { SynapseApi } from './api';
import { SynapseIssue } from './pythonAnalyzer';

export interface DebugAttempt {
    attemptNumber: number;
    timestamp: string;
    filePath: string;
    errorType: string;
    codeSnapshot: string;
    resolved: boolean;
    durationSeconds: number;
}

export interface DebugSession {
    sessionId: string;
    studentId: string;
    filePath: string;
    errorType: string;
    startTime: string;
    attempts: DebugAttempt[];
    resolved: boolean;
    totalDurationSeconds: number;
}

export class SessionRecorder {
    private activeSessions = new Map<string, DebugSession>(); // key: filePath + errorType
    private lastSavedContent = new Map<string, string>(); // key: filePath
    private flushTimer: NodeJS.Timeout | undefined;
    private readonly flushIntervalMs = 30000; // flush to API every 30s

    constructor(
        private context: vscode.ExtensionContext,
        private api: SynapseApi
    ) {
        // Restore sessions from local storage (in case of restart)
        const stored = this.context.globalState.get<DebugSession[]>('synapse.sessions', []);
        stored.forEach(s => {
            if (!s.resolved) {
                this.activeSessions.set(`${s.filePath}::${s.errorType}`, s);
            }
        });

        // Periodic flush
        this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
    }

    onIssuesDetected(filePath: string, issues: SynapseIssue[]) {
        issues.forEach(issue => {
            const key = `${filePath}::${issue.errorType}`;
            if (!this.activeSessions.has(key)) {
                // New error type — start session
                const session: DebugSession = {
                    sessionId: this.generateId(),
                    studentId: this.getStudentId(),
                    filePath,
                    errorType: issue.errorType,
                    startTime: new Date().toISOString(),
                    attempts: [],
                    resolved: false,
                    totalDurationSeconds: 0
                };
                this.activeSessions.set(key, session);
                this.saveLocalSessions();
            }
        });
    }

    onFileSaved(doc: vscode.TextDocument, studentId: string) {
        const filePath = doc.uri.fsPath;
        const currentContent = doc.getText();
        const prevContent = this.lastSavedContent.get(filePath) || '';
        this.lastSavedContent.set(filePath, currentContent);

        // For each active session on this file, record a save attempt
        this.activeSessions.forEach((session, key) => {
            if (!session.filePath.includes(filePath.split('/').pop() || '')) { return; }

            const attempt: DebugAttempt = {
                attemptNumber: session.attempts.length + 1,
                timestamp: new Date().toISOString(),
                filePath,
                errorType: session.errorType,
                codeSnapshot: currentContent.substring(0, 500), // truncate for storage
                resolved: false,
                durationSeconds: this.getSessionDurationSeconds(session)
            };

            session.attempts.push(attempt);
            this.saveLocalSessions();
        });
    }

    markResolved(filePath: string, errorType: string) {
        const key = `${filePath}::${errorType}`;
        const session = this.activeSessions.get(key);
        if (session) {
            session.resolved = true;
            session.totalDurationSeconds = this.getSessionDurationSeconds(session);

            // Record resolution in last attempt
            if (session.attempts.length > 0) {
                session.attempts[session.attempts.length - 1].resolved = true;
            }

            // Send to API
            this.api.recordSession(session).catch(console.error);
            this.activeSessions.delete(key);
            this.saveLocalSessions();

            // Show success message with stats
            const minutes = Math.round(session.totalDurationSeconds / 60);
            const attemptCount = session.attempts.length;
            vscode.window.showInformationMessage(
                `✅ Synapse: ${errorType.replace('_', ' ')} resolved in ${minutes} min (${attemptCount} attempt${attemptCount > 1 ? 's' : ''}). View your debugging replay →`,
                'View Replay'
            ).then(action => {
                if (action === 'View Replay') {
                    vscode.commands.executeCommand('synapse.showReplay');
                }
            });
        }
    }

    getLocalSessions(): DebugSession[] {
        return this.context.globalState.get<DebugSession[]>('synapse.sessions', []);
    }

    getActiveSessions(): DebugSession[] {
        return Array.from(this.activeSessions.values());
    }

    private async flush() {
        const sessions = this.getLocalSessions();
        const unsynced = sessions.filter((s: any) => !s.synced && s.attempts.length > 0);

        for (const session of unsynced) {
            try {
                await this.api.recordSession(session);
                (session as any).synced = true;
            } catch {
                // Offline — will retry next flush
            }
        }

        if (unsynced.length > 0) {
            this.saveLocalSessions();
        }
    }

    private saveLocalSessions() {
        const all = [
            ...this.getLocalSessions().filter(s => s.resolved),
            ...Array.from(this.activeSessions.values())
        ];
        // Keep only last 50 sessions
        const trimmed = all.slice(-50);
        this.context.globalState.update('synapse.sessions', trimmed);
    }

    private getStudentId(): string {
        const config = vscode.workspace.getConfiguration('synapse');
        return config.get<string>('studentId') || 'anonymous';
    }

    private getSessionDurationSeconds(session: DebugSession): number {
        const start = new Date(session.startTime).getTime();
        return Math.round((Date.now() - start) / 1000);
    }

    private generateId(): string {
        return `s_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    dispose() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        this.flush();
    }
}
