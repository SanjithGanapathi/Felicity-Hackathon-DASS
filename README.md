# Felicity Event Management System

MERN-based event platform for participants, organizers, and admin with role-based authentication, event lifecycle management, team workflows, merchandise workflows, and deployment on Vercel + Render.

## 1. Tech Stack and Library Justification

### Backend (`backend/package.json`)

| Library / Module | Why it was chosen |
|---|---|
| `express` | Lightweight REST API framework with clear middleware flow for auth/role-based APIs. |
| `mongoose` | Schema-driven MongoDB modeling, validation, indexing, and relation population support. |
| `bcrypt` | Secure password hashing for participant/organizer/admin credentials. |
| `jsonwebtoken` | Stateless JWT auth for session validation and role-aware protected routes. |
| `cookie-parser` | Reads auth token cookie cleanly for middleware-based authentication. |
| `cors` | Controlled cross-origin access between deployed frontend and backend domains. |
| `dotenv` | Environment-based config management (secrets, DB URI, CORS origins). |
| `nodemon` (dev) | Faster backend development with auto restart on file changes. |

### Frontend (`frontend/package.json`)

| Library / Module | Why it was chosen |
|---|---|
| `react` + `react-dom` | Component-driven UI and state updates with predictable rendering. |
| `react-router-dom` | Client-side routing with role-protected page navigation. |
| `axios` | Consistent API client with centralized base URL and cookie support. |
| `@radix-ui/*` | Accessible low-level primitives for minimal but robust UI. |
| `tailwindcss` + `tailwindcss-animate` | Utility-first styling with minimal custom CSS overhead. |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Maintainable component variants and safe class composition. |
| `lucide-react` | Lightweight icon set for action and status clarity. |
| `vite` + `@vitejs/plugin-react` | Fast local dev server and production build pipeline. |
| `eslint` + React ESLint plugins | Basic linting and consistency checks during development. |

### External service integrations used in code

- MongoDB Atlas for managed database hosting.
- Render for backend deployment.
- Vercel for frontend deployment.
- QR generation via `api.qrserver.com` URL-based QR image generation.
- Discord webhook integration for organizer event announcements.

## 2. Advanced Features (Tier-wise) with Justification and Design

## Tier A Features Implemented

### A1. Hackathon Team Registration

**Why selected:** High workflow complexity with invite state management and completion constraints.

**Design approach:**
- Added team registration model with leader, invite code, member invite states, and team status.
- Leader creates team with size and invite emails.
- Members join using invite code; invite can be rejected.
- Team is finalized only when required accepted count is reached and invites are settled.
- On finalization, individual participant registrations are generated automatically for all accepted members with ticket + QR.

**Key technical decisions:**
- Separate `TeamRegistration` model for modularity and minimal changes to normal registration flow.
- Atomic completion update pattern to avoid duplicate finalization in concurrent requests.
- Event capacity check performed at finalization time.

### A2. Merchandise Payment Approval Workflow

**Why selected:** Integrates business states, stock integrity, and organizer review workflow.

**Design approach:**
- Participant creates merchandise order and submits payment proof URL.
- Order enters pending approval state.
- Organizer reviews pending orders per event and approves/rejects with comments.
- On approval: stock is decremented, registration/ticket is ensured, QR + confirmation email flow is triggered.

**Key technical decisions:**
- Separate `MerchOrder` model to keep purchase state independent from event registrations.
- Approval-time stock decrement to avoid inconsistent stock in pending/rejected states.
- Validation against event item/variant configuration before approval.

## Tier B Features Implemented

### B2. Organizer Password Reset Workflow

**Why selected:** Directly supports organizer-admin governance workflow required by assignment.

**Design approach:**
- Organizer can submit reset request with reason.
- Admin can list requests with status filters and review each request.
- Admin approves/rejects with comments.
- On approval, system generates a new password and updates organizer account hash.
- Request history is preserved with status transitions.

**Key technical decisions:**
- Dedicated `OrganizerPasswordResetRequest` model for auditability.
- Service-level validation for duplicate pending requests.
- Status-driven flow (`pending`, `approved`, `rejected`) to prevent invalid transitions.

Status note:
- This repository currently documents one Tier-B implementation (`B2`).
- For strict rubric compliance requiring 2 Tier-B features, one additional Tier-B feature (`B1` or `B3`) must be implemented.

## Tier C Feature Implemented

### C2. Add to Calendar Integration

**Why selected:** Minimal and modular enhancement with practical participant value.

**Design approach:**
- Added `.ics` file generation utility for universal calendar import.
- Added Google Calendar and Outlook deep links.
- Participant dashboard/event flow exposes calendar export actions for registered events.

**Key technical decisions:**
- Calendar logic isolated in frontend utility module to keep page components lean.
- Event date validation enforced before link/file generation.

## 3. Core Functional Coverage (Part-1)

- Role-based auth and protected routing for participant, organizer, admin.
- Participant onboarding and editable profile preferences.
- Event browse with filters, search, fuzzy matching, and trending endpoint.
- Event detail validation for deadline/capacity and registration workflows.
- Participant dashboard with event records and history tabs.
- Organizer event creation (draft/published), editing, profile management, analytics, CSV export.
- Admin organizer creation/listing/delete/disable and dashboard summary.

## 4. Local Setup and Installation

## Prerequisites

- Node.js 20+ (22 used in deployment)
- npm
- MongoDB Atlas connection string

## Clone

```bash
git clone <your-repo-url>
cd <repo-folder>
```

## Backend setup

```bash
cd backend
npm install
```

Create `backend/.env` with:

```env
PORT=5000
MONGO_URI=<mongo-atlas-uri>
JWT_SECRET=<strong-secret>
ADMIN_EMAIL=<admin-email>
ADMIN_PASSWORD=<admin-password>
MONGO_DBUSER_PASSWORD=<if-used-in-your-uri-template>
ALLOWED_ORIGINS=http://localhost:5173,https://*.vercel.app
NODE_ENV=development
MAIL_WEBHOOK_URL=<optional>
```

Run backend:

```bash
npm run dev
```

## Frontend setup

```bash
cd ../frontend
npm install
```

Create `frontend/.env` with:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Run frontend:

```bash
npm run dev
```

## 5. Deployment

See root-level `deployment.txt` for evaluation links.

Current deployment targets:
- Frontend (Vercel): `https://felicity-dass-orpin.vercel.app/`
- Backend (Render): `https://felicity-hackathon-dass.onrender.com/`

Notes:
- Backend root URL may show `Cannot GET /` (expected for API-only service).
- Frontend uses `frontend/vercel.json` rewrite for SPA routes.

## 6. Project Structure (High-level)

```text
backend/
  src/
    controllers/
    services/
    models/
    routes/
    middlewares/
    config/
frontend/
  src/
    pages/
    features/
    components/
    lib/
deployment.txt
README.md
```
