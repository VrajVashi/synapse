# Synapse — Project Documentation

> **The first debugging intelligence platform for bootcamps.**
> *Learn from your patterns. Fix bugs faster.*

**Team Determinist** — AWS AI for Bharat Hackathon 2024
GitHub: [VrajVashi/synapse](https://github.com/VrajVashi/synapse)

---

## 1. What is Synapse?

Synapse is a real-time debugging intelligence platform designed for coding bootcamps. It has two halves:

1. **VS Code Extension** — Sits inside the student's editor, watches them code in Python, detects common bug patterns in real-time (<200ms), records every debugging session, and provides targeted quizzes to reinforce weak spots.

2. **Web Dashboard** — A browser-based interface where **instructors** view cohort-wide analytics (struggle heatmaps, at-risk students, mastery tracking, curriculum insights) and **students** register, join classrooms, and set up their extension.

The core thesis: bootcamp students repeatedly crash on the same 4 error patterns. By detecting these *before* runtime, tracking the debugging journey, and offering adaptive quizzes, Synapse turns every bug into a learning moment.

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    VS Code Extension (TypeScript)                │
│                                                                  │
│  extension.ts          → Activation, command registration,       │
│                          event wiring, session tracking gate     │
│  pythonAnalyzer.ts     → Tier 1: Local pattern matching (<200ms) │
│  sessionRecorder.ts    → Records debugging attempts to local     │
│                          state + flushes to API                  │
│  sidebarProvider.ts    → Grammarly-style sidebar panel with      │
│                          classroom join/switch + diagnostics      │
│  replayPanel.ts        → Debugging Replay webview                │
│  quizPanel.ts          → Adaptive quiz webview                   │
│  api.ts                → REST client for AWS backend             │
└────────────────┬─────────────────────────────────────────────────┘
                 │ REST (fetch)
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                      AWS Backend (planned)                        │
│                                                                  │
│  API Gateway     → REST endpoints for extension + dashboard      │
│  Lambda          → AST parsing (Tier 2), session API, quiz API   │
│  DynamoDB        → sessions, quiz_progress, cohort_patterns      │
│  S3              → Session replay storage                        │
│  Bedrock (Haiku) → AI analysis (10% of checks)                   │
│  CloudWatch      → Monitoring + cost alerts                      │
│  Region: ap-south-1 (Mumbai)                                     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                   Web Dashboard (HTML/CSS/JS)                     │
│                                                                  │
│  auth.html         → Sign in / Sign up + quick-login buttons     │
│  classrooms.html   → Instructor: create/manage classrooms        │
│  index.html        → Instructor: analytics dashboard             │
│  student.html      → Student: setup guide + classroom ID entry   │
│  app.js            → Dashboard frontend logic (renders views)    │
│  api.js            → Mock API layer (swap for real fetch)        │
│  styles.css        → Dashboard design system                     │
│  start.bat         → Dev server launcher                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Complete User Flow

### 3.1 Instructor Flow

```
auth.html                classrooms.html               index.html
┌──────────┐   login    ┌────────────────┐  click    ┌──────────────┐
│ Sign In  │ ────────►  │ My Classrooms  │ ───────►  │  Dashboard   │
│ (teacher)│            │ + New Classroom│           │  (per-class) │
└──────────┘            │ [Copy ID btn]  │           │  5 views     │
                        └────────────────┘           └──────────────┘
```

1. **Login** — `auth.html` → Sign in as teacher (or use "Quick Login: Demo Teacher" button)
2. **Create Classroom** — `classrooms.html` → Click "+ New Classroom" → Enter name, language, batch → Auto-generates a classroom ID (e.g. `PYTHON-2026-GCOU`) → Share this with students
3. **View Dashboard** — Click a classroom card → Opens `index.html` with 5 analytics views:
   - **Overview** — Weekly session count, avg fix time, quiz completion rate, at-risk student count
   - **Struggle Heatmap** — Error patterns ranked by crash rate with attempt volume bars
   - **At-Risk Students** — Students flagged for intervention (attempts >> class average)
   - **Mastery Tracking** — Concept mastery % vs target thresholds (progress bars)
   - **Curriculum Insights** — AI recommendations for schedule adjustments

### 3.2 Student Flow

```
auth.html              student.html            VS Code Extension
┌──────────┐  login   ┌──────────────┐  open   ┌──────────────────┐
│ Sign In  │ ──────►  │ Setup Guide  │ ──────► │  Sidebar Panel   │
│ (student)│          │ 3 steps      │         │  Join Classroom  │
└──────────┘          └──────────────┘         │  Diagnostics     │
                                               │  Quizzes         │
                                               └──────────────────┘
```

1. **Login** — `auth.html` → Sign in as student (or use "Quick Login: Demo Student")
2. **Setup Guide** — `student.html` → 3-step wizard:
   - Step 1: Install the Synapse VS Code Extension
   - Step 2: Enter classroom ID (from instructor) and save
   - Step 3: Paste the ID into VS Code settings (`synapse.cohortId`)
3. **VS Code Sidebar** — Open VS Code → Synapse icon in activity bar → Sidebar panel shows:
   - **Join Classroom** — Enter classroom ID → "Request to Join" → Pending state → Auto-approved after 2s (simulating instructor approval)
   - **Classroom Switcher** — Switch between multiple joined classrooms
   - **Activities** — Placeholder for future instructor-posted content
   - **Diagnostics** — Live issue detection (only shown when in an active classroom)
   - **Tools** — Debugging Replay, Debugging DNA, Problems panel, Student ID

### 3.3 Coding Session Flow (Extension)

```
Student opens .py file
        │
        ▼
  pythonAnalyzer.ts
  runs 4 pattern detectors
        │
        ├── None Handling (73% crash rate)
        ├── Missing try/except (45%)
        ├── Async/Await misuse (58%)
        └── List index bounds (34%)
        │
        ▼
  Diagnostics appear as
  squiggly warnings in editor
  + sidebar updates live
        │
        ▼
  Student saves file
        │
        ▼
  sessionRecorder.ts
  records debugging attempt
  (only if student is in a classroom)
        │
        ▼
  Student fixes the bug
        │
        ▼
  sessionRecorder marks resolved
  → shows "✅ Resolved in X min (Y attempts)"
  → offers "View Replay" button
        │
        ▼
  Session data flushed to API
  every 30 seconds (offline-safe)
```

---

## 4. Extension Components (Detail)

### 4.1 `pythonAnalyzer.ts` — Pattern Detection Engine

Runs locally in the extension, <200ms latency, $0 cost. Detects 4 critical patterns using regex pattern matching on Python source:

| Pattern | What it finds | Crash Rate |
|---|---|---|
| **None Handling** | `.get()`, `.find()`, `.query()` results accessed without None check | 73% |
| **Missing try/except** | `open()`, `requests.get()`, `json.loads()`, `int(input())` outside try block | 45% |
| **Async/Await** | `await` outside async function, async function called without `await` | 58% |
| **List Operations** | Direct index access (e.g. `items[3]`) without length check | 34% |

Each detection produces a `vscode.Diagnostic` with:
- The crash probability from cohort data
- A human-readable fix suggestion
- A clickable link to launch the targeted quiz

### 4.2 `sessionRecorder.ts` — Debugging Session Tracker

Tracks the complete debugging journey:
- **Starts session** when an error pattern is detected
- **Records attempts** on every file save (captures code snapshot, timestamp, duration)
- **Marks resolved** when the pattern disappears from the file
- **Stores locally** in `globalState` (survives VS Code restarts)
- **Flushes to API** every 30 seconds (offline-safe, retries on failure)
- **Gated on classroom** — recording is disabled until the student joins a classroom via `setEnabled()`

### 4.3 `sidebarProvider.ts` — Sidebar Panel

A Grammarly-style sidebar that lives in the VS Code activity bar. Contains:

1. **Join Classroom** section — Input field + "Join" button
2. **Pending Requests** — Shows classrooms awaiting instructor approval (with ⏳ animation)
3. **Classroom Switcher** — List of active classrooms with green dot = currently selected, ✕ button to leave
4. **Activities Placeholder** — "Coming soon" card for future instructor-posted content
5. **Diagnostics Panel** — Issue count badge, clickable issue rows, targeted quiz buttons (only visible when in a classroom)
6. **Tools** — Debugging Replay, Debugging DNA, Problems panel, Student ID display

Data model (stored in `globalState`):
```typescript
interface ClassroomEntry {
    id: string;           // e.g. "PYBOOT-2026-XK3F"
    status: 'pending' | 'active';
    joinedAt: string;     // ISO timestamp
}
// synapse.classrooms → ClassroomEntry[]
// synapse.activeClassroom → string (selected classroom ID)
```

### 4.4 `replayPanel.ts` — Debugging Replay Webview

Full-page webview with two tabs:
- **Debugging Replay** — Shows all recorded sessions as expandable cards with attempt timelines, code snapshots, and resolution status
- **Debugging DNA** — Analyzes debugging style (trial-and-error / systematic / visual) vs class average, with personalized improvement recommendations

### 4.5 `quizPanel.ts` — Adaptive Quiz Webview

Interactive quiz engine:
- Questions are hardcoded for MVP (zero hallucination risk) — 5 for None handling, 3 for async/await, 2 for try/except, 2 for list ops
- Each question shows 4 options → immediate correct/wrong feedback → detailed explanation
- Progress bar + score tracker + results summary with performance message
- Scores submitted to API for instructor dashboard analytics

### 4.6 `api.ts` — REST Client

Communicates with AWS API Gateway. All methods gracefully degrade when offline or when no API endpoint is configured:
- `recordSession()` → POST /sessions
- `getSessions()` → GET /sessions?studentId=...
- `getCohortPatterns()` → GET /cohort/patterns
- `getStudentDNA()` → GET /students/:id/dna
- `getQuiz()` → GET /quiz (falls back to hardcoded questions)
- `submitQuizResult()` → POST /quiz/results

### 4.7 `extension.ts` — Main Entry Point

Orchestrates everything:
- Initializes all services (analyzer, recorder, API, sidebar)
- Registers 5 commands: showReplay, showQuiz, showDNA, registerStudent, showMenu
- Watches Python files for changes and saves
- Updates sidebar and status bar on diagnostic changes
- Gates session recording behind classroom membership
- Auto-prompts for student registration on first launch

---

## 5. Web Dashboard Components (Detail)

### 5.1 `auth.html` — Authentication

- **Sign In** tab with email/password form
- **Sign Up** tab with role selector (Teacher/Student), name, email, password
- **Quick Login** buttons — One-click login as "Demo Teacher" or "Demo Student" (hardcoded credentials: email `teacher@demo.com` / `student@demo.com`, password `demo1234`)
- Mock auth: accepts demo credentials or any email with 6+ character password
- Auto-redirects if already logged in
- Redirects teachers → `classrooms.html`, students → `student.html`

### 5.2 `classrooms.html` — Classroom Management (Instructor)

- Displays all classrooms as cards in a responsive grid
- Each card shows: name, copyable ID (with Copy button + "Copied ✓" feedback), student count, session count, language
- "+ New Classroom" button opens a modal with: name, language, batch inputs + auto-generated ID preview
- Classroom IDs follow the format: `PREFIX-YEAR-RAND` (e.g. `PYTHON-2026-GCOU`)
- Clicking a card navigates to the main dashboard filtered by that classroom
- Data stored in `localStorage` (mock DB)

### 5.3 `index.html` — Instructor Analytics Dashboard

Sidebar navigation with 5 views, all pre-rendered for instant switching:

| View | What it shows |
|---|---|
| **Overview** | 4 stat cards (sessions, improvement, avg fix, at-risk count) + mini heatmap + mini at-risk list |
| **Struggle Heatmap** | Full table: rank, error pattern, attempt volume bar, sessions, crash rate, avg fix time, quiz completion |
| **At-Risk Students** | Table: name, error type, attempts vs class avg, severity bar, last seen, recommended action |
| **Mastery Tracking** | Progress bars per concept with target threshold markers and status colors (good/warn/danger) |
| **Curriculum Insights** | Cards per concept: taught date, peak struggle date, AI recommendation, type badge (gap/missing/ok) |

### 5.4 `student.html` — Student Setup Page

3-step setup wizard:
1. Install the Synapse VS Code Extension
2. Enter classroom ID (saved to `localStorage`)
3. Copy the VS Code setting string to paste into settings

### 5.5 `api.js` — Mock API Layer

All data is hardcoded mock data shaped to match the planned Lambda API responses. Each function can be swapped to a real `fetch()` call by uncommenting 2 lines. Mock data includes realistic cohort stats for 34 students.

---

## 6. Data Flow Diagram

```
Student types Python code
         │
         ▼
┌─────────────────────┐     ┌──────────────────┐
│  pythonAnalyzer.ts  │ ──► │ VS Code          │
│  regex detection    │     │ Diagnostics API  │
│  <200ms, local      │     │ (squiggly lines) │
└─────────────────────┘     └──────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────────┐     ┌──────────────────┐
│ sessionRecorder.ts  │     │ sidebarProvider  │
│ track attempts      │     │ live issue list  │
│ (gated on classroom)│     │ quiz buttons     │
└─────────┬───────────┘     └──────────────────┘
          │ flush every 30s
          ▼
┌─────────────────────┐     ┌──────────────────┐
│  AWS Lambda         │     │ DynamoDB         │
│  Session API        │ ──► │ sessions table   │
└─────────────────────┘     └──────────────────┘
          │                           │
          ▼                           ▼
┌─────────────────────┐     ┌──────────────────┐
│ Instructor Dashboard│ ◄── │ Aggregation      │
│ Heatmap, At-Risk,   │     │ (planned Lambda) │
│ Mastery, Curriculum │     │                  │
└─────────────────────┘     └──────────────────┘
```

---

## 7. File Structure

```
Synapse_aws/
├── extension/                     # VS Code Extension
│   ├── .vscode/
│   │   ├── launch.json            # F5 launch config
│   │   └── tasks.json             # Compile tasks
│   ├── media/
│   │   └── synapse-icon.svg       # Activity bar icon
│   ├── src/
│   │   ├── extension.ts           # Main entry point
│   │   ├── pythonAnalyzer.ts      # Pattern detection
│   │   ├── sessionRecorder.ts     # Session tracking
│   │   ├── sidebarProvider.ts     # Sidebar panel
│   │   ├── replayPanel.ts         # Replay webview
│   │   ├── quizPanel.ts           # Quiz webview
│   │   └── api.ts                 # REST client
│   ├── package.json               # Extension manifest
│   └── tsconfig.json              # TypeScript config
│
├── dashboard/                     # Web Dashboard
│   ├── auth.html                  # Login page
│   ├── classrooms.html            # Classroom management
│   ├── index.html                 # Instructor dashboard
│   ├── student.html               # Student setup page
│   ├── app.js                     # Dashboard logic
│   ├── api.js                     # Mock API layer
│   ├── styles.css                 # Design system
│   └── start.bat                  # Dev server
│
├── trial/
│   └── test.py                    # Test Python file
├── design.md                      # Original design doc
└── SYNAPSE_FINAL_PIVOTED.md       # Final spec
```

---

## 8. Configuration

### VS Code Extension Settings

| Setting | Default | Description |
|---|---|---|
| `synapse.studentId` | `""` | Student ID (from instructor) |
| `synapse.cohortId` | `""` | Bootcamp cohort/classroom ID |
| `synapse.apiEndpoint` | `https://your-api-id...` | AWS API Gateway URL |
| `synapse.enablePredictiveWarnings` | `true` | Show AI-powered warnings |
| `synapse.enableReplay` | `true` | Record debugging sessions |

### Hardcoded Demo Accounts

| Role | Email | Password |
|---|---|---|
| Teacher | `teacher@demo.com` | `demo1234` |
| Student | `student@demo.com` | `demo1234` |

---

## 9. How to Run

### Extension (Development)
```bash
cd extension
npm install
npm run compile
# Press F5 in VS Code (with extension folder open)
```

### Dashboard
```bash
cd dashboard
# Option 1: Double-click start.bat
# Option 2: Open auth.html directly in browser
# Option 3: Use any local server (e.g. npx serve .)
```

---

## 10. AWS Cost Estimate

| Service | Purpose | Est. Monthly Cost |
|---|---|---|
| AWS Bedrock (Claude Haiku) | AI analysis (10% of checks) | ~$0.0001/req |
| AWS Lambda | AST parsing, session API | ~$5 |
| Amazon DynamoDB | Session + quiz storage | ~$10 |
| Amazon API Gateway | Extension ↔ backend | ~$5 |
| Amazon S3 | Session replay storage | ~$5 |
| CloudWatch | Monitoring + cost alerts | ~$5 |
| **Total** | | **~$30/month** |

Deploy region: **`ap-south-1` (Mumbai)** — lowest latency for India.
