import * as vscode from 'vscode';
import { SynapseApi } from './api';
import { DebugSession } from './sessionRecorder';

export class ReplayPanel {
  public static currentPanel: ReplayPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  static createOrShow(
    extensionUri: vscode.Uri,
    studentId: string,
    api: SynapseApi,
    view: 'replay' | 'dna' = 'replay'
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ReplayPanel.currentPanel) {
      ReplayPanel.currentPanel._panel.reveal(column);
      ReplayPanel.currentPanel.update(studentId, api, view);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'synapseReplay',
      'Synapse — Debugging Replay',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
      }
    );

    ReplayPanel.currentPanel = new ReplayPanel(panel, extensionUri);
    ReplayPanel.currentPanel.update(studentId, api, view);
  }

  private constructor(panel: vscode.WebviewPanel, private extensionUri: vscode.Uri) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  async update(studentId: string, api: SynapseApi, view: 'replay' | 'dna') {
    this._panel.webview.html = this.getLoadingHtml();
    const sessions = await api.getSessions(studentId);
    const dna = await api.getStudentDNA(studentId);

    this._panel.webview.html = view === 'dna'
      ? this.getDNAHtml(dna, sessions)
      : this.getReplayHtml(sessions, studentId);

    this._panel.webview.onDidReceiveMessage(msg => {
      if (msg.command === 'takeQuiz') {
        vscode.commands.executeCommand('synapse.showQuiz', msg.errorType);
      } else if (msg.command === 'switchView') {
        this.update(studentId, api, msg.view);
      }
    }, null, this._disposables);
  }

  // ─── Shared CSS ──────────────────────────────────────────────────────────
  private get css(): string {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background: #0a0a0a;
        color: #e5e5e5;
        font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
        font-size: 13px;
        line-height: 1.6;
      }

      /* ── Header ── */
      .header {
        background: #111;
        border-bottom: 1px solid #222;
        padding: 14px 16px 0;
      }
      .logo-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
      .logo-icon {
        width: 28px; height: 28px; border-radius: 7px;
        background: #f97316;
        display: flex; align-items: center; justify-content: center;
        font-size: 15px; font-weight: 900; color: #000;
      }
      .logo-text { font-size: 16px; font-weight: 800; color: #fff; letter-spacing: -0.3px; }
      .logo-text span { color: #f97316; }

      /* ── Tabs ── */
      .tabs { display: flex; gap: 2px; }
      .tab {
        padding: 8px 14px; border-radius: 6px 6px 0 0;
        cursor: pointer; font-size: 12px; font-weight: 600;
        border: none; background: transparent; color: #555;
        transition: all 0.15s;
      }
      .tab.active { background: #1a1a1a; color: #f97316; border-bottom: 2px solid #f97316; }
      .tab:hover:not(.active) { color: #aaa; background: #161616; }

      /* ── Stats ── */
      .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 14px; }
      .stat-card {
        background: #111; border: 1px solid #1f1f1f;
        border-radius: 10px; padding: 14px 10px; text-align: center;
        transition: border-color 0.2s;
      }
      .stat-card:hover { border-color: #f9731630; }
      .stat-value { font-size: 22px; font-weight: 800; color: #f97316; }
      .stat-label { font-size: 10px; color: #555; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.06em; }

      /* ── Section titles ── */
      .section-title {
        padding: 10px 14px 6px;
        font-size: 10px; font-weight: 700;
        color: #444; text-transform: uppercase; letter-spacing: 0.1em;
      }

      /* ── Session cards ── */
      .session-card {
        margin: 0 14px 10px;
        background: #111; border: 1px solid #1f1f1f;
        border-radius: 10px; overflow: hidden;
        transition: border-color 0.2s;
      }
      .session-card:hover { border-color: #2a2a2a; }
      .session-header {
        padding: 12px 14px; display: flex; align-items: center;
        justify-content: space-between; cursor: pointer;
      }
      .error-badge {
        padding: 3px 9px; border-radius: 20px;
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .error-badge.none_handling { background: #f9731615; color: #f97316; border: 1px solid #f9731625; }
      .error-badge.try_except    { background: #ef444415; color: #f87171; border: 1px solid #ef444425; }
      .error-badge.async_await   { background: #38bdf815; color: #38bdf8; border: 1px solid #38bdf825; }
      .error-badge.list_ops      { background: #22c55e15; color: #4ade80; border: 1px solid #22c55e25; }
      .session-meta { color: #444; font-size: 11px; margin-top: 4px; }

      .tag {
        padding: 2px 8px; border-radius: 20px;
        font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
      }
      .tag-resolved { background: #22c55e15; color: #4ade80; border: 1px solid #22c55e25; }
      .tag-active { background: #f9731615; color: #f97316; border: 1px solid #f9731625; animation: blink 2s ease-in-out infinite; }
      @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }

      /* ── Timeline ── */
      .timeline { padding: 0 14px 14px; border-top: 1px solid #1a1a1a; }
      .timeline-label { padding: 10px 0 8px; font-size: 10px; color: #444; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
      .attempt { display: flex; gap: 10px; margin-bottom: 8px; }
      .attempt-dot {
        width: 26px; height: 26px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; flex-shrink: 0; margin-top: 2px;
      }
      .attempt-dot.failed  { background: #ef444415; }
      .attempt-dot.success { background: #22c55e15; }
      .attempt-meta { font-size: 11px; color: #444; }
      .attempt-code {
        background: #0d0d0d; border: 1px solid #1a1a1a;
        border-radius: 6px; padding: 7px 10px;
        font-family: 'Cascadia Code', 'Fira Code', monospace;
        font-size: 11px; color: #666;
        margin-top: 5px; white-space: pre-wrap;
        word-break: break-all; max-height: 55px; overflow: hidden;
      }

      /* ── Quiz CTA ── */
      .quiz-cta {
        margin: 0 14px 14px;
        background: #111; border: 1px solid #f9731625;
        border-radius: 10px; padding: 14px;
        display: flex; align-items: center; gap: 12px;
      }
      .quiz-icon { font-size: 26px; }
      .quiz-title { font-weight: 700; color: #f97316; font-size: 13px; margin-bottom: 2px; }
      .quiz-sub { font-size: 11px; color: #555; }

      /* ── Buttons ── */
      .btn {
        background: #f97316; color: #000;
        border: none; padding: 8px 16px; border-radius: 7px;
        cursor: pointer; font-weight: 700; font-size: 12px;
        transition: background 0.15s, transform 0.1s;
        white-space: nowrap;
      }
      .btn:hover { background: #fb923c; transform: translateY(-1px); }
      .btn:active { transform: translateY(0); }
      .btn-outline {
        background: transparent; color: #f97316;
        border: 1px solid #f9731640; padding: 8px 16px;
        border-radius: 7px; cursor: pointer;
        font-weight: 600; font-size: 12px;
        transition: all 0.15s;
      }
      .btn-outline:hover { background: #f9731610; }
      .btn-full { width: 100%; margin-top: 10px; }

      /* ── Empty state ── */
      .empty-state { text-align: center; padding: 50px 24px; color: #333; }
      .empty-icon { font-size: 44px; margin-bottom: 14px; }
      .empty-state h3 { color: #555; font-size: 14px; margin-bottom: 6px; }
      .empty-state p { font-size: 12px; line-height: 1.6; }

      /* ── DNA specific ── */
      .dna-card {
        margin: 14px; background: #111;
        border: 1px solid #f9731625; border-radius: 12px; padding: 20px;
        text-align: center;
      }
      .dna-emoji { font-size: 44px; margin-bottom: 10px; }
      .dna-label { font-size: 18px; font-weight: 800; color: #fff; text-transform: capitalize; margin-bottom: 4px; }
      .dna-label span { color: #f97316; }
      .dna-sub { font-size: 11px; color: #444; }
      .insight-row { display: flex; gap: 10px; margin: 0 14px 14px; }
      .insight {
        flex: 1; background: #111; border: 1px solid #1f1f1f;
        border-radius: 10px; padding: 12px 8px; text-align: center;
      }
      .insight-val { font-size: 18px; font-weight: 800; color: #f97316; }
      .insight-val.good { color: #4ade80; }
      .insight-val.warn { color: #fbbf24; }
      .insight-lbl { font-size: 10px; color: #444; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 3px; }
      .rec-box {
        margin: 0 14px 14px; background: #111;
        border: 1px solid #1f1f1f; border-radius: 10px; padding: 14px;
      }
      .rec-title { font-weight: 700; color: #f97316; font-size: 12px; margin-bottom: 6px; }
      .rec-body { font-size: 12px; color: #666; line-height: 1.7; }
      .rec-body strong { color: #aaa; }
    `;
  }

  private getLoadingHtml(): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body { background:#0a0a0a; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; font-family:'Segoe UI',sans-serif; }
      .pulse { width:48px; height:48px; border-radius:10px; background:#f97316; animation:p 1.2s ease-in-out infinite; }
      @keyframes p { 0%,100%{opacity:0.3;transform:scale(0.85)} 50%{opacity:1;transform:scale(1)} }
      p { color:#444; font-size:12px; margin-top:14px; text-align:center; }
    </style></head>
    <body><div style="text-align:center"><div class="pulse"></div><p>Loading sessions...</p></div></body></html>`;
  }

  private getReplayHtml(sessions: DebugSession[], studentId: string): string {
    const totalAttempts = sessions.reduce((sum, s) => sum + s.attempts.length, 0);
    const resolved = sessions.filter(s => s.resolved);
    const avgMin = resolved.length > 0
      ? Math.round(resolved.reduce((sum, s) => sum + s.totalDurationSeconds, 0) / resolved.length / 60)
      : 0;

    const sessionsHtml = sessions.length === 0
      ? `<div class="empty-state">
          <div class="empty-icon">📂</div>
          <h3>No sessions yet</h3>
          <p>Open a Python file and start coding — Synapse tracks your debugging sessions automatically as you type and save.</p>
        </div>`
      : sessions.slice(-10).reverse().map(s => this.sessionCard(s)).join('');

    return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Synapse Replay</title><style>${this.css}</style></head>
<body>
  <div class="header">
    <div class="logo-row">
      <div class="logo-icon">S</div>
      <div class="logo-text">Syn<span>apse</span></div>
    </div>
    <div class="tabs">
      <button class="tab active" onclick="vscode.postMessage({command:'switchView',view:'replay'})">Debugging Replay</button>
      <button class="tab" onclick="vscode.postMessage({command:'switchView',view:'dna'})">Debugging DNA</button>
    </div>
  </div>

  <div class="stats-row">
    <div class="stat-card"><div class="stat-value">${sessions.length}</div><div class="stat-label">Sessions</div></div>
    <div class="stat-card"><div class="stat-value">${totalAttempts}</div><div class="stat-label">Attempts</div></div>
    <div class="stat-card"><div class="stat-value">${avgMin}m</div><div class="stat-label">Avg Fix</div></div>
  </div>

  ${sessions.length > 0 ? `
  <div class="quiz-cta">
    <div class="quiz-icon">🎓</div>
    <div style="flex:1">
      <div class="quiz-title">Strengthen your weak spots</div>
      <div class="quiz-sub">Targeted quiz based on your error patterns</div>
    </div>
    <button class="btn" onclick="vscode.postMessage({command:'takeQuiz',errorType:'none_handling'})">Quiz</button>
  </div>` : ''}

  <div class="section-title">Recent Sessions</div>
  ${sessionsHtml}

  <script>const vscode = acquireVsCodeApi();</script>
</body></html>`;
  }

  private sessionCard(session: DebugSession): string {
    const resolved = session.resolved;
    const dMin = Math.round(session.totalDurationSeconds / 60);
    const dateStr = new Date(session.startTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    const attemptsHtml = session.attempts.slice(-3).map(a => {
      const dotClass = a.resolved ? 'success' : 'failed';
      const emoji = a.resolved ? '✅' : '❌';
      const t = new Date(a.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const code = (a.codeSnapshot || '(no snapshot)').substring(0, 100).replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<div class="attempt">
        <div class="attempt-dot ${dotClass}">${emoji}</div>
        <div>
          <div class="attempt-meta">Attempt ${a.attemptNumber} · ${t} · ${a.durationSeconds}s</div>
          <div class="attempt-code">${code}</div>
        </div>
      </div>`;
    }).join('');

    return `<div class="session-card">
      <div class="session-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        <div>
          <span class="error-badge ${session.errorType}">${session.errorType.replace(/_/g, ' ')}</span>
          <div class="session-meta">${dateStr} · ${session.attempts.length} attempt${session.attempts.length !== 1 ? 's' : ''} · ${dMin}m</div>
        </div>
        <span class="tag ${resolved ? 'tag-resolved' : 'tag-active'}">${resolved ? '✓ FIXED' : '● ACTIVE'}</span>
      </div>
      <div class="timeline" style="display:none">
        <div class="timeline-label">Attempt Timeline</div>
        ${attemptsHtml || '<div style="color:#333;font-size:11px;padding:8px 0">No attempts recorded yet</div>'}
        <button class="btn btn-full" onclick="vscode.postMessage({command:'takeQuiz',errorType:'${session.errorType}'})">
          🎓 Take "${session.errorType.replace(/_/g, ' ')}" Quiz
        </button>
      </div>
    </div>`;
  }

  private getDNAHtml(dna: any, sessions: DebugSession[]): string {
    const style = dna?.debuggingStyle || 'trial-and-error';
    const avgMin = dna?.avgFixMinutes || 18;
    const classAvg = dna?.classAvgMinutes || 12;
    const totalSessions = dna?.totalSessions || sessions.length;
    const streak = dna?.streakDays || 0;
    const pctDiff = Math.round(((avgMin - classAvg) / classAvg) * 100);
    const fasterSlower = pctDiff > 0 ? `${pctDiff}% slower` : `${Math.abs(pctDiff)}% faster`;
    const emojiMap: Record<string, string> = { 'trial-and-error': '🎲', 'systematic': '📐', 'visual': '👁️' };
    const styleEmoji = emojiMap[style as string] || '🧪';

    const insight = style === 'trial-and-error'
      ? 'Switch to systematic debugging — read error → form a hypothesis → test one change → observe. Students who do this fix bugs <strong>3x faster</strong>.'
      : style === 'systematic'
        ? 'Excellent! Systematic debuggers are in the <strong>top 30%</strong> of the cohort. Keep forming hypotheses before each change.'
        : 'Visual debuggers excel at structural issues. Try adding <strong>strategic print()</strong> statements to trace data flow.';

    return `<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8"><title>Debugging DNA</title><style>${this.css}</style></head>
<body>
  <div class="header">
    <div class="logo-row">
      <div class="logo-icon">S</div>
      <div class="logo-text">Syn<span>apse</span></div>
    </div>
    <div class="tabs">
      <button class="tab" onclick="vscode.postMessage({command:'switchView',view:'replay'})">Debugging Replay</button>
      <button class="tab active">Debugging DNA</button>
    </div>
  </div>

  <div class="dna-card">
    <div class="dna-emoji">${styleEmoji}</div>
    <div class="dna-label"><span>${style.replace(/-/g, ' ')}</span> Debugger</div>
    <div class="dna-sub">Based on ${totalSessions} sessions tracked by Synapse</div>
  </div>

  <div class="insight-row">
    <div class="insight">
      <div class="insight-val ${pctDiff > 10 ? 'warn' : 'good'}">${avgMin}m</div>
      <div class="insight-lbl">Your avg fix</div>
    </div>
    <div class="insight">
      <div class="insight-val">${classAvg}m</div>
      <div class="insight-lbl">Class avg</div>
    </div>
    <div class="insight">
      <div class="insight-val ${streak > 3 ? 'good' : ''}">${streak} 🔥</div>
      <div class="insight-lbl">Day streak</div>
    </div>
  </div>

  <div class="rec-box">
    <div class="rec-title">Synapse Insight</div>
    <div class="rec-body">
      You debug <strong>${fasterSlower}</strong> than your cohort average. ${insight}
    </div>
  </div>

  <div style="margin:0 14px 20px">
    <button class="btn btn-full" onclick="vscode.postMessage({command:'takeQuiz',errorType:'none_handling'})">
      Take Adaptive Quiz — Recommended for You
    </button>
  </div>

  <script>const vscode = acquireVsCodeApi();</script>
</body></html>`;
  }

  dispose() {
    ReplayPanel.currentPanel = undefined;
    this._panel.dispose();
    this._disposables.forEach(d => d.dispose());
  }
}
