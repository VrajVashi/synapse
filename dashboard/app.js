/**
 * Synapse Instructor Dashboard — App Logic
 * Deep Space & Bioluminescence Edition
 * Rolling number animations, animated bars, cyan accent color system
 */

import { API } from './api.js';

// ── Auth guard ─────────────────────────────────────────────────────────────
const user = JSON.parse(localStorage.getItem('synapse_user') || 'null');
if (!user || user.role !== 'teacher') { window.location.href = 'auth.html'; }

function logout() {
  localStorage.removeItem('synapse_user');
  window.location.href = 'auth.html';
}
window.logout = logout;

// ── Read classroom from URL ────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const classroomId = params.get('classroomId') || 'DEMO';
const classroomName = params.get('classroomName') || 'Demo Classroom';

const cohortEl = document.getElementById('cohortName');
if (cohortEl) { cohortEl.textContent = classroomName; }

// ── Navigation ────────────────────────────────────────────────────────────
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');

const titles = {
  overview: ['Overview', 'Week summary across your cohort'],
  heatmap: ['Struggle Heatmap', 'Most common error patterns this week'],
  students: ['At-Risk Students', 'Students flagged for instructor intervention'],
  mastery: ['Mastery Tracking', 'Concept mastery rates vs target thresholds'],
  curriculum: ['Curriculum Insights', 'AI-generated teaching schedule recommendations'],
  homework: ['Homework', 'Questions assigned to this cohort'],
};

function switchView(viewId) {
  navItems.forEach(n => n.classList.toggle('active', n.dataset.view === viewId));
  views.forEach(v => v.classList.toggle('active', v.id === `view-${viewId}`));
  const [title, sub] = titles[viewId] || ['Overview', ''];
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageSub').textContent = sub;
}

navItems.forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    switchView(item.dataset.view);
  });
});

document.querySelectorAll('.card-link[data-view]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    switchView(link.dataset.view);
  });
});

// ── Rolling number animation ──────────────────────────────────────────────
function animateNumber(el, targetValue, duration = 900) {
  const isFloat = String(targetValue).includes('.');
  const start = 0;
  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out curve (cubic-bezier 0.22, 1, 0.36, 1 approximation)
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (targetValue - start) * eased;

    if (isFloat) {
      el.textContent = current.toFixed(1);
    } else {
      el.textContent = Math.round(current).toLocaleString();
    }

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }
  requestAnimationFrame(tick);
}

// Animate bar width from 0 to target after a short delay (lets the layout settle)
function animateBar(el, targetWidth) {
  el.style.width = '0%';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.width = targetWidth + '%';
    });
  });
}

// ── Color helpers ─────────────────────────────────────────────────────────
function barColor(pct) {
  if (pct >= 60) return '#FF3B5C';
  if (pct >= 40) return '#F5A623';
  return '#00E5FF';
}

// ── Render: Overview ─────────────────────────────────────────────────────
async function renderOverview() {
  const [stats, heatmap, atRisk] = await Promise.all([
    API.getWeeklyStats(),
    API.getHeatmap(),
    API.getAtRisk(),
  ]);

  // Rolling number animations for stat cards
  animateNumber(document.getElementById('ov-sessions'), stats.totalSessions);
  document.getElementById('ov-delta').textContent = `${stats.improvementVsLastWeek} vs last week`;
  animateNumber(document.getElementById('ov-avgfix'), parseFloat(stats.avgFixTime));
  animateNumber(document.getElementById('ov-quiz'), stats.quizCompletionRate);

  // Animated progress bar
  animateBar(document.getElementById('ov-quizbar'), stats.quizCompletionRate);

  // At-risk (rolling)
  animateNumber(document.getElementById('ov-atrisk'), atRisk.length, 600);

  // Mini heatmap (top 3)
  const hmEl = document.getElementById('ov-heatmap');
  hmEl.innerHTML = heatmap.slice(0, 3).map(row => `
    <div class="hm-row">
      <div class="hm-top">
        <span class="hm-name">${row.errorType}</span>
        <div class="hm-meta">
          <span class="hm-chip rate">${row.pct}% crash</span>
          <span class="hm-chip time">${row.avgFixMin}m avg fix</span>
          <span class="hm-chip quiz">${row.quizCompletion}% quiz</span>
        </div>
      </div>
      <div class="hm-bar-wrap">
        <div class="hm-bar" data-width="${row.pct}" style="background:${barColor(row.pct)}"></div>
      </div>
    </div>
  `).join('');

  // Animate heatmap bars after DOM insert
  hmEl.querySelectorAll('.hm-bar[data-width]').forEach(bar => {
    animateBar(bar, bar.dataset.width);
  });

  // Mini at-risk
  const riskEl = document.getElementById('ov-risk');
  riskEl.innerHTML = atRisk.slice(0, 3).map(s => `
    <div class="risk-row">
      <div>
        <div class="risk-name">${s.name}</div>
        <div class="risk-detail">${s.errorType} · ${s.attempts}x (class avg ${s.classAvg}x) · ${s.lastSeen}</div>
      </div>
      <span class="risk-badge">${s.action}</span>
    </div>
  `).join('');
}

