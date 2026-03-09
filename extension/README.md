# Synapse VS Code Extension

> **The first debugging intelligence platform for bootcamps.**  
> *Learn from your patterns. Fix bugs faster.*

---

## Features

| Feature | Description |
|---|---|
| 🔍 **Pattern Detection** | Detects 4 critical Python bug patterns locally (<200ms) |
| 🎬 **Debugging Replay** | See your complete attempt timeline for every error |
| 🧬 **Debugging DNA** | Understand your debugging style (trial-and-error / systematic / visual) |
| 🎓 **Adaptive Quizzes** | Targeted quizzes based on YOUR struggle patterns |
| 📊 **Cohort Intelligence** | Shows crash rates from 800+ similar debugging sessions |

## Error Patterns Detected

1. **None Handling** — `.get()`, `.query()`, `.find()` return None without guard → AttributeError (73% crash rate)
2. **Missing try/except** — `open()`, `requests.get()`, `json.loads()`, `int(input())` unguarded (45%)
3. **Async/Await** — `await` outside async function, coroutine called without await (58%)
4. **List Operations** — Index access without bounds check (34%)

## Setup

### Prerequisites
- VS Code 1.85+
- Node.js 18+
- Python + Pylint installed

### Install & Run (Development)

```bash
cd extension
npm install
npm run compile
```

Then press **F5** in VS Code to launch the Extension Development Host.

### Configure

Open VS Code Settings and search for `Synapse`:

| Setting | Description |
|---|---|
| `synapse.studentId` | Your student ID (given by instructor) |
| `synapse.cohortId` | Your bootcamp cohort ID |
| `synapse.apiEndpoint` | AWS API Gateway URL (set after backend deployment) |

## Commands

| Command | Description |
|---|---|
| `Synapse: Show Debugging Replay` | Open your debugging session history |
| `Synapse: Take Quiz` | Launch adaptive quiz for your weak spots |
| `Synapse: View Debugging DNA Profile` | See your debugging style analysis |
| `Synapse: Register as Student` | Link to your bootcamp account |

## Architecture

```
VS Code Extension (TypeScript)
├── pythonAnalyzer.ts     → Tier 1: Local pattern matching (<200ms, $0)
├── sessionRecorder.ts    → Records every debugging attempt to DynamoDB
├── api.ts                → Calls Lambda via API Gateway
├── replayPanel.ts        → Debugging Replay + DNA Profile webview
└── quizPanel.ts          → Interactive quiz webview

AWS Backend (see /backend)
├── Lambda: AST Parser    → Tier 2: Deeper Python analysis
├── Lambda: Session API   → Read/write DynamoDB sessions
├── DynamoDB              → sessions, quiz_progress, cohort_patterns
└── API Gateway           → REST API for extension
```

## AWS Stack

| Service | Purpose | Cost |
|---|---|---|
| AWS Bedrock (Claude Haiku) | AI analysis (10% of checks) | ~$0.0001/req |
| AWS Lambda | AST parsing, session API | ~$5/month |
| Amazon DynamoDB | Session + quiz storage | ~$10/month |
| Amazon API Gateway | Extension ↔ backend | ~$5/month |
| Amazon S3 | Session replay storage | ~$5/month |
| CloudWatch | Monitoring + cost alerts | ~$5/month |

**Deploy region: `ap-south-1` (Mumbai) — lowest latency for India**

## Team

**Team Determinist** — AWS AI for Bharat Hackathon 2024  
GitHub: [VrajVashi/synapse](https://github.com/VrajVashi/synapse)
