# Felicity Event Management System

## Libraries and Frameworks

### Backend

- **express** — Lightweight REST API framework; chosen for its middleware architecture which cleanly supports JWT auth and role-based access control
- **mongoose** — MongoDB ODM with schema validation; provides structured data modeling, population of references, and index management for performance
- **bcrypt** — Industry-standard password hashing with salt; prevents plaintext password storage as required by security constraints
- **jsonwebtoken** — Stateless JWT-based authentication; generates signed tokens for session management across frontend and backend
- **cookie-parser** — Parses auth cookies from incoming requests; enables httpOnly cookie-based token storage for security
- **cors** — Handles cross-origin requests between separate frontend and backend deployments (Vercel and Render)
- **dotenv** — Loads environment variables from .env files; keeps secrets (JWT_SECRET, MONGO_URI) out of source code
- **nodemon** (dev) — Auto-restarts server on file changes for faster development iteration

### Frontend

- **react** + **react-dom** — Component-based UI library; chosen for declarative rendering, hooks-based state management, and large ecosystem
- **react-router-dom** — Client-side routing with hash-based navigation; supports role-protected routes via wrapper components
- **axios** — HTTP client with centralized configuration; provides interceptors, cookie support (withCredentials), and cleaner API than fetch
- **@radix-ui/\*** — Accessible UI primitives (dialog, checkbox, select, tabs, toast); chosen over Material-UI for smaller bundle size and headless flexibility
- **shadcn/ui** — Pre-built component library on top of Radix UI and Tailwind CSS; provides polished, accessible components (Button, Card, Input, Label, Tabs, Toast) with full customization via source code ownership rather than opaque npm packages
- **tailwindcss** + **tailwindcss-animate** — Utility-first CSS framework; chosen for rapid styling without writing custom CSS files, consistent design tokens, and responsive utilities
- **class-variance-authority** + **clsx** + **tailwind-merge** — Component variant management and class composition; enables reusable styled components with conditional styling

- **vite** + **@vitejs/plugin-react** — Fast build tool with HMR; chosen over Create React App for significantly faster dev server and production builds

### External Services

- **MongoDB Atlas** — Managed cloud database hosting
- **Render** — Backend deployment with environment variable management
- **Vercel** — Frontend deployment with SPA routing support
- **api.qrserver.com** — QR code generation for event tickets

## Advanced Features Implemented

### Tier A — Core Enhancements (2 chosen)

- **A1. Hackathon Team Registration**
  - Team leader creates a team with a unique auto-generated invite code
  - Leader specifies team size and sends invites to member emails
  - Members join by entering the invite code; can also reject invites
  - Team auto-finalizes when accepted members reach team size
  - On completion, individual registrations with unique ticket IDs and QR codes are generated for each member
  - Custom registration form fields (via form builder) are supported for team events — the leader fills the form during team creation and responses propagate to all member registrations
  - Design choice: used a separate TeamRegistration model with embedded member and invite sub-documents rather than extending the Registration model, to keep individual and team workflows cleanly separated

- **A2. Merchandise Payment Approval Workflow**
  - Participant places an order for merchandise items with quantity and variant selection
  - Participant submits a payment proof URL after placing the order
  - Organizer reviews orders: can approve (decrements stock, generates ticket) or reject (with comment)
  - Design choice: used a status state machine (pending_proof → pending_approval → approved/rejected) to enforce the correct approval sequence

### Tier B — Collaboration & Functionality (1 chosen)

- **B2. Organizer Password Reset Workflow**
  - Organizer submits a reset request with a reason through their dashboard
  - Admin views pending requests, can approve (system auto-generates new password) or reject (requires comment)
  - Design choice: implemented as a separate OrganizerPasswordResetRequest model to maintain audit trail of all requests

### Tier C — Integration Features (1 chosen)

- **C1. Add to Calendar Integration**
  - `.ics` file download for any registered event
  - Google Calendar deep link generation
  - Outlook Calendar deep link generation
  - Available on the participant dashboard for each registered event

## Setup Instructions

### Prerequisites

- Node.js 20+
- npm
- MongoDB Atlas connection string (or local MongoDB)

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```
PORT=5000
MONGO_URI=<your-mongodb-uri>
JWT_SECRET=<your-jwt-secret>
ADMIN_EMAIL=<admin-email>
ADMIN_PASSWORD=<admin-password>
ALLOWED_ORIGINS=http://localhost:5173
NODE_ENV=development
```

Start the server:

```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:5000
```

Start the dev server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Deployment

- Frontend: Deployed on Vercel
- Backend: Deployed on Render
- Database: MongoDB Atlas
- See `deployment.txt` for live URLs
