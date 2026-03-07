import * as vscode from 'vscode';

// ── Data types ──────────────────────────────────────────────────────────────
export interface ClassroomEntry {
  id: string;
  status: 'pending' | 'active';
  joinedAt: string;
}

/**
 * SynapseViewProvider — Grammarly-style sidebar panel.
 * Now includes: Classroom join/switch, Activities placeholder,
 * and the existing diagnostics panel (gated on classroom membership).
 */
export class SynapseViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'synapse.sidebarView';
  private _view?: vscode.WebviewView;

  private _issueCount = 0;
  private _issues: Array<{ type: string; message: string; line: number }> = [];
  private _studentId = 'anonymous';

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) { }

  // ── Classroom state helpers ─────────────────────────────────────────────
  public getClassrooms(): ClassroomEntry[] {
    return this._context.globalState.get<ClassroomEntry[]>('synapse.classrooms', []);
  }

  private saveClassrooms(classrooms: ClassroomEntry[]) {
    this._context.globalState.update('synapse.classrooms', classrooms);
  }

  public getActiveClassroomId(): string {
    return this._context.globalState.get<string>('synapse.activeClassroom', '');
  }

  private setActiveClassroomId(id: string) {
    this._context.globalState.update('synapse.activeClassroom', id);
  }

  /** True if the student has at least one active (approved) classroom */
  public isInClassroom(): boolean {
    return this.getClassrooms().some(c => c.status === 'active');
  }

  private joinClassroom(classroomId: string) {
    const classrooms = this.getClassrooms();

    // Don't add duplicates
    if (classrooms.find(c => c.id === classroomId)) {
      this._render();
      return;
    }

    classrooms.push({
      id: classroomId,
      status: 'pending',
      joinedAt: new Date().toISOString(),
    });
    this.saveClassrooms(classrooms);
    this._render();

    // Simulate instructor approval after 2 seconds
    setTimeout(() => {
      const current = this.getClassrooms();
      const entry = current.find(c => c.id === classroomId);
      if (entry && entry.status === 'pending') {
        entry.status = 'active';
        this.saveClassrooms(current);

        // Auto-select if this is the first classroom
        if (!this.getActiveClassroomId()) {
          this.setActiveClassroomId(classroomId);
        }
        this._render();

        // Notify extension that classroom state changed
        this._onClassroomChanged.fire();
      }
    }, 2000);
  }

  private switchClassroom(classroomId: string) {
    this.setActiveClassroomId(classroomId);
    this._render();
    this._onClassroomChanged.fire();
  }

  private leaveClassroom(classroomId: string) {
    let classrooms = this.getClassrooms().filter(c => c.id !== classroomId);
    this.saveClassrooms(classrooms);

    // If we left the active one, switch to another active classroom or clear
    if (this.getActiveClassroomId() === classroomId) {
      const nextActive = classrooms.find(c => c.status === 'active');
      this.setActiveClassroomId(nextActive?.id || '');
    }
    this._render();
    this._onClassroomChanged.fire();
  }

  // Event that fires when classroom state changes (for gating session tracking)
  private _onClassroomChanged = new vscode.EventEmitter<void>();
  public readonly onClassroomChanged = this._onClassroomChanged.event;

  // ── Webview lifecycle ───────────────────────────────────────────────────
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };

    this._render();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(msg => {
      switch (msg.command) {
        case 'joinClassroom':
          if (msg.classroomId) {
            this.joinClassroom(msg.classroomId.trim().toUpperCase());
          }
          break;
        case 'switchClassroom':
          this.switchClassroom(msg.classroomId);
          break;
        case 'leaveClassroom':
          this.leaveClassroom(msg.classroomId);
          break;
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
      line: d.range.start.line + 1
    }));
    this._render();
  }

  public clearIssues() {
    this._issueCount = 0;
    this._issues = [];
    this._render();
  }

  private _render() {
    if (!this._view) { return; }
    this._view.webview.html = this._getHtml();
  }

  // ── HTML Builder ────────────────────────────────────────────────────────
  private _getHtml(): string {
    const classrooms = this.getClassrooms();
    const activeId = this.getActiveClassroomId();
    const activeClassrooms = classrooms.filter(c => c.status === 'active');
    const pendingClassrooms = classrooms.filter(c => c.status === 'pending');
    const inClassroom = activeClassrooms.length > 0;

    const count = this._issueCount;
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

    // ── Classroom switcher HTML ──
    let classroomSwitcherHtml = '';
    if (activeClassrooms.length > 0) {
      const options = activeClassrooms.map(c =>
        `<div class="cr-item ${c.id === activeId ? 'active' : ''}" onclick="post('switchClassroom','${c.id}')">
                    <span class="cr-dot ${c.id === activeId ? 'on' : ''}"></span>
                    <span class="cr-id">${c.id}</span>
                    <button class="cr-leave" onclick="event.stopPropagation(); post('leaveClassroom','${c.id}')" title="Leave">✕</button>
                </div>`
      ).join('');
      classroomSwitcherHtml = `
                <div class="section-label">YOUR CLASSROOMS</div>
                <div class="cr-list">${options}</div>`;
    }

    // ── Pending classrooms HTML ──
    let pendingHtml = '';
    if (pendingClassrooms.length > 0) {
      pendingHtml = pendingClassrooms.map(c => `
                <div class="pending-card">
                    <span class="pending-icon">⏳</span>
                    <div>
                        <div class="pending-id">${c.id}</div>
                        <div class="pending-msg">Waiting for instructor approval…</div>
                    </div>
                </div>
            `).join('');
    }

    // ── Activities placeholder ──
    const activitiesHtml = inClassroom ? `
            <div class="divider"></div>
            <div class="section-label">ACTIVITIES</div>
            <div class="empty-sm">
                <div class="empty-sm-icon">📋</div>
                <div class="empty-sm-text">Coming soon — your instructor will post assignments and activities here.</div>
            </div>
        ` : '';

    // ── Diagnostics section (only when in a classroom) ──
    let diagnosticsHtml = '';
    if (inClassroom) {
      if (count > 0) {
        diagnosticsHtml = `
                    <div class="divider"></div>
                    <div class="top-card warn">
                        <div class="score-row">
                            <div class="score-badge warn">${count}</div>
                            <div>
                                <div class="score-label">${count} issue${count > 1 ? 's' : ''} detected</div>
                                <div class="score-sub">Click an issue to take a targeted quiz</div>
                            </div>
                        </div>
                    </div>
                    <div class="section-label">ISSUES IN THIS FILE</div>
                    ${issueRows}
                    <div class="section-label">TARGETED QUIZZES</div>
                    <div class="actions">${quizButtons}</div>
                `;
      } else {
        diagnosticsHtml = `
                    <div class="divider"></div>
                    <div class="top-card ok">
                        <div class="score-row">
                            <div class="score-badge ok">✓</div>
                            <div>
                                <div class="score-label">All clear!</div>
                                <div class="score-sub">No patterns detected in this file</div>
                            </div>
                        </div>
                    </div>
                `;
      }
    }

    // ── Tools section (only when in a classroom) ──
    const toolsHtml = inClassroom ? `
            <div class="divider"></div>
            <div class="actions">
                <button class="btn btn-ghost" onclick="post('showReplay')">📼 Debugging Replay</button>
                <button class="btn btn-ghost" onclick="post('showDNA')">🧬 Debugging DNA</button>
                <button class="btn btn-ghost" onclick="post('showProblems')">⚠ View All Problems</button>
                <button class="btn btn-ghost" onclick="post('register')">👤 ${this._studentId}</button>
            </div>
        ` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
    font-size: 12px; color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    padding: 0; user-select: none;
  }

  /* ── Join Classroom section ── */
  .join-section {
    padding: 14px;
    border-bottom: 1px solid var(--vscode-sideBar-border, #ffffff0a);
  }
  .join-title {
    font-size: 13px; font-weight: 700;
    color: var(--vscode-foreground);
    margin-bottom: 4px;
  }
  .join-sub {
    font-size: 10px; color: var(--vscode-descriptionForeground);
    margin-bottom: 10px; line-height: 1.4;
  }
  .join-row {
    display: flex; gap: 6px;
  }
  .join-input {
    flex: 1; background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, #ffffff15);
    border-radius: 6px; padding: 7px 10px;
    color: var(--vscode-input-foreground);
    font-size: 11px; font-family: monospace;
    outline: none;
  }
  .join-input:focus { border-color: #f97316; }
  .join-input::placeholder { color: var(--vscode-input-placeholderForeground); }
  .join-btn {
    background: #f97316; color: #000; border: none;
    border-radius: 6px; padding: 7px 12px;
    font-size: 10px; font-weight: 700; cursor: pointer;
    white-space: nowrap;
  }
  .join-btn:hover { background: #fb923c; }

  /* ── Classroom switcher ── */
  .cr-list { padding: 4px 14px 8px; }
  .cr-item {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 8px; border-radius: 6px;
    cursor: pointer; transition: background 0.1s;
    margin-bottom: 2px;
  }
  .cr-item:hover { background: var(--vscode-list-hoverBackground); }
  .cr-item.active { background: #f9731612; }
  .cr-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #444; flex-shrink: 0;
  }
  .cr-dot.on { background: #22c55e; }
  .cr-id {
    font-size: 11px; font-weight: 600; font-family: monospace;
    color: var(--vscode-foreground); flex: 1;
  }
  .cr-leave {
    background: none; border: none; color: #444;
    font-size: 10px; cursor: pointer; padding: 2px 4px;
    border-radius: 3px;
  }
  .cr-leave:hover { color: #ef4444; background: #ef444415; }

  /* ── Pending card ── */
  .pending-card {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px;
    background: #f9731608;
    border-bottom: 1px solid var(--vscode-sideBar-border, #ffffff0a);
  }
  .pending-icon { font-size: 16px; flex-shrink: 0; }
  .pending-id { font-size: 11px; font-weight: 700; font-family: monospace; color: #f97316; }
  .pending-msg { font-size: 10px; color: var(--vscode-descriptionForeground); }

  /* ── Section label ── */
  .section-label {
    padding: 10px 14px 6px;
    font-size: 10px; font-weight: 700;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase; letter-spacing: 0.08em;
  }

  /* ── Score card ── */
  .top-card { padding: 14px; }
  .top-card.warn { background: #f9731612; border-bottom: 1px solid #f9731625; }
  .top-card.ok   { background: #22c55e10; border-bottom: 1px solid #22c55e20; }
  .score-row { display: flex; align-items: center; gap: 10px; }
  .score-badge {
    width: 38px; height: 38px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 900; color: #000; flex-shrink: 0;
  }
  .score-badge.warn { background: #f97316; }
  .score-badge.ok   { background: #22c55e; }
  .score-label { font-size: 12px; font-weight: 700; color: var(--vscode-foreground); }
  .score-sub { font-size: 10px; color: var(--vscode-descriptionForeground); margin-top: 2px; }

  /* ── Issue rows ── */
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
  .btn-orange { background: #f97316; color: #000; border-color: #f97316; }
  .btn-ghost {
    background: transparent;
    color: var(--vscode-foreground);
    border-color: var(--vscode-sideBar-border, #ffffff15);
  }
  .divider { height: 1px; background: var(--vscode-sideBar-border, #ffffff0a); margin: 4px 0; }

  /* ── Empty states ── */
  .empty { padding: 24px 14px; text-align: center; color: var(--vscode-descriptionForeground); }
  .empty-icon { font-size: 32px; margin-bottom: 8px; }
  .empty-title { font-size: 12px; font-weight: 600; color: var(--vscode-foreground); margin-bottom: 4px; }
  .empty-sub { font-size: 11px; line-height: 1.5; }

  .empty-sm { padding: 12px 14px; text-align: center; }
  .empty-sm-icon { font-size: 20px; margin-bottom: 4px; }
  .empty-sm-text { font-size: 10px; color: var(--vscode-descriptionForeground); line-height: 1.5; }

  /* ── No-classroom hero ── */
  .hero {
    padding: 32px 14px; text-align: center;
    color: var(--vscode-descriptionForeground);
  }
  .hero-icon { font-size: 36px; margin-bottom: 8px; }
  .hero-title { font-size: 13px; font-weight: 700; color: var(--vscode-foreground); margin-bottom: 4px; }
  .hero-sub { font-size: 11px; line-height: 1.5; }
</style>
</head>
<body>

  <!-- Join Classroom input -->
  <div class="join-section">
    <div class="join-title">Join a Classroom</div>
    <div class="join-sub">Enter the classroom ID from your instructor</div>
    <div class="join-row">
      <input class="join-input" id="classInput" placeholder="e.g. PYBOOT-2026-XK3F"
             onkeydown="if(event.key==='Enter'){document.getElementById('joinBtn').click()}" />
      <button class="join-btn" id="joinBtn" onclick="doJoin()">Join</button>
    </div>
  </div>

  <!-- Pending requests -->
  ${pendingHtml}

  <!-- Classroom switcher -->
  ${classroomSwitcherHtml}

  ${inClassroom ? `
    <!-- Activities placeholder -->
    ${activitiesHtml}

    <!-- Diagnostics -->
    ${diagnosticsHtml}

    <!-- Tools -->
    ${toolsHtml}
  ` : `
    <!-- No classroom hero -->
    <div class="hero">
      <div class="hero-icon">🏫</div>
      <div class="hero-title">Join a classroom to get started</div>
      <div class="hero-sub">Enter your instructor's classroom ID above.<br>
      Once approved, Synapse will start tracking your debugging sessions.</div>
    </div>
  `}

<script>
  const vscode = acquireVsCodeApi();
  function post(command, extra) {
    vscode.postMessage({ command, errorType: extra, classroomId: extra });
  }
  function doJoin() {
    const input = document.getElementById('classInput');
    const id = input.value.trim();
    if (!id) { input.focus(); return; }
    vscode.postMessage({ command: 'joinClassroom', classroomId: id });
    input.value = '';
  }
</script>
</body>
</html>`;
  }
}
