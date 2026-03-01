import * as vscode from 'vscode';
import { SynapseAnalyzer } from './pythonAnalyzer';
import { SessionRecorder } from './sessionRecorder';
import { ReplayPanel } from './replayPanel';
import { QuizPanel } from './quizPanel';
import { SynapseApi } from './api';
import { SynapseViewProvider } from './sidebarProvider';
import { v4 as uuidv4 } from 'uuid';

let diagnosticCollection: vscode.DiagnosticCollection;
let sessionRecorder: SessionRecorder;
let analyzer: SynapseAnalyzer;
let api: SynapseApi;
let statusBarItem: vscode.StatusBarItem;
let sidebarProvider: SynapseViewProvider;

// Track issues from last analysis so the menu can show them
let lastIssueCount = 0;
let lastErrorTypes: string[] = [];

export function activate(context: vscode.ExtensionContext) {
    console.log('🧠 Synapse is now active!');

    // Init core services
    diagnosticCollection = vscode.languages.createDiagnosticCollection('synapse');
    api = new SynapseApi();
    sessionRecorder = new SessionRecorder(context, api);
    analyzer = new SynapseAnalyzer(diagnosticCollection, sessionRecorder, api);

    // Sidebar panel (Grammarly-style)
    sidebarProvider = new SynapseViewProvider(context.extensionUri, context);

    // Gate session tracking based on classroom membership
    sidebarProvider.onClassroomChanged(() => {
        sessionRecorder.setEnabled(sidebarProvider.isInClassroom());
    });
    // Set initial tracking state
    sessionRecorder.setEnabled(sidebarProvider.isInClassroom());
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SynapseViewProvider.viewType,
            sidebarProvider,
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

    // Status bar — clicking opens the Synapse menu popup
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'synapse.showMenu';
    statusBarItem.text = '$(pulse) Synapse';
    statusBarItem.tooltip = 'Synapse — Click to open menu';
    statusBarItem.show();

    // Register commands
    context.subscriptions.push(

        // ── NEW: Menu popup command ─────────────────────────────────────
        vscode.commands.registerCommand('synapse.showMenu', () => {
            showSynapseMenu(context);
        }),

        vscode.commands.registerCommand('synapse.showReplay', () => {
            const studentId = getStudentId(context);
            ReplayPanel.createOrShow(context.extensionUri, studentId, api);
        }),

        vscode.commands.registerCommand('synapse.showQuiz', (errorType?: string) => {
            QuizPanel.createOrShow(context.extensionUri, errorType || 'none_handling');
        }),

        vscode.commands.registerCommand('synapse.showDNA', () => {
            const studentId = getStudentId(context);
            ReplayPanel.createOrShow(context.extensionUri, studentId, api, 'dna');
        }),

        vscode.commands.registerCommand('synapse.registerStudent', async () => {
            const studentId = await vscode.window.showInputBox({
                prompt: 'Enter your Synapse Student ID (get this from your instructor)',
                placeHolder: 'e.g. MSB-2024-0042',
                ignoreFocusOut: true
            });
            if (studentId) {
                await context.globalState.update('synapse.studentId', studentId);
                const config = vscode.workspace.getConfiguration('synapse');
                await config.update('studentId', studentId, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`✅ Synapse: Registered as ${studentId}!`);
            }
        })
    );

    // Auto-register if not set
    ensureStudentRegistered(context);

    // Watch Python files
    const pythonWatcher = vscode.workspace.createFileSystemWatcher('**/*.py');

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(doc => {
            if (doc.languageId === 'python') {
                analyzer.analyzeDocument(doc);
            }
        }),

        vscode.workspace.onDidSaveTextDocument(doc => {
            if (doc.languageId === 'python') {
                analyzer.analyzeDocument(doc);
                if (sidebarProvider.isInClassroom()) {
                    sessionRecorder.onFileSaved(doc, getStudentId(context));
                }
                updateStatusBar(diagnosticCollection, doc.uri);
            }
        }),

        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'python') {
                analyzer.onDocumentChanged(event.document);
                updateStatusBar(diagnosticCollection, event.document.uri);
            }
        }),

        // ✅ THE RELIABLE FIX: fires AFTER diagnostics are written, not before
        vscode.languages.onDidChangeDiagnostics(e => {
            const activeDoc = vscode.window.activeTextEditor?.document;
            if (!activeDoc || activeDoc.languageId !== 'python') { return; }
            // Only care if the active file changed
            const affected = e.uris.some(u => u.toString() === activeDoc.uri.toString());
            if (!affected) { return; }
            const diags = diagnosticCollection.get(activeDoc.uri) || [];
            sidebarProvider.updateIssues(diags, getStudentId(context));
            updateStatusBar(diagnosticCollection, activeDoc.uri);
        }),

        // Update sidebar when user switches files.
        // NOTE: editor is undefined when a webview (quiz/replay) gets focus — don't clear in that case
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (!editor) { return; } // webview focused — keep existing sidebar state
            if (editor.document.languageId === 'python') {
                const diags = diagnosticCollection.get(editor.document.uri) || [];
                sidebarProvider.updateIssues(diags, getStudentId(context));
                updateStatusBar(diagnosticCollection, editor.document.uri);
            } else {
                sidebarProvider.clearIssues();
            }
        }),

        diagnosticCollection,
        statusBarItem,
        pythonWatcher
    );

    // Analyze already-open Python files
    vscode.workspace.textDocuments.forEach(doc => {
        if (doc.languageId === 'python') {
            analyzer.analyzeDocument(doc);
        }
    });

    showWelcomeIfNew(context);
}

