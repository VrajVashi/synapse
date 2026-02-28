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
    const api = new SynapseApi();
    const questions = await api.getQuiz(errorType);
    this._panel.webview.html = this.getHtml(questions, errorType);

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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0a0a0a; color: #e5e5e5;
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      font-size: 13px; min-height: 100vh;
    }

    /* Header */
    .header { background: #111; border-bottom: 1px solid #1f1f1f; padding: 14px 16px; }
    .logo-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .logo-icon { width: 26px; height: 26px; border-radius: 6px; background: #f97316; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; color: #000; }
    .logo-text { font-size: 15px; font-weight: 800; color: #fff; }
    .logo-text span { color: #f97316; }
    .quiz-subtitle { color: #444; font-size: 11px; }
    .quiz-subtitle strong { color: #f97316; text-transform: capitalize; }

    /* Progress */
    .progress-wrap { background: #1a1a1a; height: 3px; margin: 0; }
    .progress-bar { height: 100%; background: #f97316; transition: width 0.5s ease; border-radius: 0 2px 2px 0; }
    .progress-text { padding: 10px 16px 2px; color: #444; font-size: 11px; font-weight: 600; }

    /* Question */
    .q-card { margin: 0 14px 14px; background: #111; border: 1px solid #1f1f1f; border-radius: 12px; padding: 18px; }
    .q-num { font-size: 10px; color: #f97316; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
    .q-text { font-size: 14px; font-weight: 600; color: #fff; line-height: 1.55; margin-bottom: 18px; }

    /* Options */
    .options { display: flex; flex-direction: column; gap: 8px; }
    .opt {
      background: #0d0d0d; border: 1.5px solid #1f1f1f;
      border-radius: 9px; padding: 11px 14px;
      cursor: pointer; display: flex; align-items: center; gap: 10px;
      font-size: 13px; color: #777; transition: all 0.15s;
    }
    .opt:hover:not(.disabled) { border-color: #f97316; color: #e5e5e5; background: #f9731608; }
    .opt.correct { border-color: #22c55e; background: #22c55e0d; color: #4ade80; }
    .opt.wrong   { border-color: #ef4444; background: #ef44440d; color: #f87171; }
    .opt.disabled { cursor: default; }
    .opt-letter {
      width: 24px; height: 24px; border-radius: 6px;
      background: #1a1a1a; display: flex; align-items: center;
      justify-content: center; font-size: 10px; font-weight: 800;
      color: #444; flex-shrink: 0;
    }
    .opt.correct .opt-letter { background: #22c55e; color: #000; }
    .opt.wrong   .opt-letter { background: #ef4444; color: #fff; }

    /* Explanation */
    .explanation {
      display: none; margin-top: 14px;
      background: #0d0d0d; border: 1px solid #1f1f1f;
      border-left: 3px solid #f97316;
      border-radius: 8px; padding: 12px 14px;
      font-size: 12px; color: #666; line-height: 1.7;
    }
    .explanation.show { display: block; }
    .explanation strong { color: #f97316; }

    /* Next btn */
    .btn-next {
      display: none; margin-top: 14px; width: 100%;
      background: #f97316; color: #000;
      border: none; padding: 11px 20px; border-radius: 8px;
      cursor: pointer; font-weight: 700; font-size: 13px;
      transition: background 0.15s;
    }
    .btn-next:hover { background: #fb923c; }
    .btn-next.show { display: block; }

    /* Result */
    .result { display: none; margin: 14px; }
    .result.show { display: block; }
    .result-card {
      background: #111; border: 1px solid #f9731630;
      border-radius: 14px; padding: 28px 20px; text-align: center;
    }
    .result-score { font-size: 54px; font-weight: 900; color: #f97316; line-height: 1; }
    .result-denom { font-size: 20px; color: #333; }
    .result-label { color: #666; font-size: 13px; margin: 10px 0 20px; }
    .result-msg {
      background: #0d0d0d; border: 1px solid #1f1f1f;
      border-radius: 10px; padding: 14px;
      color: #555; font-size: 12px; line-height: 1.7;
      text-align: left; margin-bottom: 20px;
    }
    .result-msg strong { color: #f97316; }
    .btn-retry {
      background: #f97316; color: #000; border: none;
      padding: 11px 24px; border-radius: 8px;
      cursor: pointer; font-weight: 700; margin-right: 8px;
    }
    .btn-retry:hover { background: #fb923c; }
    .btn-outline {
      background: transparent; color: #f97316;
      border: 1.5px solid #f9731640; padding: 11px 24px;
      border-radius: 8px; cursor: pointer; font-weight: 600;
    }
    .btn-outline:hover { background: #f9731610; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-row">
      <div class="logo-icon">S</div>
      <div class="logo-text">Syn<span>apse</span></div>
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
