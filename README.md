# EnhanceUs — Goal-Driven Skill Exchange Platform

EnhanceUs is a goal-driven skill exchange platform built with the MERN stack. Unlike generic skill-swap applications, EnhanceUs connects users based on specific, actionable goal blueprints.

---

## 🎯 Core Architecture & USP

```
USER
  ↓
DEFINE GOAL (Natural Language Blueprint)
  ↓
GOAL ANALYSIS ENGINE (Required Skills Extraction)
  ↓
SKILL GAP MATRIX (Required vs. User Skills)
  ↓
RECIPROCAL MATCHING ENGINE (0-100% Weighted Compatibility Score)
  ↓
EXCHANGE REQUEST → CONNECTION → MESSAGING → SESSION SCHEDULING → REVIEW & REPUTATION
```

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
  - Unauthenticated visitors on `/` see only public navigation (Logo, How It Works, Features, About, Login, Get Started). Authenticated links (Dashboard, Goals, Matches, Messages, Sessions, Search, Notifications) are omitted.
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
│   │   │   ├── goals/          # GoalCreateModal
│   │   │   └── profile/        # ProfileEditModal
│   │   ├── context/            # AuthContext
│   │   ├── hooks/              # useHealth
│   │   ├── pages/              # Home, Login, Register, Dashboard, Profile, Goals, GoalDetail, Matches, MatchDetail, Messages, Sessions, Notifications, Search, Settings, 404
│   │   ├── routes/             # AppRoutes, ProtectedRoute, PublicOnlyRoute
│   │   └── services/           # apiClient, authService, goalService, matchingService, exchangeService, conversationService, sessionService, reviewService, notificationService, searchService, userService
│   ├── .env.example
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/             # db connection, env settings
│   │   ├── controllers/        # authController, goalController, matchController, exchangeController, conversationController, sessionController, reviewController, notificationController, searchController, userController
│   │   ├── middleware/         # authMiddleware, errorMiddleware
│   │   ├── models/             # User, Goal, Match, ExchangeRequest, Connection, Conversation, Message, Session, Review, Notification schemas
│   │   ├── routes/             # Central route registry
│   │   ├── services/           # goalService, matchingService, demoProvisioningService, etc.
│   │   ├── tests/              # securityAndIsolation.test.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## ⚙️ Environment Variables

### Server (`server/.env`)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/enhanceus
JWT_SECRET=replace_with_a_secure_random_64_character_string_in_production
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
DEMO_USER_EMAIL=demo@enhanceus.org
DEMO_USER_PASSWORD=DemoPassword123!
MOCK_DB=false
```

### Client (`client/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=EnhanceUs
```

---

## 🧪 Testing & Building

### Run Security & Multi-Tenant Isolation Test Suite
```bash
cd server
npm run test
```
*Executes automated checks for User Registration, Multi-tenant Goal Isolation, Mass-Assignment Protection, Public Profile Sanitization, Onboarding Completion, Zero Demo Data Leakage, and Demo Account Endpoint.*

### Production Build
```bash
cd client
npm run build
```

---

## 📋 Production-Readiness Checklist

- [x] Backend server ownership checks on all private resources
- [x] Protected field assignment guard (role, isDemo, reputation)
- [x] Zero hardcoded demo data in normal user accounts
- [x] Dedicated demo account (`demo@enhanceus.org`) with idempotent provisioning
- [x] Public vs Authenticated navigation separation in Navbar
- [x] Route redirection guards for authenticated & unauthenticated visitors
- [x] Interactive 7-step onboarding tour with server persistence
- [x] Public profile response sanitization (`-password -email`)
- [x] Clean empty states for brand new accounts
- [x] 100% Passing automated test suite for security & isolation
- [x] Production build validation passed
