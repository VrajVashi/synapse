import * as vscode from 'vscode';
import { SynapseApi, QuizQuestion } from './api';

export class QuizPanel {
  public static currentPanel: QuizPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  static createOrShow(extensionUri: vscode.Uri, errorType: string) {
    const column = vscode.ViewColumn.Beside;

    if (QuizPanel.currentPanel) {
      QuizPanel.currentPanel._panel.reveal(column);
      QuizPanel.currentPanel.loadQuiz(errorType);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'synapseQuiz',
      'Synapse — Quiz',
      column,
      { enableScripts: true }
    );

    QuizPanel.currentPanel = new QuizPanel(panel, extensionUri);
    QuizPanel.currentPanel.loadQuiz(errorType);
  }

  private constructor(panel: vscode.WebviewPanel, private extensionUri: vscode.Uri) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  async loadQuiz(errorType: string) {
    // Guard: coerce to string in case the command arg is passed as an object
    const safeType = (typeof errorType === 'string' && errorType.length > 0)
      ? errorType
      : 'none_handling';
    const api = new SynapseApi();
    const questions = await api.getQuiz(safeType);
    this._panel.webview.html = this.getHtml(questions, safeType);

    this._panel.webview.onDidReceiveMessage(msg => {
      if (msg.command === 'quizComplete') {
        vscode.window.showInformationMessage(
          `Quiz done — ${msg.score}/${msg.total} correct! ${msg.score === msg.total ? 'Perfect! 🎯' : 'Keep practising.'}`
        );
        api.submitQuizResult(
          vscode.workspace.getConfiguration('synapse').get<string>('studentId') || 'anonymous',
          errorType, msg.score, msg.total
        );
      }
    }, null, this._disposables);
  }

