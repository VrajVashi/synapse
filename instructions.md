# Synapse — AWS Deployment Guide

Everything you need to go from zero to live on AWS + Railway.

---

## Prerequisites

Make sure these are installed on your machine:

```powershell
aws --version      # AWS CLI v2
sam --version      # AWS SAM CLI
node --version     # Node.js 18+
```

You also need:
- An **AWS account** with an IAM user that has `AdministratorAccess` (or at minimum: DynamoDB, S3, SNS, CloudWatch, CloudFormation, IAM full access)
- A **Railway** account with the `synapse-backend` service already running
- A **Render** account with `dashboard-v2` deployed

---

## Step 1 — Configure AWS credentials locally

```powershell
aws configure
```

Enter when prompted:
| Prompt | Value |
|---|---|
| AWS Access Key ID | from IAM → Users → Security credentials |
| AWS Secret Access Key | from same place |
| Default region | `ap-south-1` |
| Default output format | `json` |

Verify:
```powershell
aws sts get-caller-identity
```

---

## Step 2 — Checkout the `vraj-bug` branch (has all our changes)

```powershell
cd d:\vraj\synapse
git fetch origin
git checkout vraj-bug
```

---

## Step 3 — Deploy AWS infrastructure (DynamoDB + S3 + SNS)

This creates all the tables, bucket, and SNS topic in one command.

```powershell
cd backend
sam build
sam deploy --guided
```

When prompted for inputs, use:

| Prompt | Value |
|---|---|
| Stack Name | `synapse-prod` |
| AWS Region | `ap-south-1` |
| Confirm changeset | `y` |
| Allow SAM to create IAM roles | `y` |
| Save config to samconfig.toml | `y` |

> ⚠️ This takes **3–5 minutes** the first time. Just let it run.

### What gets created

| Resource | Name |
|---|---|
| DynamoDB table | `synapse-classrooms` |
| DynamoDB table | `synapse-debugging-sessions` |
| DynamoDB table | `synapse-user-profiles` |
| DynamoDB table | `synapse-cohort-patterns` |
| S3 bucket | `synapse-code-snapshots-{your-account-id}` |
| SNS topic | `synapse-at-risk-alerts` |

### Save the Outputs

At the end, SAM prints a table of **Outputs**. Copy these — you need them for Step 4:

```
Key                   | Value
AtRiskAlertsTopicArn  | arn:aws:sns:ap-south-1:XXXXXXXXXXXX:synapse-at-risk-alerts
CodeSnapshotsBucketName | synapse-code-snapshots-XXXXXXXXXXXX
ApiUrl                | https://xxxxxxxxxx.execute-api.ap-south-1.amazonaws.com/prod
```

---

## Step 4 — Add environment variables to Railway

Go to **Railway → synapse-backend → Variables** and add:

| Variable | Value |
|---|---|
| `AWS_REGION` | `ap-south-1` |
| `AWS_ACCESS_KEY_ID` | your IAM key |
| `AWS_SECRET_ACCESS_KEY` | your IAM secret |
| `SNAPSHOTS_BUCKET` | `synapse-code-snapshots-XXXXXXXXXXXX` (from SAM output) |
| `ATRISK_TOPIC_ARN` | `arn:aws:sns:ap-south-1:XXXXXXXXXXXX:synapse-at-risk-alerts` (from SAM output) |
| `GROQ_API_KEY` | the Groq API key |

After saving, Railway will **auto-redeploy**. Watch the logs — you should see:

```
╔══════════════════════════════════════════════════╗
║  Synapse Backend · :3001                         ║
║  AWS: DynamoDB · S3 · CloudWatch · SNS           ║
╚══════════════════════════════════════════════════╝

  Region  : ap-south-1
  S3      : synapse-code-snapshots-XXXXXXXXXXXX
  SNS     : arn:aws:sns:...
```

---

## Step 5 — Subscribe instructor email to at-risk alerts

```powershell
curl -X POST https://synapse-backend.up.railway.app/admin/subscribe-alerts `
  -H "Content-Type: application/json" `
  -d '{"email": "vrajvashi24@gmail.com"}'
```

An email from AWS SNS will arrive. **Click "Confirm subscription"** in that email to activate alerts.

---

## Step 6 — Merge `vraj-bug` into `master` and push

Once everything is confirmed working:

```powershell
git checkout master
git merge vraj-bug
git push origin master
```

Railway and Render will auto-deploy from master.

---

## Step 7 — Rebuild & redeploy the frontend

```powershell
cd dashboard-v2
npm install
npm run build
```

Then either:
- **Render** auto-deploys from the `master` push  
- Or manually drag the `dist/` folder into Render's manual deploy

Make sure your `dashboard-v2/.env` (or Render env var) has:
```
VITE_API_URL=https://synapse-backend.up.railway.app
```

---

## What each AWS service does in the app

| Service | What it stores / does |
|---|---|
| **DynamoDB `synapse-classrooms`** | All classrooms created by teachers. Persists across server restarts. |
| **DynamoDB `synapse-debugging-sessions`** | Every debugging session from the VS Code extension |
| **DynamoDB `synapse-user-profiles`** | User accounts (bcrypt-hashed passwords) + quiz results |
| **DynamoDB `synapse-cohort-patterns`** | Pre-computed cohort analytics |
| **S3 `synapse-code-snapshots-*`** | Each code attempt the student wrote during a debug session |
| **SNS `synapse-at-risk-alerts`** | Emails instructor when a student has ≥ 5 failed attempts |
| **CloudWatch `Synapse/Production`** | Metrics: sessions, quiz scores, AI calls, signups, logins |

---

## Smoke test checklist

After deploy, run these to verify everything works:

```powershell
# 1. Health check
curl https://synapse-backend.up.railway.app/cohort/info

# 2. Classrooms
curl https://synapse-backend.up.railway.app/classrooms

# 3. Auth — sign up a new user
curl -X POST https://synapse-backend.up.railway.app/auth/signup `
  -H "Content-Type: application/json" `
  -d '{"name":"Test User","email":"test@test.com","password":"test1234","role":"teacher"}'

# 4. Auth — log in (same from any device)
curl -X POST https://synapse-backend.up.railway.app/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@test.com","password":"test1234"}'
```

All should return `200` with JSON. If any fail, check Railway logs.

---

## Demo accounts (auto-seeded on first start)

| Email | Password | Role |
|---|---|---|
| `teacher@demo.com` | `demo1234` | Teacher |
| `student@demo.com` | `demo1234` | Student |
| `vraj@synapse.dev` | `demo1234` | Teacher |
