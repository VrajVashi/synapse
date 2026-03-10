# Synapse — Debugging Intelligence Platform

> Real-time debugging analytics for coding bootcamp instructors, powered by AWS Bedrock.

---

## Quick Start (Demo — 30 seconds)

```bash
git clone https://github.com/VrajVashi/synapse.git
cd synapse/dashboard-v2
./start.bat
```

- **Dashboard:** http://localhost:5173
- **Backend API:** http://localhost:3001

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Teacher | `teacher@synapse.dev` | `password` |
| Student | `student@synapse.dev` | `password` |

---

## Project Structure

```
synapse/
├── extension/          # VS Code extension (TypeScript)
├── backend-local/      # Local Express server (mirrors AWS API)
├── dashboard-v2/       # React instructor dashboard (Vite + Tailwind)
└── dashboard/          # Legacy HTML dashboard (deprecated)
```

---

## Running Each Component

### 1. Backend + Dashboard (everything at once)
```bash
cd dashboard-v2
./start.bat
```
This automatically:
- Installs dependencies if missing
- Starts `backend-local` on port 3001
- Starts the React dashboard on port 5173

### 2. Backend only
```bash
cd backend-local
npm install
node server.js
```

### 3. Dashboard only
```bash
cd dashboard-v2
npm install
npm run dev
```

### 4. VS Code Extension

**Install from .vsix:**
1. Open VS Code
2. `Ctrl+Shift+P` → **Extensions: Install from VSIX**
3. Select `extension/synapse-x.x.x.vsix`

**Or run in development:**
```bash
cd extension
npm install
npm run compile
# Press F5 in VS Code to launch Extension Development Host
```

---

## Connecting the Extension to the Local Backend

> This is required to see the full live loop: student codes → dashboard updates

1. Open VS Code **Settings** (`Ctrl+,`)
2. Search for `synapse`
3. Set the following:

| Setting | Value |
|---------|-------|
| `synapse.apiEndpoint` | `http://localhost:3001` |
| `synapse.cohortId` | Your classroom ID (from dashboard) |
| `synapse.studentId` | Any student identifier (e.g. `arjun`) |

**Or add to your workspace `settings.json`:**
```json
{
  "synapse.apiEndpoint": "http://localhost:3001",
  "synapse.cohortId": "PYTHON-2026-ABCD",
  "synapse.studentId": "demo-student"
}
```

Once set:
- Open any `.py` file → Synapse starts monitoring
- Trigger an error pattern (e.g. `result = db.get("key")` then `return result.name`)
- The extension shows an inline warning + AI fix suggestion
- Within 10 seconds the dashboard heatmap updates

---

## Testing the Full Live Loop (Demo Script)

**Step 1 — Start the stack:**
```bash
cd dashboard-v2 && ./start.bat
```

**Step 2 — Simulate a student session via cURL:**
```bash
curl -X POST http://localhost:3001/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "demo-001",
    "studentId": "arjun",
    "errorType": "none_handling",
    "cohortId": "YOUR-CLASSROOM-ID",
    "startTime": "2026-03-08T10:00:00Z",
    "attempts": [
      {"attemptNumber": 1, "timestamp": "2026-03-08T10:00:00Z", "errorType": "none_handling", "codeSnapshot": "return user.name", "resolved": false, "durationSeconds": 120}
    ],
    "resolved": true,
    "totalDurationSeconds": 780
  }'
```

**Step 3 — Watch the dashboard:**
- Within 10 seconds, `totalSessions` increments on the Overview page
- "None / Null Handling" row updates in the Heatmap
- If attempts > class average, "arjun" appears in At-Risk Students

---

## Backend API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/cohort/info` | Cohort overview (name, students, activeToday) |
| `GET` | `/cohort/heatmap` | Error type struggle data |
| `GET` | `/cohort/at-risk` | Students needing attention |
| `GET` | `/cohort/mastery` | Concept mastery rates |
| `GET` | `/cohort/curriculum` | Curriculum gap insights |
| `GET` | `/cohort/stats` | Weekly aggregate stats |
| `GET` | `/cohort/homework` | Homework assignments |
| `POST` | `/sessions` | Ingest debug session from extension |
| `POST` | `/quiz/results` | Submit quiz score |
| `POST` | `/analyze` | AI fix suggestion (mocks AWS Bedrock) |
| `POST` | `/classrooms` | Create a classroom |
| `GET` | `/classrooms` | List all classrooms |
| `POST` | `/classrooms/:id/join` | Student joins classroom |
| `GET` | `/classroom/:id/homework` | Homework for a classroom (extension) |
| `POST` | `/cohort/homework` | Create homework assignment |
| `POST` | `/cohort/homework/:id/close` | Close homework |

---

## Architecture

```
VS Code Extension (TypeScript)
    │
    │  POST /sessions, POST /quiz/results
    │  POST /analyze (AWS Bedrock in prod)
    ▼
backend-local/server.js          ←→      AWS Lambda + DynamoDB (production)
    │  (same API contract)
    │
    │  GET /cohort/* (10-second polling)
    ▼
React Dashboard (Vite + Tailwind)
```

**Local backend mirrors the AWS API contract exactly.**  
Production deployment = swap `backend-local` with Lambda + DynamoDB, zero dashboard code changes.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| VS Code Extension | TypeScript + VS Code API |
| AI Analysis | AWS Bedrock (Claude Haiku) — local mock in dev |
| Backend (Cloud) | AWS Lambda + API Gateway + DynamoDB |
| Backend (Local) | Node.js + Express |
| Frontend | React 18 + Vite + Tailwind CSS v4 |
| Fonts | Bebas Neue + DM Sans |

---

## Team

**Team:** Awzxshi  
**Track:** PS01 — AI for Learning & Developer Productivity  
**Hackathon:** AWS AI for Bharat
