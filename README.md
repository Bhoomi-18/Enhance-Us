# EnhanceUs — Goal-Driven Skill Exchange Platform

EnhanceUs is a goal-driven skill exchange platform built with the MERN stack and powered by Google Gemini AI. Unlike generic skill-swap applications, EnhanceUs connects users based on specific, actionable goal blueprints and deterministic skill-gap matching.

---

## 🎯 Core Architecture & USP

```
USER
  ↓
DEFINE GOAL (Natural Language Blueprint)
  ↓
GOOGLE GEMINI AI DECOMPOSITION ENGINE
  ├── Goal Interpretation
  ├── Competency Hierarchy (Levels, Categories & Explanations)
  ├── Prerequisite Sequencing & Learning Order
  ├── Milestones & Concrete Deliverables
  └── Effort Estimates & Timeline Recommendations
  ↓
DETERMINISTIC SKILL GAP MATRIX (Required vs. User Profile Skills)
  ├── Known Skills (Verified against profile)
  ├── Partially Mastered Skills (Upgrade needed)
  └── Missing Skills (Target exchange gaps)
  ↓
RECIPROCAL MATCHING ENGINE (0-100% Weighted Compatibility Score)
  ↓
EXCHANGE REQUEST → CONNECTION → MESSAGING → SESSION SCHEDULING → REVIEW & REPUTATION
```

---

## 🤖 Google Gemini AI Integration

EnhanceUs integrates Google's official `@google/genai` SDK on the backend to decompose user goals into actionable technical learning plans.

### Key AI Features
1. **Goal-to-Skill Decomposition (V2.0)**: Transforms natural language descriptions (e.g., *"I want to build and deploy an AI-powered website within two months"*) into 3–7 structured competencies with prerequisite sequencing.
2. **Intelligent Learning Roadmap Generation (V2.1)**: Synthesizes personalized, staged learning roadmaps tailored to a selected goal and the user's real profile skills:
   - **Competency Gap Analysis**: Compares required skills with skills already in the user's profile, distinguishing possessed strengths from skill gaps.
   - **Chronological Learning Stages**: Breaks learning into progressive stages (Stage 1, Stage 2, Stage 3...) with strategic objectives and clear completion criteria.
   - **Qualified Duration & Assumptions**: Provides realistic timeline estimates with explicit uncertainty disclaimers and lists key baseline assumptions.
   - **Skill Exchange Integration**: Every roadmap competency includes a direct link to find peer exchange partners on EnhanceUs.
3. **Beginner-Friendly Explanations**: Provides context for why each skill is needed and what it involves.
4. **Deterministic Gap Classification**: AI proposes the competencies, but the backend deterministically compares them against actual user profile skills. Real user data is never fabricated.
5. **Multi-Tenant Ownership Isolation**: All generated roadmaps are strictly scoped to the authenticated user on the backend. Cross-tenant reads and mutations are denied with safe 404 responses.
6. **Graceful Fallback & Error Handling**: If no Gemini API key is configured or offline development is active, EnhanceUs returns clear, actionable error messages and never fabricates fake success states.

### Gemini Security, Privacy & Safety Architecture
- **Backend-Only Execution**: The Gemini SDK runs strictly on the Node.js backend. `GEMINI_API_KEY` is never exposed to the client bundle or network calls.
- **Prompt Injection Isolation**: User goal descriptions and skills are isolated in `<user_goal>` and `<user_existing_skills>` delimiters. System instructions enforce strict schema output and reject embedded commands or role modifications.
- **Data Minimization**: Only the sanitized goal title/description and profile skill names/levels are sent to Gemini. Passwords, tokens, emails, messages, and unrelated profile data are never transmitted.
- **Sanitization & Stage Validation**: All AI responses are stripped of HTML tags and control characters before rendering or storing. Stage skill references are strictly validated against roadmap competencies.
- **Per-User Sliding-Window Rate Limiting**: The `aiRateLimiter` middleware throttles excessive calls (max 10 requests per 5 minutes per user) to safeguard quota.
- **In-Memory Caching**: Identical requests within 15 minutes are served from cache to avoid redundant API billing.

---

## 🗺️ V2.1 Learning Roadmap Workflow & API Routes

### Generation Workflow
```
[Select Owned Goal]
       ↓
[Fetch Goal & User Profile Skills from DB]
       ↓
[Construct Delimited Passive Context Prompt]
       ↓
[Call Google Gemini AI (@google/genai)]
       ↓
[Validate Structured Output & Verify Stage References]
       ↓
[Persist Roadmap to MongoDB (Scored by req.user._id)]
       ↓
[Render Interactive Detail View with Gap Filters & Mentorship Links]
```

