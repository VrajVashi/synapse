  # Synapse — Hackathon Presentation
  **AWS AI for Bharat Hackathon 2024 | Team Determinist**

  ---

  ## Slide 1 — Title

  - **Project:** Synapse
  - **Tagline:** "Learn from your patterns. Fix bugs faster."
  - **Subtitle:** The First Debugging Intelligence Platform for Bootcamps
  - **Hackathon:** AWS AI for Bharat Hackathon 2024
  - **Team:** Determinist

  *Speaker note: Open with energy. Let the tagline land before moving on — it's the whole product in seven words.*

  ---

  ## Slide 2 — Problem Statement

  ### The Debugging Blind Spot in Bootcamps

  - Instructors teach 30–50 students simultaneously — they cannot see who is stuck in real time
  - Students repeat the same bugs across sessions with no feedback loop to break the pattern
  - No tooling exists to surface cohort-wide error trends — instructors fly blind on curriculum gaps
  - Debugging takes up to **60–70% of a student's learning time** at the bootcamp stage
  - Current tools (Stack Overflow, print debugging) are reactive, not adaptive
  - Students have no visibility into their own debugging patterns or growth over time
  - Instructors discover struggling students only at assignment submission — too late to intervene

  *Speaker note: Ground the judges in the real classroom. The core pain is asymmetric information — instructors don't know who needs help until it's too late.*

  ---

  ## Slide 3 — Solution Overview

  ### Synapse: AI-Native Debugging Intelligence

  - **Real-time bug detection** directly inside VS Code — flags common Python error patterns as students type, in under 200ms
  - **Session tracking** — every debugging attempt is recorded, timestamped, and uploaded to the cloud automatically
  - **Adaptive quizzes** — triggered by the specific error type a student just struggled with, reinforcing the right concept at the right moment
  - **Instructor analytics dashboard** — a live command centre showing:
    - Struggle heatmaps across the cohort
    - At-risk student detection
    - Concept mastery tracking
    - AI-generated curriculum insights
  - **Debugging DNA** — a per-student profile revealing whether they debug systematically or by trial-and-error
  - **Session replay** — instructors and students can replay the exact sequence of code changes during a debugging session

  *Speaker note: Position Synapse as three products in one: a student tool, a teacher tool, and a data platform. Each piece feeds the others.*

  ---

  ## Slide 4 — How It Works

  ### End-to-End Data Flow

  1. **Student opens a `.py` file** in VS Code → Synapse extension activates automatically
  2. **File saved** → Tier 1+2 local regex analysis runs instantly (**<200ms**, zero network cost)
  3. **Pattern matched?** → Diagnostic warning shown inline in the editor + sidebar panel updates
  4. **Complex case?** → Tier 3 escalation to **AWS Bedrock (Claude Haiku)** for deep AI analysis (~10% of checks)
  5. **Results surfaced** in the VS Code sidebar — explanation, fix suggestion, quiz prompt
  6. **Sessions flushed every 30 seconds** → AWS Lambda (`sessionWriter`) receives the payload
  7. **Lambda writes to:**
    - **DynamoDB** — session metadata, error types, attempt counts
    - **S3** — full code snapshot for replay
  8. **Instructor dashboard** (React app) pulls from Lambda endpoints → cohort analytics rendered in real time

  *Speaker note: Emphasise the 3-tier architecture — most checks never leave the machine, keeping latency near zero and cost near nothing. Bedrock is the precision instrument, not the hammer.*

  ---

  ## Slide 5 — Key Features & Differentiators

  ### What Synapse Detects

  | Bug Pattern | Crash Rate | What It Catches |
  |---|---|---|
  | None Handling | **73%** | `.get()` / `.find()` without `None` checks |
  | Missing try/except | **45%** | Unprotected `open()`, `requests.get()`, `json.loads()` |
  | Async/Await Misuse | **58%** | `await` outside `async`, unawaited async calls |
  | List Index Bounds | **34%** | Direct indexing without length validation |

  ### 3-Tier Detection Architecture

  - **Tier 1+2** — Local regex, runs in VS Code process, <200ms, **$0 cost**
  - **Tier 3** — AWS Bedrock Claude Haiku, handles novel/complex patterns, **~$0.0001/request**

  ### Instructor Analytics (No Other Tool Offers This)

  - **Struggle Heatmap** — which error types are crushing which students, ranked by attempt count and crash rate
  - **At-Risk Detection** — automatically flags students whose attempt counts exceed the class average by a threshold
  - **Mastery Tracking** — concept-by-concept mastery % vs curriculum targets, per cohort
  - **Curriculum Insights** — AI-generated recommendations: which concepts need re-teaching, which are gaps, which are on-track

  ### Student-Facing Intelligence

  - **Debugging DNA** — systematic vs trial-and-error classification from session data
  - **Session Replay** — step-by-step code change history for any debugging session
  - **Adaptive Quizzes** — questions generated from the exact error type the student just hit

  *Speaker note: The heatmap and at-risk detection are the demo moments. If you have a live demo, show these two features — they make the value proposition undeniable.*

  ---

  ## Slide 6 — AWS Services Utilised

  ### Full AWS Architecture

  | Service | Role in Synapse |
  |---|---|
  | **AWS Bedrock** (Claude Haiku `4.5`) | Tier 3 AI analysis of complex bug patterns; AI-generated curriculum insights |
  | **AWS Lambda** (SAM, 14 functions) | All backend compute — session ingestion, cohort analytics, quiz handling, AI analysis |
  | **AWS API Gateway** | REST API routing — 15+ endpoints connecting the VS Code extension and dashboard to Lambda |
  | **AWS DynamoDB** (3 tables) | `synapse-debugging-sessions` · `synapse-user-profiles` · `synapse-cohort-patterns` |
  | **AWS S3** | Code snapshot storage for session replay; 90-day lifecycle auto-delete |
  | **AWS CloudWatch** | Lambda monitoring, error logs, performance metrics |
  | **AWS SAM** | Infrastructure as Code — entire backend defined and deployed from `template.yaml` |

  - **Region:** `ap-south-1` (Mumbai) — intentionally localised for Indian bootcamps and the Bharat mandate
  - **Billing model:** PAY_PER_REQUEST on DynamoDB — scales from 1 student to 10,000 with no architecture change
  - **Estimated cost at bootcamp scale:** ~$30/month

  *Speaker note: Judges will look for genuine AWS depth. Walk through the DynamoDB GSI design and the SAM template if time allows — it signals production-grade thinking, not just demo glue.*

  ---

  ## Slide 7 — Market Opportunity

  ### The Indian Edtech & Bootcamp Landscape

  - India has **50,000+ active coding bootcamp students** and the number is growing rapidly post-pandemic
  - The Indian edtech market is projected to reach **$10.4 billion by 2025** (KPMG)
  - Developer education is the fastest-growing segment — yet tooling remains a decade behind
  - **The gap:** Every major IDE, linter, and debugger is built for professional engineers — nothing is designed for learners

  ### Why Now, Why AWS, Why India

  - AWS AI for Bharat directly targets the intersection of AI-native tooling and Indian developer education
  - Rising bootcamp density in Tier 1 and Tier 2 cities creates a concentrated, reachable customer base
  - Instructors at Indian bootcamps manage larger class sizes than Western counterparts — the pain is amplified
  - No Indian-built, AI-native debugging intelligence product exists today

  ### Target Users

  - **Primary:** Bootcamp and coding school instructors (decision-makers, pay the bill)
  - **Secondary:** Bootcamp students (end users, drive adoption and retention)
  - **Tertiary:** Bootcamp operators and curriculum designers

  *Speaker note: Anchor the market size, then pivot to the insight — the gap in developer education tooling is enormous and nobody has filled it from the learner's side.*

  ---

  ## Slide 8 — Business Viability

  ### SaaS Model with Strong Unit Economics

  **Pricing Tiers**

  - **Bootcamp Plan:** Per-seat, per-month pricing (~₹299–₹499/student/month)
  - **Institutional License:** Annual flat-fee for bootcamps with 50+ students — predictable revenue, easier sales
  - **Enterprise Tier:** Custom pricing for large coding schools and university CS departments

  **Unit Economics**

  - AWS infrastructure cost: **~$30/month per cohort of 30–50 students**
  - At ₹399/student/month × 40 students = **~₹16,000/month revenue per cohort**
  - Gross margin: **>90%** at scale — serverless architecture means cost scales only with usage

  **Go-to-Market**

  - Direct partnerships with top Indian bootcamps (Masai School, Newton School, upGrad, Scaler)
  - Offer free pilot semester to first 10 bootcamp partners — convert on results
  - Word-of-mouth through students who carry Synapse skills into their first jobs
  - Open-source the VS Code extension to drive organic adoption; monetise the analytics dashboard

  *Speaker note: The unit economics story is strong — make sure judges hear the margin figure. Serverless + Bedrock's micro-pricing means the cost base stays flat even as students scale.*

  ---

  ## Slide 9 — Future Roadmap & Vision

  ### Phased Expansion

  **Phase 1 — Language Expansion** *(0–6 months)*
  - Extend Tier 1+2 detection to JavaScript, Java, and C++
  - Cover the full bootcamp curriculum stack, not just Python

  **Phase 2 — LMS Integration** *(6–12 months)*
  - Native plugins for Canvas, Moodle, and Google Classroom
  - Sync session data with assignment grades and attendance records
  - Push at-risk alerts directly into instructor workflow tools (Slack, email)

  **Phase 3 — Enterprise Tier** *(12–18 months)*
  - Multi-cohort dashboards for large coding schools managing dozens of batches
  - Custom curriculum mapping and institution-level benchmarking
  - SSO, role-based access, and data residency compliance

  **Phase 4 — Predictive Intelligence** *(18–24 months)*
  - Dropout risk prediction using longitudinal session pattern analysis
  - Personalised learning path recommendations generated by Bedrock
  - Cohort-to-cohort benchmarking across partner institutions

  ### The Long-Term Vision

  - Become the **debugging intelligence layer** for all technical education — globally
  - Every line of learning code, anywhere, generates a signal that makes the next learner faster

  *Speaker note: Keep this slide forward-looking but grounded. Phase 1 and 2 are credible 12-month commitments. Phase 4 is the vision that makes this a platform, not just a tool.*

  ---

  ## Slide 10 — Closing

  ### Team Determinist

  - Built end-to-end: VS Code extension, React dashboard, 14-function serverless backend, Bedrock AI integration
  - Fully deployed on AWS `ap-south-1` — production-ready, not just a prototype
  - Designed from first principles around the real pain of Indian bootcamp classrooms

  ### The Ask

  - Backing, mentorship, and AWS credits to take Synapse into its first 10 bootcamp pilots
  - A chance to make debugging intelligent — for every student who has ever stared at a screen wondering why their code won't work

  ---

  > **"Learn from your patterns. Fix bugs faster."**

  *India is producing millions of developers. They deserve AI-native tools built for how they actually learn — not tools built for engineers who already know the answer. Synapse is that tool, built on AWS, built for Bharat.*

  *Speaker note: End on the mission, not the features. The judges remember the last thing they hear. Make it the human story — a student in Jaipur or Nagpur, late at night, getting unstuck because Synapse caught the pattern before they lost an hour.*

  ---

  *Document prepared for AWS AI for Bharat Hackathon 2024 submission — Team Determinist*
