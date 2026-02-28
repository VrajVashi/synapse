/**
 * Synapse Instructor Dashboard — App Logic
 * All data comes from api.js — swap mock → real fetch() there.
 */

import { API } from './api.js';

// ── Auth guard ─────────────────────────────────────────────────────────────
const user = JSON.parse(localStorage.getItem('synapse_user') || 'null');
if (!user || user.role !== 'teacher') { window.location.href = 'auth.html'; }

function logout() {
  localStorage.removeItem('synapse_user');
  window.location.href = 'auth.html';
}

// ── Read classroom from URL ────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const classroomId = params.get('classroomId') || 'DEMO';
const classroomName = params.get('classroomName') || 'Demo Classroom';

// Show in sidebar footer
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

// "See all" card links also navigate
document.querySelectorAll('.card-link[data-view]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    switchView(link.dataset.view);
  });
});

// ── Color helpers ─────────────────────────────────────────────────────────
function barColor(pct) {
  if (pct >= 60) return '#ef4444';
  if (pct >= 40) return '#eab308';
  return '#f97316';
}

// ── Render: Overview ─────────────────────────────────────────────────────
async function renderOverview() {
  const [stats, heatmap, atRisk] = await Promise.all([
    API.getWeeklyStats(),
    API.getHeatmap(),
    API.getAtRisk(),
  ]);

  document.getElementById('ov-sessions').textContent = stats.totalSessions.toLocaleString();
  document.getElementById('ov-delta').textContent = `${stats.improvementVsLastWeek} vs last week`;
  document.getElementById('ov-avgfix').textContent = stats.avgFixTime;
  document.getElementById('ov-quiz').textContent = stats.quizCompletionRate;
  document.getElementById('ov-quizbar').style.width = stats.quizCompletionRate + '%';
  document.getElementById('ov-atrisk').textContent = atRisk.length;

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
        <div class="hm-bar" style="width:${row.pct}%;background:${barColor(row.pct)}"></div>
      </div>
    </div>
  `).join('');

  // Mini at-risk
  const riskEl = document.getElementById('ov-risk');
  riskEl.innerHTML = atRisk.slice(0, 3).map(s => `
    <div class="risk-row">
      <div>
        <div class="risk-name">${s.name}</div>
        <div class="risk-detail">${s.errorType} · ${s.attempts}× (class avg ${s.classAvg}×) · ${s.lastSeen}</div>
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
          <span style="font-weight:600;color:#e5e5e5">${row.errorType}</span>
        </div>
        <div class="hm-bar-full-wrap">
          <div class="hm-bar-full" style="width:${row.pct}%;background:${barColor(row.pct)}"></div>
        </div>
        <span style="font-weight:700;color:#f97316">${row.attempts.toLocaleString()}</span>
        <span style="font-weight:700;color:${barColor(row.pct)}">${row.pct}%</span>
        <span style="color:#888">${row.avgFixMin} min</span>
        <span style="color:${row.quizCompletion >= 60 ? '#22c55e' : '#888'}">${row.quizCompletion}%</span>
      </div>
    `).join('')}
  `;
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
        <span class="attempts-val">${s.attempts}×</span>
        <span class="attempts-avg"> vs ${s.classAvg}× avg</span>
      </td>
      <td>
        <div style="background:#ef444420;border-radius:4px;height:5px;width:80px">
          <div style="height:100%;width:${Math.min(100, (s.attempts / (s.classAvg * 3)) * 100)}%;background:#ef4444;border-radius:4px"></div>
        </div>
      </td>
      <td style="color:#555;font-size:11px">${s.lastSeen}</td>
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
        <div class="mastery-bar ${m.status}" style="width:${m.mastery}%"></div>
      </div>
      <span class="mastery-pct ${m.status}">${m.mastery}%
        <span style="font-size:10px;font-weight:500;color:#444"> / ${m.target}% target</span>
      </span>
    </div>
  `).join('');
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
      <div class="cur-rec">→ ${item.recommendation}</div>
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
  document.getElementById('activeToday').textContent = cohort.activeToday;
  document.getElementById('totalStudents').textContent = cohort.totalStudents;

  // Pre-render all views so navigation is instant
  await Promise.all([
    renderOverview(),
    renderHeatmap(),
    renderStudents(),
    renderMastery(),
    renderCurriculum(),
  ]);
}

boot();