  private getHtml(questions: QuizQuestion[], errorType: string): string {
    const label = errorType.replace(/_/g, ' ');
    const q = JSON.stringify(questions);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Synapse Quiz — ${label}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0D0D0D;
      background-image:
        linear-gradient(rgba(232, 255, 71, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(232, 255, 71, 0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      color: #F5F5F5;
      font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
      font-size: 13px; min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: #0D0D0D; }
    ::-webkit-scrollbar-thumb { background: #2A2A2A; }
    ::-webkit-scrollbar-thumb:hover { background: #E8FF47; }

    @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes popIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }

    /* Header */
    .header {
      background: #111111; border-bottom: 1px solid #1E1E1E;
      padding: 14px 16px;
      animation: fadeUp 0.3s ease forwards;
    }
    .logo-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .logo-dot { width: 6px; height: 6px; background: #E8FF47; }
    .logo-text {
      font-family: 'Bebas Neue', Impact, sans-serif;
      font-size: 20px; letter-spacing: 3px; color: #F5F5F5;
    }
    .quiz-subtitle { color: #555; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; font-weight: 500; }
    .quiz-subtitle strong { color: #FF6B35; text-transform: uppercase; }

    /* Progress */
    .progress-wrap { background: #1A1A1A; height: 2px; margin: 0; }
    .progress-bar { height: 100%; background: #E8FF47; transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1); }
    .progress-text {
      padding: 10px 16px 2px; color: #555;
      font-size: 9px; font-weight: 500; text-transform: uppercase; letter-spacing: 3px;
    }

    /* Question */
    .q-card {
      margin: 0 14px 14px; background: #1A1A1A;
      border: 1px solid #2A2A2A; border-top: 2px solid #E8FF47;
      padding: 20px;
      animation: slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    .q-num {
      font-size: 9px; color: #E8FF47; font-weight: 500;
      text-transform: uppercase; letter-spacing: 3px; margin-bottom: 12px;
    }
    .q-text { font-size: 15px; font-weight: 600; color: #F5F5F5; line-height: 1.55; margin-bottom: 20px; }

    /* Options */
    .options { display: flex; flex-direction: column; gap: 8px; }
    .opt {
      background: #0D0D0D; border: 1px solid #2A2A2A;
      padding: 12px 14px;
      cursor: pointer; display: flex; align-items: center; gap: 12px;
      font-size: 13px; color: #888; transition: all 0.15s;
      animation: fadeUp 0.3s ease forwards; opacity: 0;
    }
    .opt:nth-child(1) { animation-delay: 0.05s; }
    .opt:nth-child(2) { animation-delay: 0.1s; }
    .opt:nth-child(3) { animation-delay: 0.15s; }
    .opt:nth-child(4) { animation-delay: 0.2s; }
    .opt:hover:not(.disabled) { border-color: #E8FF47; color: #F5F5F5; background: rgba(232, 255, 71, 0.05); }
    .opt.correct { border-color: #4ADE80; background: rgba(74, 222, 128, 0.06); color: #4ADE80; }
    .opt.wrong   { border-color: #EF4444; background: rgba(239, 68, 68, 0.06); color: #f87171; }
    .opt.disabled { cursor: default; }
    .opt-letter {
      width: 24px; height: 24px;
      background: #1A1A1A; display: flex; align-items: center;
      justify-content: center; font-size: 10px; font-weight: 700;
      color: #555; flex-shrink: 0;
      font-family: 'Bebas Neue', Impact, sans-serif;
      letter-spacing: 1px;
    }
    .opt.correct .opt-letter { background: #4ADE80; color: #000; }
    .opt.wrong   .opt-letter { background: #EF4444; color: #fff; }

    /* Explanation */
    .explanation {
      display: none; margin-top: 16px;
      background: #0D0D0D; border: 1px solid #2A2A2A;
      border-left: 2px solid #E8FF47;
      padding: 14px 16px;
      font-size: 12px; color: #888; line-height: 1.7;
    }
    .explanation.show { display: block; animation: fadeUp 0.3s ease forwards; }
    .explanation strong { color: #E8FF47; }

    /* Next btn */
    .btn-next {
      display: none; margin-top: 16px; width: 100%;
      background: #FF6B35; color: #000;
      border: none; padding: 11px 20px;
      cursor: pointer; font-weight: 700; font-size: 10px;
      transition: all 0.15s;
      text-transform: uppercase; letter-spacing: 1px;
      font-family: 'DM Sans', system-ui, sans-serif;
      position: relative; overflow: hidden;
    }
    .btn-next::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      background-size: 200% 100%; opacity: 0; transition: opacity 0.3s;
    }
    .btn-next:hover { background: #e85d2a; }
    .btn-next:hover::after { opacity: 1; animation: shimmer 1.5s ease-in-out; }
    .btn-next.show { display: block; animation: fadeUp 0.25s ease forwards; }

    /* Result */
    .result { display: none; margin: 14px; }
    .result.show { display: block; animation: popIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
    .result-card {
      background: #1A1A1A; border: 1px solid #2A2A2A;
      border-top: 2px solid #FF6B35;
      padding: 28px 20px; text-align: center;
    }
    .result-score {
      font-family: 'Bebas Neue', Impact, sans-serif;
      font-size: 72px; color: #F5F5F5; line-height: 1;
    }
    .result-denom { font-family: 'Bebas Neue', Impact, sans-serif; font-size: 24px; color: #555; }
    .result-label { color: #888; font-size: 13px; margin: 10px 0 20px; }
    .result-msg {
      background: #0D0D0D; border: 1px solid #2A2A2A;
      padding: 14px;
      color: #888; font-size: 12px; line-height: 1.7;
      text-align: left; margin-bottom: 20px;
    }
    .result-msg strong { color: #E8FF47; }
    .btn-retry {
      background: #FF6B35; color: #000; border: none;
      padding: 11px 24px;
      cursor: pointer; font-weight: 700; margin-right: 8px;
      font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
      font-family: 'DM Sans', system-ui, sans-serif;
      transition: background 0.15s;
    }
    .btn-retry:hover { background: #e85d2a; }
    .btn-outline {
      background: transparent; color: #E8FF47;
      border: 1px solid rgba(232, 255, 71, 0.3); padding: 11px 24px;
      cursor: pointer; font-weight: 600;
      font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
      font-family: 'DM Sans', system-ui, sans-serif;
      transition: all 0.15s;
    }
    .btn-outline:hover { background: rgba(232, 255, 71, 0.08); border-color: #E8FF47; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-row">
      <div class="logo-dot"></div>
      <div class="logo-text">SYNAPSE</div>
    </div>
    <div class="quiz-subtitle">Quiz — <strong>${label}</strong> · ${questions.length} questions</div>
  </div>

  <div class="progress-wrap"><div class="progress-bar" id="bar" style="width:0%"></div></div>
  <div class="progress-text" id="ptext">Question 1 of ${questions.length}</div>

  <div class="q-card" id="qCard">
    <div class="q-num" id="qNum"></div>
    <div class="q-text" id="qText"></div>
    <div class="options" id="opts"></div>
    <div class="explanation" id="exp"></div>
    <button class="btn-next" id="btnNext" onclick="next()">Next →</button>
  </div>

  <div class="result" id="result">
    <div class="result-card">
      <div><span class="result-score" id="rScore"></span><span class="result-denom" id="rDenom"></span></div>
      <div class="result-label" id="rLabel"></div>
      <div class="result-msg" id="rMsg"></div>
      <button class="btn-retry" onclick="restart()">Try Again</button>
      <button class="btn-outline" onclick="vscode.postMessage({command:'openReplay'})">View Replay</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const Qs = ${q};
    const LETTERS = ['A','B','C','D'];
    let cur = 0, score = 0;

    function render() {
      if (cur >= Qs.length) { showResult(); return; }
      const q = Qs[cur];
      const pct = (cur / Qs.length) * 100;
      document.getElementById('bar').style.width = pct + '%';
      document.getElementById('ptext').textContent = 'Question ' + (cur+1) + ' of ' + Qs.length;
      document.getElementById('qNum').textContent = 'Question ' + (cur+1);
      document.getElementById('qText').textContent = q.question;
      document.getElementById('exp').className = 'explanation';
      document.getElementById('exp').innerHTML = '';
      document.getElementById('btnNext').className = 'btn-next';

      const opts = document.getElementById('opts');
      opts.innerHTML = q.options.map((o, i) =>
        '<div class="opt" id="o' + i + '" onclick="pick(' + i + ',' + q.correctIndex + ')">' +
        '<div class="opt-letter">' + LETTERS[i] + '</div><span>' + o + '</span></div>'
      ).join('');
    }

    function pick(chosen, correct) {
      document.querySelectorAll('.opt').forEach(el => { el.classList.add('disabled'); el.onclick = null; });
      document.getElementById('o' + chosen).classList.add(chosen === correct ? 'correct' : 'wrong');
      if (chosen !== correct) document.getElementById('o' + correct).classList.add('correct');
      if (chosen === correct) score++;

      const exp = document.getElementById('exp');
      exp.innerHTML = '<strong>Explanation:</strong> ' + Qs[cur].explanation;
      exp.classList.add('show');

      const btn = document.getElementById('btnNext');
      btn.classList.add('show');
      btn.textContent = cur === Qs.length - 1 ? 'See Results' : 'Next →';
    }

    function next() { cur++; render(); }

    function showResult() {
      document.getElementById('qCard').style.display = 'none';
      document.getElementById('bar').style.width = '100%';
      document.getElementById('ptext').textContent = 'Complete!';
      const pct = Math.round(score / Qs.length * 100);
      document.getElementById('rScore').textContent = score;
      document.getElementById('rDenom').textContent = '/' + Qs.length;
      document.getElementById('rLabel').textContent = pct + '% — ' + (pct===100?'Perfect! 🎯':pct>=70?'Great job!':'Keep going!');
      document.getElementById('rMsg').innerHTML = pct===100
        ? 'You nailed it. Students who score 100% fix related bugs <strong>3× faster</strong> on average.'
        : pct>=70
        ? 'Solid understanding. Review the missed ones and re-take to lock in the concept.'
        : 'Review the explanations above and retry — concept mastery takes repetition.';
      document.getElementById('result').classList.add('show');
      vscode.postMessage({ command: 'quizComplete', score, total: Qs.length });
    }

    function restart() {
      cur = 0; score = 0;
      document.getElementById('qCard').style.display = 'block';
      document.getElementById('result').classList.remove('show');
      render();
    }

    render();
  </script>
</body>
</html>`;
  }

  dispose() {
    QuizPanel.currentPanel = undefined;
    this._panel.dispose();
    this._disposables.forEach(d => d.dispose());
  }
}
