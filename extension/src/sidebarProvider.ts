import * as vscode from 'vscode';
import { SynapseApi, HWQuestion } from './api';

// ── Data types ──────────────────────────────────────────────────────────────
export interface ClassroomEntry {
  id: string;
  status: 'pending' | 'active';
  joinedAt: string;
}

/**
 * SynapseViewProvider — Grammarly-style sidebar panel.
 * Includes: Classroom join/switch, Activities, Homework,
 * and the existing diagnostics panel (gated on classroom membership).
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
    private readonly _context: vscode.ExtensionContext,
    private readonly _api: SynapseApi
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

  private async joinClassroom(classroomId: string) {
    const classrooms = this.getClassrooms();

    // Don't add duplicates
    if (classrooms.find(c => c.id === classroomId)) {
      this._render();
      return;
    }

    // Validate the classroom code against the backend
    const isValid = await this._validateClassroom(classroomId);
    if (!isValid) {
      // Show error in the sidebar
      if (this._view) {
        this._view.webview.postMessage({ command: 'joinError', message: `Classroom "${classroomId}" not found. Check the code and try again.` });
      }
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

        // Load homework now that we're in a classroom
        this._loadHomework();
      }
    }, 2000);
  }

  /** Validates a classroom code exists on the backend (or matches known demo codes) */
  private async _validateClassroom(classroomId: string): Promise<boolean> {
    // Allow well-known demo codes without a backend
    const DEMO_CODES = ['PYTHON-2026-GCOU', 'PYTHON-2026-SWNR', 'DEMO', 'PYBOOT-2026-XK3F'];
    if (DEMO_CODES.includes(classroomId)) { return true; }

    // Try backend validation
    try {
      const base = this._api.getBase();
      if (!base) { return false; }
      const response = await fetch(`${base}/classrooms/${encodeURIComponent(classroomId)}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private switchClassroom(classroomId: string) {
    this.setActiveClassroomId(classroomId);
    this._render();
    this._onClassroomChanged.fire();
    this._loadHomework();
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
    if (this.isInClassroom()) {
      this._loadHomework();
    }

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
      line: d.range.start.line + 1
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
    this._render();
  }

  private async _loadHomework() {
    const classroomId = this.getActiveClassroomId();
    this._hwQuestions = await this._api.getHomework(classroomId);
    this._hwLoaded = true;
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

    const issueRows = this._issues.map((issue, idx) => `
            <div class="issue-row animate-fade delay-${Math.min(idx + 1, 5)}" onclick="post('takeQuiz', '${issue.type}')">
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

    // ── Activities / Homework section ──
    let activitiesHtml = '';
    if (inClassroom) {
      if (this._hwLoaded && this._hwQuestions.length > 0) {
        const hwButtons = this._hwQuestions
          .filter(q => q.status === 'open')
          .map(q => {
            const safePayload = Buffer.from(JSON.stringify(q)).toString('base64');
            return `
            <button class="btn btn-ghost" style="text-align:left;white-space:normal;line-height:1.35"
              onclick="postHw('${safePayload}')"
              title="${q.dueDate ? 'Due: ' + q.dueDate : 'No deadline'}">
              ✏️ ${q.title}
            </button>`;
          }).join('');
        activitiesHtml = `
            <div class="divider"></div>
            <div class="section-label">📋 HOMEWORK</div>
            <div class="actions">${hwButtons}</div>`;
      } else if (!this._hwLoaded) {
        activitiesHtml = `
            <div class="divider"></div>
            <div style="padding:8px 16px;font-size:10px;color:var(--text-secondary)">Loading homework…</div>`;
      } else {
        activitiesHtml = `
            <div class="divider"></div>
            <div class="section-label">ACTIVITIES</div>
            <div class="empty-sm">
                <div class="empty-sm-icon">📋</div>
                <div class="empty-sm-text">Coming soon — your instructor will post assignments and activities here.</div>
            </div>`;
      }
    }

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
            <div class="section-label">TOOLS</div>
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
  :root {
    --bg: #0D0D0D;
    --surface: #1A1A1A;
    --surface-light: #141414;
    --border: #2A2A2A;
    --border-light: #333;
    --text: #F5F5F5;
    --text-secondary: #888;
    --text-muted: #555;
    --accent: #E8FF47;
    --accent-hover: #D4EB3A;
    --accent-glow: rgba(232, 255, 71, 0.15);
    --orange: #FF6B35;
    --orange-glow: rgba(255, 107, 53, 0.15);
    --danger: #EF4444;
    --success: #4ADE80;
    --font-sans: 'DM Sans', system-ui, -apple-system, sans-serif;
    --font-display: 'Bebas Neue', Impact, sans-serif;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--font-sans);
    font-size: 12px;
    color: var(--text);
    background-color: var(--bg);
    background-image:
      linear-gradient(rgba(232, 255, 71, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(232, 255, 71, 0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    padding: 0;
    user-select: none;
    -webkit-font-smoothing: antialiased;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 0; }
  ::-webkit-scrollbar-thumb:hover { background: var(--accent); }

  /* ── Animations ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 107, 53, 0.3); }
    50% { box-shadow: 0 0 16px 3px rgba(255, 107, 53, 0.15); }
  }
  @keyframes dotPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.3); }
  }

  .animate-fade { animation: fadeUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards; opacity: 0; }
  .animate-slide { animation: slideUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards; opacity: 0; }
  .delay-1 { animation-delay: 0.05s; }
  .delay-2 { animation-delay: 0.1s; }
  .delay-3 { animation-delay: 0.15s; }
  .delay-4 { animation-delay: 0.2s; }
  .delay-5 { animation-delay: 0.25s; }

  /* ── Logo ── */
  .logo-row {
    display: flex; align-items: center; gap: 8px;
    padding: 14px 16px 6px;
  }
  .logo-dot { width: 6px; height: 6px; background: var(--accent); }
  .logo-text {
    font-family: var(--font-display);
    font-size: 18px; letter-spacing: 3px; color: var(--text);
  }

  /* ── Join Classroom section ── */
  .join-section {
    padding: 12px 16px 14px;
    border-bottom: 1px solid var(--border);
  }
  .join-title {
    font-size: 9px; font-weight: 500;
    letter-spacing: 3px; text-transform: uppercase;
    color: var(--text-muted); margin-bottom: 8px;
  }
  .join-row { display: flex; gap: 6px; }
  .join-input {
    flex: 1; background: var(--surface);
    border: 1px solid var(--border);
    padding: 8px 10px; color: var(--text);
    font-size: 11px; font-family: monospace;
    outline: none; transition: border-color 0.15s;
  }
  .join-input:focus { border-color: var(--accent); }
  .join-input::placeholder { color: var(--text-muted); }
  .join-error {
    margin-top: 8px; padding: 6px 10px;
    font-size: 10px; color: #EF4444;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    animation: fadeUp 0.25s ease forwards;
  }
  .join-btn {
    background: var(--accent); color: #000; border: none;
    padding: 8px 14px; font-size: 10px; font-weight: 700;
    cursor: pointer; white-space: nowrap;
    letter-spacing: 1px; text-transform: uppercase;
    transition: background 0.15s;
  }
  .join-btn:hover { background: var(--accent-hover); }

  /* ── Section label ── */
  .section-label {
    padding: 12px 16px 6px;
    font-size: 9px; font-weight: 500;
    color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 3px;
  }

  /* ── Classroom switcher ── */
  .cr-list { padding: 4px 16px 8px; }
  .cr-item {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 10px;
    cursor: pointer; transition: all 0.15s;
    margin-bottom: 2px; border-left: 2px solid transparent;
  }
  .cr-item:hover { background: rgba(232, 255, 71, 0.03); border-left-color: var(--border-light); }
  .cr-item.active { background: var(--accent-glow); border-left-color: var(--accent); }
  .cr-dot { width: 6px; height: 6px; flex-shrink: 0; background: var(--text-muted); }
  .cr-dot.on { background: var(--success); animation: dotPulse 2s ease-in-out infinite; }
  .cr-id { font-size: 11px; font-weight: 600; font-family: monospace; color: var(--text); flex: 1; }
  .cr-leave {
    background: none; border: none; color: var(--text-muted);
    font-size: 10px; cursor: pointer; padding: 2px 4px;
    transition: color 0.15s;
  }
  .cr-leave:hover { color: var(--danger); }

  /* ── Pending card ── */
  .pending-card {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 16px; background: var(--orange-glow);
    border-bottom: 1px solid var(--border);
    animation: fadeUp 0.3s ease forwards;
  }
  .pending-icon { font-size: 14px; flex-shrink: 0; }
  .pending-id { font-size: 11px; font-weight: 700; font-family: monospace; color: var(--orange); }
  .pending-msg { font-size: 10px; color: var(--text-secondary); }

  /* ── Score card ── */
  .top-card { padding: 14px 16px; animation: slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .top-card.warn {
    background: var(--orange-glow);
    border-bottom: 1px solid rgba(255, 107, 53, 0.15);
    border-top: 2px solid var(--orange);
  }
  .top-card.ok {
    background: rgba(74, 222, 128, 0.06);
    border-bottom: 1px solid rgba(74, 222, 128, 0.1);
    border-top: 2px solid var(--success);
  }
  .score-row { display: flex; align-items: center; gap: 12px; }
  .score-badge {
    width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 900; color: #000; flex-shrink: 0;
  }
  .score-badge.warn { background: var(--orange); animation: pulseGlow 3s ease-in-out infinite; }
  .score-badge.ok { background: var(--success); }
  .score-label { font-size: 12px; font-weight: 600; color: var(--text); }
  .score-sub { font-size: 10px; color: var(--text-secondary); margin-top: 2px; }

  /* ── Issue rows ── */
  .issue-row {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 10px 16px; cursor: pointer; gap: 8px;
    border-bottom: 1px solid var(--border);
    transition: all 0.15s; border-left: 2px solid transparent;
  }
  .issue-row:hover { background: rgba(232, 255, 71, 0.03); border-left-color: var(--accent); }
  .issue-left { display: flex; align-items: flex-start; gap: 8px; flex: 1; min-width: 0; }
  .issue-dot { width: 6px; height: 6px; flex-shrink: 0; margin-top: 4px; }
  .issue-dot.none_handling { background: var(--orange); }
  .issue-dot.try_except    { background: var(--danger); }
  .issue-dot.async_await   { background: #38bdf8; }
  .issue-dot.list_ops      { background: var(--success); }
  .issue-dot.unknown       { background: var(--text-secondary); }
  .issue-type { font-size: 11px; font-weight: 600; color: var(--text); text-transform: uppercase; letter-spacing: 0.5px; }
  .issue-msg { font-size: 10px; color: var(--text-secondary); line-height: 1.4; margin-top: 2px; }
  .issue-line { font-size: 9px; color: var(--text-muted); flex-shrink: 0; padding-top: 2px; font-family: monospace; letter-spacing: 1px; }

  /* ── Buttons ── */
  .actions { padding: 10px 16px; display: flex; flex-direction: column; gap: 6px; }
  .btn {
    width: 100%; padding: 8px 12px;
    border: 1px solid transparent; cursor: pointer;
    font-family: var(--font-sans);
    font-size: 11px; font-weight: 600; text-align: left;
    transition: all 0.15s; position: relative; overflow: hidden;
  }
  .btn::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
    background-size: 200% 100%;
    opacity: 0; transition: opacity 0.3s;
  }
  .btn:hover::after { opacity: 1; animation: shimmer 1.5s ease-in-out; }
  .btn-orange { background: var(--orange); color: #000; border-color: var(--orange); letter-spacing: 0.5px; text-transform: uppercase; font-size: 10px; }
  .btn-orange:hover { background: #e85d2a; }
  .btn-ghost { background: var(--surface); color: var(--text-secondary); border-color: var(--border); }
  .btn-ghost:hover { color: var(--text); border-color: var(--accent); background: var(--accent-glow); }

  .divider { height: 1px; background: var(--border); margin: 4px 0; }

  /* ── Empty states ── */
  .empty { padding: 24px 16px; text-align: center; color: var(--text-secondary); }
  .empty-icon { font-size: 28px; margin-bottom: 8px; }
  .empty-title { font-size: 12px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .empty-sub { font-size: 11px; line-height: 1.5; }
  .empty-sm { padding: 12px 16px; text-align: center; }
  .empty-sm-icon { font-size: 18px; margin-bottom: 4px; }
  .empty-sm-text { font-size: 10px; color: var(--text-secondary); line-height: 1.5; }

  /* ── No-classroom hero ── */
  .hero { padding: 36px 16px; text-align: center; color: var(--text-secondary); animation: slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .hero-icon { font-size: 32px; margin-bottom: 10px; }
  .hero-title { font-size: 16px; letter-spacing: 2px; font-weight: 700; color: var(--text); margin-bottom: 8px; text-transform: uppercase; }
  .hero-sub { font-size: 11px; line-height: 1.6; color: var(--text-secondary); }
</style>
</head>
<body>

  <!-- Logo -->
  <div class="logo-row animate-fade">
    <div class="logo-dot"></div>
    <div class="logo-text">SYNAPSE</div>
  </div>

  <!-- Join Classroom input -->
  <div class="join-section animate-fade delay-1">
    <div class="join-title">Join a Classroom</div>
    <div class="join-row">
      <input class="join-input" id="classInput" placeholder="e.g. PYBOOT-2026-XK3F"
             onkeydown="if(event.key==='Enter'){document.getElementById('joinBtn').click()}" />
      <button class="join-btn" id="joinBtn" onclick="doJoin()">Join</button>
    </div>
    <div class="join-error" id="joinError" style="display:none"></div>
  </div>

  <!-- Pending requests -->
  ${pendingHtml}

  <!-- Classroom switcher -->
  ${classroomSwitcherHtml}

  ${inClassroom ? `
    <!-- Activities / Homework -->
    ${activitiesHtml}

    <!-- Diagnostics -->
    ${diagnosticsHtml}

    <!-- Tools -->
    ${toolsHtml}
  ` : `
    <!-- No classroom hero -->
    <div class="hero">
      <div class="hero-icon">🏫</div>
      <div class="hero-title">Join a Classroom</div>
      <div class="hero-sub">Enter your instructor's classroom ID above.<br>
      Once approved, Synapse will start tracking your debugging sessions.</div>
    </div>
  `}

<script>
  const vscode = acquireVsCodeApi();
  function post(command, extra) {
    vscode.postMessage({ command, errorType: extra, classroomId: extra });
  }
  function postHw(b64Str) {
    const jsonStr = atob(b64Str);
    vscode.postMessage({ command: 'openHomework', question: JSON.parse(jsonStr) });
  }
  function doJoin() {
    const input = document.getElementById('classInput');
    const id = input.value.trim();
    if (!id) { input.focus(); return; }
    // Hide previous error
    document.getElementById('joinError').style.display = 'none';
    vscode.postMessage({ command: 'joinClassroom', classroomId: id });
    input.value = '';
  }

  // Listen for error messages from the extension host
  window.addEventListener('message', event => {
    const msg = event.data;
    if (msg.command === 'joinError') {
      const el = document.getElementById('joinError');
      el.textContent = msg.message;
      el.style.display = 'block';
      setTimeout(() => { el.style.display = 'none'; }, 4000);
    }
  });
</script>
</body>
</html>`;
  }
}