### Roadmap API Endpoints
| Method | Route | Description | Auth Required | Rate Limited |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/roadmaps/generate/:goalId` | Generate & persist AI roadmap for owned goal | Yes (JWT/Cookie) | Yes (`aiRateLimiter`) |
| `GET` | `/api/roadmaps` | List all saved roadmaps for authenticated user | Yes (JWT/Cookie) | No |
| `GET` | `/api/roadmaps/:id` | Fetch single roadmap with goal details (isolated) | Yes (JWT/Cookie) | No |
| `DELETE`| `/api/roadmaps/:id` | Delete owned roadmap | Yes (JWT/Cookie) | No |

---

## 🛠️ Technology Stack

### Frontend
- **React** (v18) with Vite
- **JavaScript (ES6+)**
- **React Router** (v6) with Public & Authenticated Guards
- **Tailwind CSS** (v3) with custom EnhanceUs design tokens & glassmorphism components
- **Axios** with centralized HTTP request/response interceptors
- **Context API** (AuthContext, HealthContext)
- **Lucide React** (Modern iconography)

### Backend
- **Node.js & Express.js**
- **Google Gen AI SDK** (`@google/genai`)
- **MongoDB & Mongoose** (Schemas: User, Goal, Match, ExchangeRequest, Connection, Conversation, Message, Session, Review, Notification)
- **JWT & HTTP-Only Secure Cookie Authentication**
- **bcryptjs** (Salted password hashing)
- **CORS & Morgan** (Middleware & logging)

---

## 🔒 Multi-Tenant Data Isolation & Security Standard

1. **Strict Server-Side Ownership Enforcement**: Server endpoints derive ownership directly from validated JWT / cookie `req.user._id`. Client-supplied user IDs in request bodies are NEVER trusted for authorization.
2. **Field Mass-Assignment Protection**: Sensitive profile fields (`role`, `isDemo`, `reputation`, `onboardingCompletedAt`) are excluded from `updateProfile` mass assignment.
3. **Public Data Boundaries**: Public profile API (`GET /api/users/:id`) scrubs password hashes and email addresses.
4. **Clean New User Accounts**: Newly registered accounts start with 0 hardcoded demo records, 0 fake progress bars, and 0 dummy conversations. Honest empty states are rendered when no user data exists.
5. **Dedicated Isolated Demo Account**:
   - **Credentials**: `demo@enhanceus.org` / `DemoPassword123!`
   - **Isolation**: Demo records exist ONLY for the designated demo account and its isolated demo mentor participant (`sarah.demo@enhanceus.org`).

---

## 🚀 Onboarding & Navigation

- **Auth-Aware Navigation**:
  - Unauthenticated visitors on `/` see only public navigation (Logo, How It Works, Features, About, Login, Get Started).
  - Authenticated users visiting `/`, `/login`, or `/register` are automatically redirected to `/dashboard`.
- **First-Time Signup Onboarding Tour**:
  - Interactive 7-step guided walkthrough covering Goal Creation, Skill Gaps, Reciprocal Matching, Exchange Requests, and Review System.
  - Automatically triggered upon first registration entry (`!user.onboardingCompletedAt`).
  - Persisted to backend MongoDB user document via `POST /api/users/onboarding/complete`.

---

## 📁 Monorepo Folder Structure

```
enhanceus/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # OnboardingTourModal, GoalPipelineVisual, ErrorBoundary
│   │   │   ├── layout/         # Navbar, Footer, PageContainer
│   │   │   ├── ui/             # Button, Card, Input, Badge, Modal, Spinner, Skeleton, EmptyState
│   │   │   ├── goals/          # GoalCreateModal (AI preview & review)
│   │   │   └── profile/        # ProfileEditModal
│   │   ├── context/            # AuthContext
│   │   ├── hooks/              # useHealth
│   │   ├── pages/              # Home, Login, Register, Dashboard, Profile, Goals, GoalDetail (AI Roadmap), Matches, Messages, Sessions, Notifications, Search, Settings, 404
│   │   ├── routes/             # AppRoutes, ProtectedRoute, PublicOnlyRoute
│   │   └── services/           # apiClient, authService, goalService (analyzeGoal), matchingService, sessionService, etc.
│   ├── .env.example
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/             # db connection, env settings
│   │   ├── controllers/        # goalController (analyzeGoalPreview), authController, matchController, etc.
│   │   ├── middleware/         # authMiddleware, aiRateLimiter, errorMiddleware
│   │   ├── models/             # Goal (aiAnalysis schema), User, Match, Session, etc.
│   │   ├── routes/             # goalRoutes (/analyze), authRoutes, etc.
│   │   ├── services/           # geminiGoalAnalysisProvider, goalAnalysisService, skillGapEngine, goalService, etc.
│   │   ├── tests/              # securityAndIsolation.test.js, geminiIntegration.test.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## ⚙️ Environment Variables

