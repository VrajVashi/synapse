import * as vscode from 'vscode';
import { SynapseAnalyzer } from './pythonAnalyzer';
import { SessionRecorder } from './sessionRecorder';
import { ReplayPanel } from './replayPanel';
import { QuizPanel } from './quizPanel';
import { SynapseApi } from './api';
import { v4 as uuidv4 } from 'uuid';

let diagnosticCollection: vscode.DiagnosticCollection;
let sessionRecorder: SessionRecorder;
let analyzer: SynapseAnalyzer;
let api: SynapseApi;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('🧠 Synapse is now active!');

    // Init core services
    diagnosticCollection = vscode.languages.createDiagnosticCollection('synapse');
    api = new SynapseApi();
    sessionRecorder = new SessionRecorder(context, api);
    analyzer = new SynapseAnalyzer(diagnosticCollection, sessionRecorder);

    // Status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'synapse.showReplay';
    statusBarItem.text = '$(pulse) Synapse';
    statusBarItem.tooltip = 'Synapse: Click to view debugging replay';
    statusBarItem.show();

    // Register commands
    context.subscriptions.push(
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
        // Analyze on open
        vscode.workspace.onDidOpenTextDocument(doc => {
            if (doc.languageId === 'python') {
                analyzer.analyzeDocument(doc);
            }
        }),

        // Analyze on save — also record a "save event" for session tracking
        vscode.workspace.onDidSaveTextDocument(doc => {
            if (doc.languageId === 'python') {
                analyzer.analyzeDocument(doc);
                sessionRecorder.onFileSaved(doc, getStudentId(context));
                updateStatusBar(diagnosticCollection, doc.uri);
            }
        }),

        // Analyze on change (debounced)
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'python') {
                analyzer.onDocumentChanged(event.document);
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

function getStudentId(context: vscode.ExtensionContext): string {
    const config = vscode.workspace.getConfiguration('synapse');
    const configId = config.get<string>('studentId');
    if (configId && configId.length > 0) { return configId; }
    const storedId = context.globalState.get<string>('synapse.studentId');
    if (storedId) { return storedId; }
    // Generate anonymous ID
    const anonId = `anon-${uuidv4().substring(0, 8)}`;
    context.globalState.update('synapse.studentId', anonId);
    return anonId;
}

function updateStatusBar(dc: vscode.DiagnosticCollection, uri: vscode.Uri) {
    const diags = dc.get(uri);
    if (!diags || diags.length === 0) {
        statusBarItem.text = '$(check) Synapse: Clean';
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = `$(warning) Synapse: ${diags.length} pattern${diags.length > 1 ? 's' : ''} detected`;
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
