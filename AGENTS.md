# EnhanceUs Developer & Agent Guidelines

## 🌟 Permanent Policy: Mandatory Demo-Mode Support for All Features

Every future EnhanceUs feature must work seamlessly for **both genuine users and demo visitors** before it is considered complete. A feature is **not complete** merely because it works for genuine registered users.

---

### 1. Core Rule & Developer Contract
Whenever a new feature or endpoint is added to EnhanceUs, the developer or coding agent must:
1. **Implement Real-User Behavior**:
   - Write standard Mongoose queries and business logic for authenticated real users (`req.user.isDemo === false`).
2. **Add Coherent Fictional Fixtures to Canonical Baseline**:
   - Update `server/src/fixtures/canonicalDemoBaseline.js` with realistic, non-empty fictional records for the new feature.
   - Increment `BASELINE_VERSION` when new state schemas are introduced.
3. **Implement Demo Workspace Sandbox Routing**:
   - Add workspace methods to `server/src/services/demoWorkspaceService.js` to handle reads and writes in the visitor's isolated sandbox.
   - In controllers, branch on `if (req.user?.isDemo && req.user?.workspaceId)` to execute workspace operations.
4. **Enforce Complete Isolation (Zero Leakage)**:
   - Ensure demo mutations NEVER write to production MongoDB collections (`users`, `goals`, `roadmaps`, `circles`, `reviews`, etc.).
   - Ensure demo records are excluded from public discovery, member search, reciprocal matching, and platform analytics (`isDemo: { $ne: true }`).
   - Prevent demo users from matching against genuine registered users.
5. **Safeguard External Side Effects**:
   - Demo actions must NEVER trigger real outbound emails (Plunk, SendGrid, SMTP), invitations, push notifications, or irreversible third-party API mutations.
   - Mark demo feedback, notifications, and messages as simulated (`simulated: true`).
6. **Provide Interactive UI & Rich States**:
   - Provide functional interactions for demo visitors (create, edit, delete, join, complete), never disabled placeholder buttons or static mockups.
   - Include loading, success, error, and empty states.
7. **Automated Verification**:
   - Add test cases covering both real-user execution and demo workspace sandbox isolation.

---

### 2. Feature Inventory & Demo Support Acceptance Checklist

| Application Feature | Route / Endpoint | Real User Support | Demo Mode Support | Baseline Fixture Present | External Side-Effect Guard |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication & Demo Login** | `/api/auth/login`, `/demo-credentials` | ✅ MongoDB Bcrypt | ✅ Isolated Workspace JWT | ✅ Alex Morgan (`demo@enhanceus.org`) | ✅ Blocked from admin & deletion |
| **User Profile & Skills** | `/api/users/profile` | ✅ MongoDB User | ✅ Isolated Workspace | ✅ Full-Stack Skills & Interests | ✅ Zero real profile contamination |
| **Goals & Skill Gaps** | `/api/goals` | ✅ MongoDB Goal & AI Engine | ✅ Isolated Workspace | ✅ AI SaaS Blueprint with gaps | ✅ No real goal creation |
| **Roadmaps & Milestones** | `/api/roadmaps` | ✅ MongoDB Roadmap | ✅ Isolated Workspace | ✅ Full-Stack SaaS Roadmap (3 MS) | ✅ Milestone status updates isolated |
| **AI Learning Coach** | `/api/coach` | ✅ Gemini AI + Fallback | ✅ Isolated Workspace | ✅ Tailored recommendations & advice | ✅ Zero API key requirement for visitors |
| **Reciprocal Skill Matches** | `/api/matches` | ✅ Reciprocal Engine | ✅ Isolated Workspace | ✅ Sarah Chen (97%) & Marcus (89%) | ✅ Isolated from real user pool |
| **Exchange Requests** | `/api/exchanges` | ✅ MongoDB Requests | ✅ Isolated Workspace | ✅ Pre-connected peer requests | ✅ No real notification dispatch |
| **Learning Circles** | `/api/circles` | ✅ MongoDB Circle | ✅ Isolated Workspace | ✅ Full-Stack Builders & UI/UX Lab | ✅ Excluded from public directory |
| **Circle Discussions** | `/api/circles/:id/posts` | ✅ MongoDB CirclePost | ✅ Isolated Workspace | ✅ Sample announcements & threads | ✅ Contained to workspace |
| **Exchange Sessions** | `/api/sessions` | ✅ MongoDB Session | ✅ Isolated Workspace | ✅ 1 Completed, 1 Scheduled | ✅ No real calendar/meeting dispatch |
| **Messages & Conversations**| `/api/conversations` | ✅ MongoDB Conversation | ✅ Isolated Workspace | ✅ Active thread with Sarah Chen | ✅ Zero real chat delivery |
| **In-App Notifications** | `/api/notifications` | ✅ MongoDB Notification | ✅ Isolated Workspace | ✅ Review alerts & reminders | ✅ Zero external notification leakage |
| **Proof-of-Skill Portfolio** | `/api/portfolio` | ✅ MongoDB PortfolioItem | ✅ Isolated Workspace | ✅ Exchange-confirmed & evidence items | ✅ No false claims outside workspace |
| **Trust & Contribution Profile**| `/api/trust` | ✅ Auditable Trust Metrics | ✅ Isolated Workspace | ✅ 100% attendance, 5.0 score | ✅ Cannot contaminate platform stats |
| **Community Skill Insights** | `/api/insights` | ✅ Privacy Engine (N>=3) | ✅ Isolated Workspace | ✅ High-demand Docker/UX insights | ✅ Excludes demo data from real trends |
| **Platform Feedback** | `/api/feedback` | ✅ MongoDB + Plunk Email | ✅ Isolated Workspace | ✅ Simulated feedback storage | ✅ Live email delivery safely bypassed |
| **Workspace Reset** | `/api/demo/reset` | N/A (Demo Only) | ✅ Idempotent Restoration | ✅ Canonical Baseline Restored | ✅ Only caller's workspace affected |

---

### 3. Architecture Guidelines

#### A. Workspace Identity
- The server generates `workspaceId = 'ws_' + crypto.randomBytes(16).toString('hex')` on demo login.
- The `workspaceId` is encoded into the signed JWT token.
- `authMiddleware` extracts and validates `req.user.workspaceId` directly from the verified token. Never trust an arbitrary client-supplied workspace ID.

#### B. Storage & Lifecycle
- Isolated demo workspaces are persisted in the `DemoWorkspace` MongoDB collection with a native 24-hour TTL index (`expires: 86400`).
- If MongoDB is disconnected (e.g. offline unit testing), `demoWorkspaceService` falls back to `mockWorkspacesMap`.

#### C. Reset Safety
- `POST /api/demo/reset` requires `{ confirm: true }`.
- Restoring a workspace replaces `workspace.data` with `getCanonicalBaseline()`.
- Baseline objects in `canonicalDemoBaseline.js` are strictly immutable; deep copies are created via `getCanonicalBaseline()`.
