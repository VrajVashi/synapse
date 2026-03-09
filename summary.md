# Synapse — Codebase Summary

**The First Debugging Intelligence Platform for Bootcamps**
*AWS AI for Bharat Hackathon 2024 — Team Determinist*

---

## Purpose

Synapse helps coding bootcamp instructors and students by detecting common Python bug patterns in real-time (<200ms), tracking debugging sessions, providing adaptive quizzes, and delivering instructor analytics (struggle heatmaps, at-risk student detection, mastery tracking, curriculum insights).

**Tagline:** "Learn from your patterns. Fix bugs faster."

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19.2, React Router 7, Tailwind CSS 4, Vite 7 |
| VS Code Extension | TypeScript 5.3, VS Code API 1.85+ |
| Backend | Node.js 20 on AWS Lambda (SAM) |
| Database | AWS DynamoDB (3 tables) |
| File Storage | AWS S3 |
| AI | AWS Bedrock — Claude Haiku (`anthropic.claude-haiku-4-5-20251001-v1:0`) |
| Dev Mock | Express.js 4.18 |
| Region | ap-south-1 (Mumbai) |

---

## Project Structure

```
synapse-master/
├── dashboard-v2/          # React frontend (current)
├── extension/             # VS Code extension (TypeScript)
├── backend/               # AWS SAM serverless backend (14 Lambda functions)
├── backend-local/         # Express mock server for local dev (port 3001)
├── dashboard/             # Legacy frontend (HTML/CSS/JS)
├── trial/                 # Test/scratch files
├── PROJECT.md             # Project documentation
├── design.md              # Original design doc
├── SYNAPSE_FINAL_PIVOTED.md
└── SYNAPSE_REVISED_FINAL.md
```

---

## Frontend — `dashboard-v2/`

React SPA with React Router. All state in React Context + localStorage.

### Routes

| Route | Component | Who |
|-------|-----------|-----|
| `/auth` | AuthPage | Everyone |
| `/classrooms` | ClassroomsPage | Instructor only |
| `/` | DashboardPage | Instructor only |
| `/student` | StudentPage | Student only |

### Pages

- **AuthPage** — Login/signup with demo quick-login buttons (`teacher@demo.com` / `student@demo.com`)
- **ClassroomsPage** — Create classrooms, view stats, copy classroom IDs
- **DashboardPage** — 5-view analytics: Overview · Struggle Heatmap · At-Risk Students · Mastery Tracking · Curriculum Insights
- **StudentPage** — 3-step setup wizard: install extension → enter classroom ID → paste VS Code settings

### Components

`AuroraBackground`, `CustomCursor`, `NavSidebar`, `ParticleField`, `StatCard`, `StepCard`, `StruggleRow`, `StudentRow`, `Toast`

### Custom Hooks

`useCountUp`, `useCursorPosition`, `useIntersectionObserver`, `useMagneticHover`

### Key Files

| File | Purpose |
|------|---------|
| `src/main.jsx` | React entry point |
| `src/App.jsx` | Router setup + auth guards |
| `src/api.js` | API client with fallback mock data |
| `src/context/AuthContext.jsx` | Auth state + mock user DB |
| `.env` | `VITE_API_BASE_URL=http://localhost:3000` |
| `vite.config.js` | Vite (port 5173, Tailwind plugin) |

### Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| `teacher@demo.com` | `demo1234` | Instructor |
| `student@demo.com` | `demo1234` | Student |
| `vraj@synapse.dev` | `demo1234` | Instructor (founder) |

---

## VS Code Extension — `extension/`

Installed in students' VS Code. Activates on `.py` files.

### Modules

| File | Purpose |
|------|---------|
| `src/extension.ts` | Entry point — registers 5 commands, watches `.py` files |
| `src/pythonAnalyzer.ts` | Tier 1+2 regex pattern detection (<200ms) |
| `src/sessionRecorder.ts` | Records debugging attempts, flushes to backend every 30s |
| `src/sidebarProvider.ts` | Sidebar webview (classroom join/switch, diagnostics panel) |
| `src/replayPanel.ts` | Debugging Replay + DNA webview |
| `src/quizPanel.ts` | Adaptive quiz webview |
| `src/api.ts` | REST client for AWS backend (with offline fallback) |

### Extension Settings

