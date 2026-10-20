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
| `POST` | `/api/roadmaps/:id/analyze-dependencies` | Analyze skill prerequisites & calculate topological learning order (V2.2) | Yes (JWT/Cookie) | Yes (`aiRateLimiter`) |
| `POST` | `/api/roadmaps/:id/prerequisites` | Alias for on-demand dependency analysis | Yes (JWT/Cookie) | Yes (`aiRateLimiter`) |

---

## 🧠 EnhanceUs V2.2 — Prerequisite-Aware Learning Order & Dependency Engine

EnhanceUs V2.2 transforms the learning roadmap from a static list of competencies into an **intelligent, prerequisite-aware execution plan**. It discovers technical dependencies between skills, personalizes the plan against the user's verified background, and deterministically computes an optimal learning order.

### Core Features & Architecture

1. **Intelligent Prerequisite Detection**:
   - Analyzes roadmap competencies and stage hierarchies using Google Gemini AI to identify natural pedagogical and technical dependencies.
   - Categorizes prerequisite relationships into:
     - `REQUIRED`: Essential foundational skill that must be mastered before dependent skills can be learned effectively.
     - `RECOMMENDED`: Foundational context that accelerates mastery but is non-blocking.
     - `OPTIONAL_RELATED`: Tangential conceptual links.
   - Built-in deterministic fallback engine automatically triggers if Gemini is unavailable, rate-limited, or times out.

2. **Deterministic Graph Validation & Cycle Elimination**:
   - **Canonical Normalization**: Standardizes skill names against the authenticated roadmap document.
   - **Self-Dependency Removal**: Rejects self-referential edges (`fromSkill === toSkill`).
   - **External Skill Rejection**: Silently discards edges referencing competencies outside the current roadmap.
   - **Duplicate Edge Resolution**: Collapses duplicate edges and preserves the strictest dependency type (`REQUIRED` > `RECOMMENDED` > `OPTIONAL_RELATED`).
   - **DFS Cycle Detection**: Implements 3-state graph coloring (`0=unvisited`, `1=visiting`, `2=visited`) to identify directed circular dependencies (e.g. `A -> B -> C -> A`). Safely prunes cycle-forming edges before computing order.

