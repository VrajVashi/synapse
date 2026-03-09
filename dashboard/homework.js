/**
 * Synapse Instructor Dashboard — Homework Module
 * Handles the Homework Questions view: list, create modal, close question.
 */

import { API } from './api.js';

// Read classroomId from URL (same as app.js does)
const params = new URLSearchParams(window.location.search);
const classroomId = params.get('classroomId') || 'DEMO';

// ── Modal open/close ─────────────────────────────────────────────────────────
const modal = document.getElementById('hw-modal');
const btnNew = document.getElementById('btn-new-hw');
const btnClose = document.getElementById('hw-modal-close');
const btnSubmit = document.getElementById('hw-submit');
const titleInput = document.getElementById('hw-title');
const bodyInput = document.getElementById('hw-body');
const dueInput = document.getElementById('hw-due');
const previewEl = document.getElementById('hw-preview');
const errorEl = document.getElementById('hw-error');

function openModal() {
    titleInput.value = '';
    bodyInput.value = '';
    dueInput.value = '';
    previewEl.textContent = 'Fill in the title above to preview…';
    errorEl.style.display = 'none';
    modal.style.display = 'flex';
}
function closeModal() {
    modal.style.display = 'none';
}

btnNew?.addEventListener('click', openModal);
btnClose?.addEventListener('click', closeModal);
modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });

// ── Live preview of the generated Python file header ─────────────────────────
function updatePreview() {
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    if (!title) {
        previewEl.textContent = 'Fill in the title above to preview…';
        return;
    }
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const filename = `hw_${slug}.py`;
    const bodyLines = (body || '(problem statement will appear here)')
        .split('\n').map(l => `# ${l}`).join('\n');
    previewEl.textContent =
        `# ════════════════════════════════════════
# SYNAPSE HOMEWORK: ${title}
# ════════════════════════════════════════
#
${bodyLines}
#
# ── Your solution below ──────────────────

`;
    previewEl.title = `File will be created as: ${filename}`;
}

titleInput?.addEventListener('input', updatePreview);
bodyInput?.addEventListener('input', updatePreview);

// ── Submit new question ───────────────────────────────────────────────────────
btnSubmit?.addEventListener('click', async () => {
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    const dueDate = dueInput.value;

    if (!title || !body) {
        errorEl.style.display = 'block';
        return;
    }
    errorEl.style.display = 'none';

    btnSubmit.textContent = 'Publishing…';
    btnSubmit.disabled = true;

    await API.createHomework({ classroomId, title, body, dueDate });

    btnSubmit.textContent = 'Publish to Students';
    btnSubmit.disabled = false;
    closeModal();
    renderHomework();
});

// ── Render homework list ─────────────────────────────────────────────────────
export async function renderHomework() {
    const questions = await API.getHomework();
    const el = document.getElementById('hw-list');
    if (!el) { return; }

    if (!questions.length) {
        el.innerHTML = `
            <div style="text-align:center;padding:60px 24px;color:#3E3E52">
                <div style="margin-bottom:12px;color:#3E3E52">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <div style="font-weight:700;color:#fff;margin-bottom:6px">No homework questions yet</div>
                <div style="font-size:13px">Click + New Question to assign your first problem.</div>
            </div>`;
        return;
    }

    el.innerHTML = questions.map(q => {
        const submittedPct = q.totalStudents ? Math.round((q.submissionCount / q.totalStudents) * 100) : 0;
        const statusColor = q.status === 'open' ? '#00D68F' : '#3E3E52';
        const dueLabel = q.dueDate ? `Due ${q.dueDate}` : 'No deadline';

        return `
        <div class="cur-card ${q.status !== 'open' ? 'ok' : 'gap'}" style="margin-bottom:12px;opacity:${q.status === 'open' ? 1 : 0.55}">
            <div class="cur-top">
                <span class="cur-concept">${q.title}</span>
                <span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;
                    background:${statusColor}18;color:${statusColor};border:1px solid ${statusColor}35">
                    ${q.status === 'open' ? 'Open' : 'Closed'}
                </span>
            </div>
            <div class="cur-meta" style="margin:8px 0">
                <div class="cur-meta-item">Due: <span>${dueLabel}</span></div>
                <div class="cur-meta-item">Submissions: <span style="color:#00E5FF;font-weight:700">${q.submissionCount}/${q.totalStudents}</span></div>
                <div class="cur-meta-item">Avg attempts: <span>${q.avgAttempts || '—'}</span></div>
            </div>
            <div style="margin:8px 0">
                <div style="height:4px;background:#1e1e1e;border-radius:4px;overflow:hidden">
                    <div style="height:100%;width:${submittedPct}%;background:#00E5FF;border-radius:4px;transition:width .8s cubic-bezier(0.22,1,0.36,1)"></div>
                </div>
                <div style="font-size:10px;color:#555;margin-top:4px">${submittedPct}% submitted</div>
            </div>
            <div class="cur-rec" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                <span>File: <code style="color:#00E5FF">${q.filename}</code></span>
                ${q.status === 'open' ? `
                <button onclick="closeQuestion('${q.id}')"
                    style="background:transparent;border:1px solid rgba(255,255,255,0.06);color:#8B8B9E;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;font-family:inherit;transition:all 0.2s"
                    onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#8B8B9E'">
                    Close
                </button>` : ''}
            </div>
        </div>`;
    }).join('');
}

// ── Close a question ─────────────────────────────────────────────────────────
window.closeQuestion = async function (hwId) {
    await API.closeHomework(hwId);
    renderHomework();
};

// ── Wire up to app.js navigation ────────────────────────────────────────────
// app.js already handles nav clicks and calls switchView(), we just need
// renderHomework() to fire when 'homework' view becomes active.
// We patch the existing navItems listener without touching app.js.
document.querySelectorAll('.nav-item').forEach(item => {
    if (item.dataset.view === 'homework') {
        item.addEventListener('click', () => renderHomework());
    }
});

// Initial render if homework is the active view on page load
if (new URLSearchParams(window.location.search).get('view') === 'homework') {
    renderHomework();
}