### Backend (`server/.env.example`)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/enhanceus
JWT_SECRET=replace_with_a_secure_random_64_character_string_in_production
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
DEMO_USER_EMAIL=demo@enhanceus.org
DEMO_USER_PASSWORD=DemoPassword123!

# Google Gemini AI (Optional - falls back to local rule-based engine if omitted)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash

MOCK_DB=false
```

### Frontend (`client/.env.example`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=EnhanceUs
```

---

## 🔑 How to Obtain and Configure Gemini API Key

### 1. Obtain an API Key from Google AI Studio
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** in the sidebar.
4. Click **Create API key** and copy your generated key string.

### 2. Configure Locally
1. In your local `server/.env` file, add:
   ```env
   GEMINI_API_KEY=your_actual_key_here
   GEMINI_MODEL=gemini-1.5-flash
   ```
2. Restart your backend server (`npm run dev` in `server/`).

### 3. Configure in Render (Production)
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Select your EnhanceUs backend Web Service.
3. Navigate to **Environment** in the left menu.
4. Add the environment variables:
   - `GEMINI_API_KEY`: *(paste your key)*
   - `GEMINI_MODEL`: `gemini-1.5-flash`
5. Click **Save Changes**. Render will automatically redeploy with Gemini enabled.

### 4. Free-Tier Availability & Google Policies
- **Rate Limits**: Google's free-tier for Gemini typically allows 15 RPM (requests per minute) and 1,500 RPD (requests per day). Free tier availability and limits are governed by Google AI Studio policies.
- **Privacy Notice**: Per Google's terms of service, prompts submitted on the free tier may be logged and reviewed by human reviewers to train and improve Google products. Users handling sensitive proprietary data should review Google's paid tier or enterprise API terms.

---

## 🧪 Testing & Verification

### Run the Gemini AI Integration Test Suite
```bash
cd server
npm run test:gemini
```
*Executes automated checks for:*
- *Unauthenticated access blocks (401)*
- *Input length validation (min 10 chars, max 2000 chars)*
- *Structured AI decomposition and roadmap extraction*
- *Deterministic skill gap calculations with actual saved profile skills*
- *Per-user rate limiting (429 Too Many Requests)*
- *Malformed model response and error handling (502)*
- *HTML sanitization and prompt injection defense*
- *Zero secret or key leakage in API responses*
- *Goal persistence and ownership scoping*

### Run the Roadmap Integration Test Suite (V2.1)
```bash
cd server
npm run test:roadmap
```
*Executes automated checks for:*
- *Unauthenticated access blocks on all roadmap routes (401)*
- *Cross-tenant goal access rejection (404/403)*
- *Personalized AI roadmap generation & persistence (201)*
- *Structured schema integrity (duration, assumptions, skills, stages)*
- *Cross-referencing stage skill names against roadmap skills*
- *Multi-tenant isolation on listing, single fetch, and deletion*
- *Malformed Gemini JSON handling (502 ApiError)*
- *HTML tag and script injection sanitization*

### Run All Backend Tests (Security, Gemini & Roadmaps)
```bash
cd server
npm run test:all
```

### Production Client Build
```bash
cd client
npm run build
```

---

## 🚦 Known Limitations & Troubleshooting

1. **Gemini Free-Tier Rate Limits (429)**:
   - If multiple users generate goals concurrently, Google may return a 429 quota error. EnhanceUs catches this cleanly and displays a friendly error with a "Retry Analysis" button while preserving user text.
2. **Cold Starts on Render Free Tier**:
   - The first request to Render after 15 minutes of inactivity may take ~30–45s while the server spins up.
3. **No API Key Fallback**:
   - If `GEMINI_API_KEY` is not provided, EnhanceUs seamlessly uses its rule-based keyword taxonomy engine so the platform remains fully functional.