// ── Synapse QuickPick Menu ──────────────────────────────────────────────────
async function showSynapseMenu(context: vscode.ExtensionContext) {
    const studentId = getStudentId(context);
    const activeDoc = vscode.window.activeTextEditor?.document;

    // Get diagnostics for the active file
    let fileDiags: readonly vscode.Diagnostic[] = [];
    if (activeDoc) {
        fileDiags = diagnosticCollection.get(activeDoc.uri) || [];
    }

    const issueCount = fileDiags.length;

    // Build the error types found in the current file
    const foundTypes = [...new Set(
        fileDiags
            .map(d => d.code?.toString() || '')
            .filter(c => c.length > 0)
    )];

    // ── Header separator ──
    const headerLabel = issueCount > 0
        ? `$(warning) ${issueCount} pattern${issueCount > 1 ? 's' : ''} detected in this file`
        : `$(check) No issues detected`;

    type QuickPickItemWithAction = vscode.QuickPickItem & { action?: string; errorType?: string };

    // ── Build menu items ──
    const items: QuickPickItemWithAction[] = [];

    // Issue-specific quiz shortcuts (only shown when issues exist)
    if (foundTypes.length > 0) {
        items.push({ label: '', kind: vscode.QuickPickItemKind.Separator, description: 'Fix Issues' } as any);

        for (const errorType of foundTypes) {
            const label = errorType.replace(/_/g, ' ');
            items.push({
                label: `$(mortar-board)  Take "${label}" Quiz`,
                description: 'targeted for your current error pattern',
                action: 'quiz',
                errorType
            });
        }
    }

    // ── Core actions ──
    items.push({ label: '', kind: vscode.QuickPickItemKind.Separator, description: 'Synapse Tools' } as any);

    items.push({
        label: '$(history)  Debugging Replay',
        description: 'view your full session history & attempt timeline',
        action: 'replay'
    });

    items.push({
        label: '$(graph)  Debugging DNA Profile',
        description: 'see your debugging style vs class average',
        action: 'dna'
    });

    items.push({
        label: '$(beaker)  Take a Quiz',
        description: 'adaptive quiz based on your struggle patterns',
        action: 'quiz',
        errorType: foundTypes[0] || 'none_handling'
    });

    // ── Settings ──
    items.push({ label: '', kind: vscode.QuickPickItemKind.Separator, description: 'Settings' } as any);

    items.push({
        label: '$(person)  Register Student ID',
        description: `currently: ${studentId}`,
        action: 'register'
    });

    items.push({
        label: '$(list-unordered)  View All Issues',
        description: 'open the Problems panel',
        action: 'problems'
    });

    // ── Show QuickPick ──
    const pick = await vscode.window.showQuickPick(items, {
        title: `⚡ Synapse  —  ${headerLabel}`,
        placeHolder: 'Select an action...',
        matchOnDescription: true,
    });

    if (!pick || !pick.action) { return; }

    switch (pick.action) {
        case 'replay':
            vscode.commands.executeCommand('synapse.showReplay');
            break;
        case 'dna':
            vscode.commands.executeCommand('synapse.showDNA');
            break;
        case 'quiz':
            vscode.commands.executeCommand('synapse.showQuiz', pick.errorType);
            break;
        case 'register':
            vscode.commands.executeCommand('synapse.registerStudent');
            break;
        case 'problems':
            vscode.commands.executeCommand('workbench.actions.view.problems');
            break;
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function getStudentId(context: vscode.ExtensionContext): string {
    const config = vscode.workspace.getConfiguration('synapse');
    const configId = config.get<string>('studentId');
    if (configId && configId.length > 0) { return configId; }
    const storedId = context.globalState.get<string>('synapse.studentId');
    if (storedId) { return storedId; }
    const anonId = `anon-${uuidv4().substring(0, 8)}`;
    context.globalState.update('synapse.studentId', anonId);
    return anonId;
}

function updateStatusBar(dc: vscode.DiagnosticCollection, uri: vscode.Uri) {
    const diags = dc.get(uri);
    if (!diags || diags.length === 0) {
        statusBarItem.text = '$(check) Synapse';
        statusBarItem.tooltip = 'Synapse — No issues detected. Click to open menu.';
        statusBarItem.backgroundColor = undefined;
    } else {
        const count = diags.length;
        statusBarItem.text = `$(warning) Synapse  ${count} issue${count > 1 ? 's' : ''}`;
        statusBarItem.tooltip = `Synapse — ${count} pattern${count > 1 ? 's' : ''} detected. Click to open menu.`;
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
}

async function ensureStudentRegistered(context: vscode.ExtensionContext) {
    const stored = context.globalState.get<string>('synapse.studentId');
    if (!stored) {
        const action = await vscode.window.showInformationMessage(
            '🧠 Synapse: Register to enable debugging session tracking and replay.',
            'Register Now',
            'Use Anonymous'
        );
        if (action === 'Register Now') {
            vscode.commands.executeCommand('synapse.registerStudent');
        }
    }
}

async function showWelcomeIfNew(context: vscode.ExtensionContext) {
    const welcomed = context.globalState.get<boolean>('synapse.welcomed');
    if (!welcomed) {
        await context.globalState.update('synapse.welcomed', true);
        vscode.window.showInformationMessage(
            '🧠 Synapse is active! Open a Python file to start debugging intelligence.',
            'View Docs', 'Dismiss'
        ).then(action => {
            if (action === 'View Docs') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/VrajVashi/synapse'));
            }
        });
    }
}

export function deactivate() {
    diagnosticCollection?.dispose();
    sessionRecorder?.dispose();
}