// ── Render: Heatmap ───────────────────────────────────────────────────────
async function renderHeatmap() {
  const heatmap = await API.getHeatmap();
  const el = document.getElementById('hm-full');

  el.innerHTML = `
    <div class="hm-full-row header-row">
      <span>#&nbsp;&nbsp;Error Pattern</span>
      <span>Attempt Volume</span>
      <span>Sessions</span>
      <span>Crash Rate</span>
      <span>Avg Fix</span>
      <span>Quiz Done</span>
    </div>
    ${heatmap.map((row, i) => `
      <div class="hm-full-row">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="hm-rank">${i + 1}</span>
          <span style="font-weight:600;color:#fff">${row.errorType}</span>
        </div>
        <div class="hm-bar-full-wrap">
          <div class="hm-bar-full" data-width="${row.pct}" style="background:${barColor(row.pct)}"></div>
        </div>
        <span style="font-weight:700;color:#00E5FF">${row.attempts.toLocaleString()}</span>
        <span style="font-weight:700;color:${barColor(row.pct)}">${row.pct}%</span>
        <span style="color:#8B8B9E">${row.avgFixMin} min</span>
        <span style="color:${row.quizCompletion >= 60 ? '#00D68F' : '#8B8B9E'}">${row.quizCompletion}%</span>
      </div>
    `).join('')}
  `;

  // Animate bars
  el.querySelectorAll('.hm-bar-full[data-width]').forEach(bar => {
    animateBar(bar, bar.dataset.width);
  });
}

// ── Render: At-Risk Students ──────────────────────────────────────────────
async function renderStudents() {
  const students = await API.getAtRisk();
  const el = document.getElementById('students-body');

  el.innerHTML = students.map(s => `
    <tr>
      <td><span class="student-name">${s.name}</span></td>
      <td><span class="hm-chip rate" style="background:transparent;border:none;padding:0">${s.errorType}</span></td>
      <td>
        <span class="attempts-val">${s.attempts}x</span>
        <span class="attempts-avg"> vs ${s.classAvg}x avg</span>
      </td>
      <td>
        <div style="background:rgba(255,59,92,0.12);border-radius:4px;height:5px;width:80px">
          <div style="height:100%;width:${Math.min(100, (s.attempts / (s.classAvg * 3)) * 100)}%;background:#FF3B5C;border-radius:4px;transition:width 0.8s cubic-bezier(0.22,1,0.36,1)"></div>
        </div>
      </td>
      <td style="color:#8B8B9E;font-size:11px">${s.lastSeen}</td>
      <td><span class="action-chip">${s.action}</span></td>
    </tr>
  `).join('');
}

// ── Render: Mastery ───────────────────────────────────────────────────────
async function renderMastery() {
  const mastery = await API.getMastery();
  const el = document.getElementById('mastery-list');

  el.innerHTML = mastery.map(m => `
    <div class="mastery-row">
      <span class="mastery-concept">${m.concept}</span>
      <div class="mastery-bar-wrap">
        <div class="mastery-target-line" style="left:${m.target}%"
             title="Target: ${m.target}%"></div>
        <div class="mastery-bar ${m.status}" data-width="${m.mastery}"></div>
      </div>
      <span class="mastery-pct ${m.status}">${m.mastery}%
        <span style="font-size:10px;font-weight:500;color:#3E3E52"> / ${m.target}% target</span>
      </span>
    </div>
  `).join('');

  // Animate mastery bars
  el.querySelectorAll('.mastery-bar[data-width]').forEach(bar => {
    animateBar(bar, bar.dataset.width);
  });
}

// ── Render: Curriculum Insights ───────────────────────────────────────────
async function renderCurriculum() {
  const data = await API.getCurriculum();
  const el = document.getElementById('curriculum-list');

  const typeLabel = { gap: 'Reinforcement Gap', missing: 'Missing Prerequisite', ok: 'On Track' };

  el.innerHTML = data.map(item => `
    <div class="cur-card ${item.type}">
      <div class="cur-top">
        <span class="cur-concept">${item.concept}</span>
        <span class="cur-type ${item.type}">${typeLabel[item.type]}</span>
      </div>
      <div class="cur-meta">
        <div class="cur-meta-item">Taught: <span>${item.taught}</span></div>
        <div class="cur-meta-item">Peak Struggle: <span>${item.peakStruggle}</span></div>
      </div>
      <div class="cur-rec">${item.recommendation}</div>
    </div>
  `).join('');
}

// ── Boot ──────────────────────────────────────────────────────────────────
async function boot() {
  const [cohort] = await Promise.all([
    API.getCohortInfo(),
  ]);

  document.getElementById('cohortName').textContent = cohort.name;
  document.getElementById('pageSub').textContent = `${cohort.name} · Week ${cohort.week}`;

  // Rolling number for topbar stats
  animateNumber(document.getElementById('activeToday'), cohort.activeToday, 700);
  animateNumber(document.getElementById('totalStudents'), cohort.totalStudents, 700);

  // Pre-render all views
  await Promise.all([
    renderOverview(),
    renderHeatmap(),
    renderStudents(),
    renderMastery(),
    renderCurriculum(),
  ]);
}

boot();
