import * as vscode from 'vscode';
import { SynapseApi, HWQuestion } from './api';

/**
 * SynapseViewProvider — Grammarly-style sidebar panel.
 * Lives in the Synapse activity bar icon on the left.
 * Updates live as diagnostics change.
 */
export class SynapseViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'synapse.sidebarView';
  private _view?: vscode.WebviewView;

  private _issueCount = 0;
  private _issues: Array<{ type: string; message: string; line: number }> = [];
  private _studentId = 'anonymous';
  private _hwQuestions: HWQuestion[] = [];
  private _hwLoaded = false;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _api: SynapseApi
  ) { }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };

    this._render();
    this._loadHomework(); // fetch HW questions in background

    // Handle button clicks from the webview
    webviewView.webview.onDidReceiveMessage(msg => {
      switch (msg.command) {
        case 'takeQuiz':
          vscode.commands.executeCommand('synapse.showQuiz', msg.errorType);
          break;
        case 'showReplay':
          vscode.commands.executeCommand('synapse.showReplay');
          break;
        case 'showDNA':
          vscode.commands.executeCommand('synapse.showDNA');
          break;
        case 'showProblems':
          vscode.commands.executeCommand('workbench.actions.view.problems');
          break;
        case 'register':
          vscode.commands.executeCommand('synapse.registerStudent');
          break;
        case 'openHomework':
          vscode.commands.executeCommand('synapse.openHomework', msg.question);
          break;
      }
    });
  }

  /** Called by extension.ts whenever diagnostics change */
  public updateIssues(
    diagnostics: readonly vscode.Diagnostic[],
    studentId: string
  ) {
    this._studentId = studentId;
    this._issueCount = diagnostics.length;
    this._issues = diagnostics.map(d => ({
      type: d.code?.toString() || 'unknown',
      message: d.message,
      line: d.range.start.line + 1 // 1-indexed
    }));
    this._render();
  }

  public clearIssues() {
    this._issueCount = 0;
    this._issues = [];
    this._render();
  }

  /** Called by extension.ts when a HW file is opened — tags future sessions */
  public setActiveHomework(hwId: string, filename: string) {
    // Just re-render; the actual tagging happens in SessionRecorder.
    // This could be used to highlight the active HW question in sidebar.
    this._render();
  }

  private async _loadHomework() {
    const config = vscode.workspace.getConfiguration('synapse');
    const classroomId = config.get<string>('classroomId') || '';
    this._hwQuestions = await this._api.getHomework(classroomId);
    this._hwLoaded = true;
    this._render();
  }

  private _render() {
    if (!this._view) { return; }
    this._view.webview.html = this._getHtml();
  }

  private _getHtml(): string {
    const count = this._issueCount;

    // Deduplicate error types and pick unique ones for quiz buttons
    const uniqueTypes = [...new Set(this._issues.map(i => i.type))];

    const issueRows = this._issues.map(issue => `
            <div class="issue-row" onclick="post('takeQuiz', '${issue.type}')">
                <div class="issue-left">
                    <div class="issue-dot ${issue.type}"></div>
                    <div>
                        <div class="issue-type">${issue.type.replace(/_/g, ' ')}</div>
                        <div class="issue-msg">${issue.message.substring(0, 70)}${issue.message.length > 70 ? '…' : ''}</div>
                    </div>
                </div>
                <div class="issue-line">L${issue.line}</div>
            </div>
        `).join('');

    const quizButtons = uniqueTypes.map(t => `
            <button class="btn btn-orange" onclick="post('takeQuiz', '${t}')">
                Quiz: ${t.replace(/_/g, ' ')}
            </button>
        `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
    font-size: 12px; color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    padding: 0; user-select: none;
  }

  /* ── Score card top ── */
  .top-card {
    background: ${count > 0 ? '#f9731612' : '#22c55e10'};
    border-bottom: 1px solid ${count > 0 ? '#f9731625' : '#22c55e20'};
    padding: 14px 14px 12px;
  }
  .score-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .score-badge {
    width: 42px; height: 42px; border-radius: 10px;
    background: ${count > 0 ? '#f97316' : '#22c55e'};
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 900; color: #000; flex-shrink: 0;
  }
  .score-label { font-size: 13px; font-weight: 700; color: var(--vscode-foreground); }
  .score-sub { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px; }

  /* ── Issue list ── */
  .section-label {
    padding: 10px 14px 6px;
    font-size: 10px; font-weight: 700;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase; letter-spacing: 0.08em;
  }
  .issue-row {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 8px 14px; cursor: pointer; gap: 8px;
    border-bottom: 1px solid var(--vscode-sideBar-border, #ffffff0a);
    transition: background 0.1s;
  }
  .issue-row:hover { background: var(--vscode-list-hoverBackground); }
  .issue-left { display: flex; align-items: flex-start; gap: 8px; flex: 1; min-width: 0; }
  .issue-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 3px;
  }
  .issue-dot.none_handling { background: #f97316; }
  .issue-dot.try_except    { background: #f87171; }
  .issue-dot.async_await   { background: #38bdf8; }
  .issue-dot.list_ops      { background: #4ade80; }
  .issue-dot.unknown       { background: #888; }
  .issue-type { font-size: 11px; font-weight: 600; color: var(--vscode-foreground); text-transform: capitalize; }
  .issue-msg  { font-size: 10px; color: var(--vscode-descriptionForeground); line-height: 1.4; margin-top: 1px; }
  .issue-line { font-size: 10px; color: var(--vscode-descriptionForeground); flex-shrink: 0; padding-top: 2px; }

  /* ── Buttons ── */
  .actions { padding: 10px 14px; display: flex; flex-direction: column; gap: 6px; }
  .btn {
    width: 100%; padding: 7px 12px; border-radius: 7px;
    border: 1px solid transparent; cursor: pointer;
    font-size: 11px; font-weight: 600; text-align: left;
    transition: opacity 0.15s;
  }
  .btn:hover { opacity: 0.85; }
  .btn-orange {
    background: #f97316; color: #000; border-color: #f97316;
  }
  .btn-ghost {
    background: transparent;
    color: var(--vscode-foreground);
    border-color: var(--vscode-sideBar-border, #ffffff15);
  }
  .divider { height: 1px; background: var(--vscode-sideBar-border, #ffffff0a); margin: 4px 0; }

  /* ── Empty state ── */
  .empty { padding: 24px 14px; text-align: center; color: var(--vscode-descriptionForeground); }
  .empty-icon { font-size: 32px; margin-bottom: 8px; }
  .empty-title { font-size: 12px; font-weight: 600; color: var(--vscode-foreground); margin-bottom: 4px; }
  .empty-sub { font-size: 11px; line-height: 1.5; }
</style>
</head>
<body>

  <!-- Score card -->
  <div class="top-card">
    <div class="score-row">
      <div class="score-badge">${count > 0 ? count : '✓'}</div>
      <div>
        <div class="score-label">${count > 0 ? `${count} issue${count > 1 ? 's' : ''} detected` : 'All clear!'}</div>
        <div class="score-sub">${count > 0 ? 'Click an issue to take a targeted quiz' : 'No patterns detected in this file'}</div>
      </div>
    </div>
  </div>

  <!-- Issue list -->
  ${count > 0 ? `
    <div class="section-label">Issues in this file</div>
    ${issueRows}

    <!-- Quiz buttons per error type -->
    <div class="section-label">Targeted Quizzes</div>
    <div class="actions">
      ${quizButtons}
    </div>
  ` : `
    <div class="empty">
      <div class="empty-icon">🎯</div>
      <div class="empty-title">Great work!</div>
      <div class="empty-sub">Open a Python file to start tracking your debugging patterns.</div>
    </div>
  `}

  <!-- Always-visible tools -->
  <div class="divider"></div>
  <div class="actions">
    <button class="btn btn-ghost" onclick="post('showReplay')">📼 Debugging Replay</button>
    <button class="btn btn-ghost" onclick="post('showDNA')">🧬 Debugging DNA</button>
    <button class="btn btn-ghost" onclick="post('showProblems')">⚠ View All Problems</button>
    <button class="btn btn-ghost" onclick="post('register')">👤 ${this._studentId}</button>
  </div>

  <!-- Homework section -->
  ${this._hwLoaded && this._hwQuestions.length > 0 ? `
  <div class="divider"></div>
  <div class="section-label">📋 Homework</div>
  <div class="actions">
    ${this._hwQuestions
          .filter(q => q.status === 'open')
          .map(q => `
      <button class="btn btn-ghost" style="text-align:left;white-space:normal;line-height:1.35"
        onclick="post('openHomework', ${JSON.stringify(JSON.stringify(q))})"
        title="${q.dueDate ? 'Due: ' + q.dueDate : 'No deadline'}">
        ✏️ ${q.title}
      </button>`).join('')}
  </div>
  ` : this._hwLoaded ? '' : `
  <div class="divider"></div>
  <div style="padding:8px 14px;font-size:10px;color:var(--vscode-descriptionForeground)">Loading homework…</div>
  `}

<script>
  const vscode = acquireVsCodeApi();
  function post(command, data) {
    if (command === 'openHomework') {
      vscode.postMessage({ command, question: JSON.parse(data) });
    } else {
      vscode.postMessage({ command, errorType: data });
    }
  }
</script>
</body>
</html>`;
  }
}