3. **Deterministic Topological Sorting (Kahn's Algorithm)**:
   - Computes in-degrees for all required prerequisite dependencies.
   - Evaluates skills wave-by-wave with multi-attribute deterministic tie-breaking:
     1. Possessed skills (verified in user profile) scheduled first.
     2. Priority weight (`high` > `medium` > `low`).
     3. Canonical alphabetical ordering for 100% reproducibility.
   - Identifies parallel learning waves (skills with no mutual blocking dependencies).

4. **Profile-Aware Personalization**:
   - Compares required prerequisites with the authenticated user's actual profile skills.
   - Classifies each roadmap step into clear pedagogical states:
     - `READY`: All required foundational prerequisites are satisfied. Ready for active practice today.
     - `BLOCKED`: One or more required prerequisites are incomplete. The step explicitly enumerates unmet dependencies.
     - `SATISFIED`: Skill is already mastered based on verified profile competencies. Does not count as an unfinished task.
   - Highlights **Parallel Opportunities**: identifies groups of skills that can be studied concurrently.

5. **Backward Compatibility & On-Demand Upgrades**:
   - Existing V2.1 roadmaps retain their original data (`roadmapSchemaVersion: "2.1"`, `dependencyAnalysisStatus: "NOT_ANALYZED"`).
   - Detail view provides a single-click upgrade action: **"Analyze Skill Prerequisites & Learning Order"**.
   - Upon execution, roadmaps upgrade smoothly to version `2.2` and persist validated dependency edges and sequence indices.
   - **Recalculate Learning Order**: Allows on-demand re-sorting when a user acquires new skills or updates their profile.

### V2.2 Test Suite Execution
- **Unit Tests**: `npm run test:engine` (13 isolated unit tests for Kahn's algorithm, cycle detection, edge deduplication, parallel waves, profile personalization, and deterministic reproducibility).
- **Integration Tests**: `npm run test:prereq` (24 full-stack integration tests for authentication, multi-tenant isolation, on-demand analysis, topological ordering, and MongoDB persistence).
- **Full Platform Suite**: `npm run test:all` (All platform unit, security, roadmap, session, review, and dependency test suites).

### Environment Configuration
- Reuses existing `GEMINI_API_KEY` and optional `GEMINI_MODEL` (e.g., `gemini-1.5-flash`).
- **No new environment variables are required.**

### Known Limitations
- Gemini proposes plausible prerequisite relationships based on technical domain context, but dependencies are advisory. The system combines AI suggestions with strict deterministic validation. Users are encouraged to inspect dependency rationales and schedule peer exchange sessions on EnhanceUs for personalized guidance.


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

---

## 🗑️ Feature: Permanent Account Deletion (GDPR & Privacy Compliance)

EnhanceUs provides a comprehensive, irreversible, permanent account deletion workflow conforming to strict multi-tenant isolation, referential integrity, and data minimization standards.

### Deletion Workflow & Guardrails
1. **Authenticated Access Only**: Only authenticated users can access the Account Settings Danger Zone. The identity to delete is strictly derived from server-side JWT authentication (`req.user._id`), never client payloads.
2. **Double Confirmation Protection**:
   - **Reauthentication**: The user must provide their valid current account password.
   - **Deliberate Confirmation Phrase**: The user must type the exact case-sensitive word `DELETE`.
3. **Cascading Referential Cleanup**:
   - **Private Records**: Complete permanent deletion of the user's account (`User`), goals (`Goal`), AI learning roadmaps (`Roadmap`), algorithmic matches (`Match`), and notifications (`Notification`).
   - **Shared Records & Connections**:
     - `ExchangeRequest`: Outgoing and incoming exchange requests involving the user are removed.
     - `Connection`: Active peer connections involving the user are cleaned up.
     - `Conversation` & `Message`: Message threads where the user was a participant are deleted; if a thread contains another active learner, personal identifiers are scrubbed.
     - `Session`: Scheduled exchange sessions are removed or updated to cancelled status.
     - `Review`: Reviews authored by the deleted user are purged; aggregate peer reputation calculations are preserved.
4. **Token Invalidation & Session Termination**:
   - The user's active JWT cookie is immediately cleared (`res.clearCookie('enhanceus_auth_token')`).
   - An in-memory revocation cache (`mockDeletedUsersSet`) blocks any in-flight tokens from accessing protected endpoints post-deletion.
   - Client-side `AuthContext` clears all local storage tokens and redirects the user to the landing page with a confirmation banner.
5. **Demo Account Protection**: The showcase demo account (`demo@enhanceus.org`) is protected against permanent deletion with a `403 Forbidden` response.

### Data Retention & Operational Limitations Notice
- **Backups**: Data removed from the active database will naturally age out of rolling point-in-time database backups according to standard operational retention schedules (typically 14–30 days).
- **Legitimate Retention**: System server logs containing anonymized HTTP status codes and timestamps are retained for legitimate security and abuse monitoring purposes. No plaintext credentials or sensitive personal information are ever written to server logs.

---

## 🌗 Feature: Complete Dark Mode & Light Mode Theme System

EnhanceUs incorporates an accessible, unified theme management system providing high-contrast dark and light modes with system preference synchronization.

### Key Capabilities
1. **Three Theme Modes**:
   - `light`: Clean, high-legibility slate & teal interface optimized for daytime usage.
   - `dark`: Sleek deep slate (`#0B0F17` / `#0F172A`) palette with vibrant teal accents and high WCAG contrast.
   - `system`: Dynamically mirrors the operating system's color scheme (`prefers-color-scheme: dark`) in real-time.
2. **Zero-Flash Initialization (Anti-FOUC)**: An inline script in `index.html` inspects `localStorage` and media queries prior to React DOM mounting, preventing white flashes on page reload.
3. **Predictable Persistence**: The user's choice is saved in `localStorage` under the key `enhanceus_theme` and persists across browser refreshes and navigation transitions.
4. **Universal Coverage**: Dark mode tokens apply across all public routes, authenticated dashboards, goal matrices, AI roadmaps, chat interfaces, settings modals, forms, and custom scrollbars.
5. **Accessible Toggle**: Available in both desktop and mobile navigation menus with accessible ARIA tags and clear visual indicators.

---

---

## 📬 Feature: Platform Feedback System & Email Delivery

EnhanceUs provides a dedicated, accessible user feedback workflow accessible from the application footer across both public and authenticated views.

### Key Capabilities
1. **Footer Integration**: A visible "Feedback" trigger button in the footer opens an accessible modal dialog with smooth animations.
2. **Standardized Feedback Fields**:
   - **Rating Scale**: Required 1–5 star rating with accessible labels (Poor, Fair, Good, Very Good, Excellent).
   - **Improvements & Suggestions**: Optional multi-line textarea with a 1,000-character limit and live character count.
   - **Feature Requests**: Optional multi-line textarea with a 1,000-character limit and live character count.
   - **Additional Comments**: Optional open comments textarea with a 1,000-character limit.
3. **Honest Delivery Guarantees**:
   - The UI displays the exact confirmation banner: `Feedback submitted. Thank you!` only when the backend confirms valid acceptance and delivery.
   - If SMTP credentials are missing, unconfigured, or delivery fails, the backend returns an honest HTTP 503/500 and the frontend displays a clear failure message allowing retry. Fake success banners are never shown.
4. **Backend Security & Anti-Abuse**:
   - Server-side sliding-window rate limiter: Maximum 5 feedback submissions per 10 minutes per IP/client.
   - Strict input validation: Rating must be an integer between 1 and 5; text fields cannot exceed 1,000 characters.
   - Payload sanitization: All incoming HTML tags and control sequences are stripped before email formatting to prevent email injection attacks.
   - Public & Authenticated Access: Public visitors can submit feedback without logging in; authenticated users automatically have their name and email appended for context.
   - Zero-Credential Leakage: Feedback recipient addresses and SMTP credentials are kept strictly server-side and never exposed to the client.

### Feedback API Endpoint
| Method | Route | Description | Auth Required | Rate Limited |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/feedback` | Validate and deliver feedback to platform owner's Gmail | Optional (Public & Auth) | Yes (`feedbackRateLimiter`: 5 per 10m) |

---

## 🧭 Feature: Navigation Cleanup & Top-Right Profile Dropdown

To reduce desktop and mobile navbar clutter, user account actions have been centralized into a top-right profile dropdown menu:

1. **Clean Primary Desktop Bar**:
   - Displays primary workflow links: `Dashboard`, `Goals`, `Roadmaps`, `Matches`, `Messages`, `Sessions`, and `Search`.
   - Separate standalone `Settings`, `Profile`, and `Logout` links have been removed from the main navbar.
2. **Profile Dropdown Trigger**:
   - Shows user's avatar initial and actual authenticated display name (with graceful fallback to `Account`).
   - Includes animated chevron indicator with active/focus/hover states.
   - Keyboard accessible: Closes automatically on `Escape` key and outside clicks.
3. **Dropdown Menu Actions**:
   - User identity header with full name, email, and demo mode indicator.
   - **Profile**: Direct navigation to `/profile`.
   - **Settings**: Direct navigation to `/settings` (appearance, preferences, and permanent account deletion).
   - **Log Out**: Opens the Logout Confirmation Modal.
4. **Session Termination Confirmation**:
   - Selecting "Log Out" triggers a dedicated modal asking the user to confirm ending their session.
   - **Cancel**: Dismisses the modal immediately without altering session state or logging out.
   - **Confirm Logout**: Calls the backend session invalidation endpoint, removes client-side auth tokens, clears private state, and safely redirects to `/login`.
   - Accessible via both the desktop profile dropdown and the mobile slide-down drawer.

---

## 🧪 Testing & Verification

### Run the Feedback Integration Test Suite
```bash
cd server
npm run test:feedback
```
*Executes 6 automated checks:*
- *Rejects submission missing required rating (400)*
- *Rejects invalid rating bounds (<1 or >5) (400)*
- *Rejects text payloads exceeding 1,000 characters (400)*
- *Accepts valid public feedback submission with delivery confirmation (200)*
- *Accepts authenticated feedback submission and captures sender context (200)*
- *Rate limiting: 429 Too Many Requests triggered when threshold exceeded*

### Run the Account Deletion Test Suite
```bash
cd server
npm run test:account
```

### Run the Gemini AI Integration Test Suite
```bash
cd server
npm run test:gemini
```

### Run the Roadmap Integration Test Suite (V2.1)
```bash
cd server
npm run test:roadmap
```

### Run All Backend Test Suites
```bash
cd server
npm run test:all
```
*Executes all 64 automated unit and integration tests across 5 test suites:*
- *11 tests: Security & Multi-Tenant Data Isolation*
- *13 tests: Google Gemini AI Goal Decomposition*
- *21 tests: V2.1 AI-Powered Learning Roadmaps*
- *13 tests: Permanent Account Deletion & Cascading Purge*
- *6 tests: Platform Feedback Delivery & Rate Limiting*

### Production Client Build
```bash
cd client
npm run build
```

---

## ⚙️ Environment Variables Reference

Configure these environment variables in your server hosting environment (Render, Railway, or VPS). **Never commit actual secrets or `.env` files to Git.**

### Server Environment Variables (`server/.env`)
| Variable | Description | Example / Format |
| :--- | :--- | :--- |
| `PORT` | Node.js HTTP server port | `5000` |
| `NODE_ENV` | Runtime environment mode | `development` or `production` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for signing authentication tokens | 32+ character random string |
| `CLIENT_URL` | Frontend origin for CORS and cookies | `http://localhost:5173` or `https://enhanceus.vercel.app` |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `FEEDBACK_TO_EMAIL` | Platform owner Gmail inbox to receive feedback | `your_gmail@gmail.com` |
| `SMTP_USER` | Authorized Gmail account sending feedback emails | `your_sender_gmail@gmail.com` |
| `SMTP_PASS` | Google 16-character App Password (not personal password) | `xxxx xxxx xxxx xxxx` |
| `SMTP_HOST` | SMTP server host (defaults to smtp.gmail.com) | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port (defaults to 465 SSL or 587 TLS) | `465` |

---

## 🚦 Known Limitations & Troubleshooting

1. **Gmail App Password Setup**:
   - For feedback delivery to work with Gmail, you must enable 2-Step Verification in Google Account Settings, generate a 16-character **App Password** under "Security > 2-Step Verification > App Passwords", and supply it in `SMTP_PASS`.
2. **Gemini Free-Tier Rate Limits (429)**:
   - If multiple users generate goals concurrently, Google may return a 429 quota error. EnhanceUs catches this cleanly and displays a friendly error with a "Retry Analysis" button while preserving user text.
3. **Cold Starts on Render Free Tier**:
   - The first request to Render after 15 minutes of inactivity may take ~30–45s while the server spins up.
4. **No API Key Fallback**:
   - If `GEMINI_API_KEY` is not provided, EnhanceUs seamlessly uses its rule-based keyword taxonomy engine so the platform remains fully functional.