| Setting | Default | Purpose |
|---------|---------|---------|
| `synapse.studentId` | — | Student ID set by instructor |
| `synapse.cohortId` | — | Joined classroom ID |
| `synapse.apiEndpoint` | AWS URL | API Gateway URL |
| `synapse.enablePredictiveWarnings` | `true` | Toggle AI warnings |
| `synapse.enableReplay` | `true` | Toggle session recording |

### 4 Detected Python Bug Patterns (Tier 1+2)

| Pattern | Crash Rate | Description |
|---------|-----------|-------------|
| None Handling | 73% | `.get()` / `.find()` results without `None` checks |
| Missing try/except | 45% | `open()`, `requests.get()`, `json.loads()` unprotected |
| Async/Await Misuse | 58% | `await` outside `async`, async fn not awaited |
| List Index Bounds | 34% | Direct array indexing without length check |

### Tier System

- **Tier 1+2:** Local regex detection in extension — <200ms, $0 cost
- **Tier 3:** AWS Bedrock Claude Haiku AI analysis — ~10% of checks, ~$0.0001/request

---

## Backend — `backend/`

AWS SAM (CloudFormation). Deployed to `ap-south-1`.

### API Endpoints (API Gateway → Lambda)

**Sessions**
- `POST /sessions` — Write debugging session (DynamoDB + S3 snapshot)
- `GET /sessions?studentId=X` — Read student's sessions

**Cohort Analytics**
- `GET /cohort/info` — Cohort metadata
- `GET /cohort/stats` — Weekly overview (sessions, fix time, improvement %)
- `GET /cohort/heatmap` — Error patterns by attempt count & crash rate
- `GET /cohort/at-risk` — Students with attempts >> class average
- `GET /cohort/mastery` — Concept mastery % vs targets
- `GET /cohort/curriculum` — AI curriculum insights (gaps, missing, on-track)
- `GET /cohort/patterns?errorType=X` — Pattern details
- `GET /cohort/homework` / `POST /cohort/homework` — Assignment management
- `POST /cohort/homework/{id}/close` — Close assignment

**Student**
- `GET /students/{id}/dna` — Debugging DNA profile (trial-and-error vs systematic)

**Quiz**
- `GET /quiz?errorType=X` — Quiz questions
- `POST /quiz/results` — Submit quiz result

**AI**
- `POST /analyze` — Bedrock Claude Haiku analysis

### DynamoDB Tables

| Table | Partition Key | Sort Key | Purpose |
|-------|--------------|----------|---------|
| `synapse-debugging-sessions` | `session_id` | `timestamp` | All debugging sessions |
| `synapse-user-profiles` | `user_id` | — | Student profiles |
| `synapse-cohort-patterns` | `cohort_id` | `error_type` | Cohort-wide error stats |

### S3

- Bucket: `synapse-code-snapshots-{ACCOUNT_ID}`
- Stores code snapshots for debugging replay
- Auto-deleted after 90 days

---

## Backend Local — `backend-local/`

Express mock server (port 3001) for local development without AWS.

```bash
cd backend-local && npm start
```

Exposes all cohort endpoints with hardcoded sample data (34 students, 5 error types, etc.).

---

## Data Storage Summary

| Storage | What |
|---------|------|
| DynamoDB | Sessions, user profiles, cohort patterns |
| S3 | Code snapshots for replay |
| localStorage (browser) | Auth state, classrooms, student classroom ID |
| VS Code global state | Session cache, student/cohort IDs, joined classrooms |

---

## Running the Project

### Frontend
```bash
cd dashboard-v2
npm install
npm run dev        # http://localhost:5173
```

### Local Mock Backend
```bash
cd backend-local
npm install
npm start          # http://localhost:3001
```

### VS Code Extension (dev mode)
```bash
cd extension
npm install
npm run compile
# Then press F5 in VS Code with the extension folder open
```

### AWS Backend (production)
```bash
cd backend
sam build
sam deploy         # Deploys to ap-south-1
```

---

## Estimated AWS Cost

~$30/month at bootcamp scale (Lambda ~$5, DynamoDB ~$10, S3 ~$5, API Gateway ~$5, Bedrock ~$0.0001/req, CloudWatch ~$5).

---

## UX / Design Notes

- Dark navy/cyan color scheme
- Glassmorphism (backdrop blur)
- Animated aurora gradient background
- Particle field effects
- Magnetic hover on cards
- Custom cursor
- Toast notifications
