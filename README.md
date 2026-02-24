# Felicity Management

Role-based event management platform for IIIT clubs with participant onboarding, organiser workflows, admin controls, merchandise order approvals, attendance tracking, and real-time event forums.

## 1) Project Overview

### Core roles
- **Participant**: signs up, completes onboarding, browses/registers for events, buys merchandise, joins forum, views tickets.
- **Organiser**: manages profile, creates/publishes events, handles participant data, approves/rejects merchandise payments, tracks attendance.
- **Admin**: creates organiser accounts, manages organiser status, handles organiser password reset requests, monitors dashboard stats.

### High-level architecture
- **Frontend**: React + Vite single-page app (role-aware routing, token-based auth, Socket.IO client).
- **Backend**: Express + MongoDB REST API with JWT auth and role-based middleware.
- **Realtime**: Socket.IO channels for event forums.
- **Data**: MongoDB via Mongoose models (`User`, `Participant`, `Organiser`, `Event`, `Registration`, `Ticket`, `ForumMessage`, `PasswordResetRequest`).

---

## 2) Libraries, Frameworks, and Modules (with Justification)

### Frontend runtime dependencies

| Library | Why it was chosen |
|---|---|
| `react-router-dom` | Routing with protected and role-gated routes (`participant`, `organiser`, `admin`). |
| `axios` | Centralized HTTP client with interceptors for automatic JWT header injection. |
| `socket.io-client` | Reliable bi-directional communication for real-time forum updates. |
| `tailwindcss` | Utility-first CSS for fast iteration and consistent design tokens across pages/components. |
| `daisyui` | Prebuilt Tailwind component primitives for quicker, consistent UI composition. |
| `@tailwindcss/vite` | Tight Tailwind + Vite integration for simpler build pipeline and DX. |
| `qrcode` | Generates QR visuals on ticket pages from encoded ticket payloads. |
| `jsqr` | Browser-side QR decoding for attendance scan UI use cases. |

### Frontend development dependencies

| Library | Why it was chosen |
|---|---|
| `vite` + `@vitejs/plugin-react` | faster and leaner development |

### Backend runtime dependencies

| Library | Why it was chosen |
|---|---|
| `express` | Clear REST route/middleware logic |
| `mongoose` | Schema-first MongoDB modeling snd validation. |
| `jsonwebtoken` | Stateless auth tokens with role/user claims for protected endpoints and Socket.IO auth. |
| `bcrypt` | Secure password hashing with configurable salt rounds. |
| `zod` | Runtime payload validation for consistent error handling. |
| `cors` | Controlled cross-origin access between frontend and backend origins. |
| `helmet` | Sensible HTTP hardening headers with minimal setup. |
| `multer` | For file upload related functionalities |
| `socket.io` | Real-time event transport and room-based forum broadcasting. |
| `nodemailer` | SMTP-based transactional email delivery (ticket emails). |
| `qrcode` | Server-side QR code generation for ticket email attachments. |
| `dotenv` | Environment-driven config for secrets and deployment portability. |
| `nodemon` | Faster backend development loop with auto-restart on file changes. |

### Backend built-in Node modules used

| Module | Why it was chosen |
|---|---|
| `http` | Required to attach Socket.IO to the same HTTP server as Express. |
| `path` | Safe path/mimetype utility usage in upload middleware. |

---

## 3) Advanced Features Implemented (Selected)

The following features were selected and implemented:
1. Merchandise Payment Approval Workflow  
2. QR Scanner & Attendance Tracking  
3. Organizer Password Reset Workflow  
4. Real-Time Discussion Forum  
5. Bot Protection

### 3.1 Merchandise Payment Approval Workflow

**Why selected**
- Merchandise flows often need human verification of payment screenshots before issuing fulfillment/tickets.
- Adds realistic transaction moderation and stock integrity constraints.

**Design & implementation approach**
- Participant submits merchandise purchase and uploads payment proof.
- Organiser views pending approvals per event.
- Organiser approves/rejects with optional review note.
- On approval: stock is revalidated/decremented, registration marked successful, ticket generated, ticket email attempted.
- On rejection: registration/payment states are updated with clear audit note.

**Technical decisions**
- Used `Registration` as the transaction source of truth (`type`, `paymentStatus`, `status`, `paymentReview`).
- Validated merchandise availability again at approval time to avoid stale-client race conditions.
- Used memory upload + base64 storage for simpler MVP handling of proof artifacts.
- Kept email sending failure non-blocking to preserve approval workflow reliability.

### 3.2 QR Scanner & Attendance Tracking

**Why selected**
- Event check-in must be fast and resistant to duplicate entry.
- QR-based scanning reduces manual errors and improves throughput.

**Design & implementation approach**
- Ticket contains QR payload (`eventId`, `participantId`, `ticketCode`).
- Organiser scans payload for a specific event.
- System validates event ownership, ticket activity, and matching registration.
- Attendance is marked once, duplicate scans are rejected and logged.
- Manual override is available for exceptional on-ground scenarios.
- Exportable attendance CSV is provided for post-event operations.

**Technical decisions**
- Centralized scan parsing to support both JSON payload and raw code fallback.
- Added attendance audit logs (`attendanceLogs`) to preserve operator actions.
- Used explicit method tags (`scan`, `manual`) for traceability and reporting.

### 3.3 Organizer Password Reset Workflow

**Why selected**
- Organisers need password reset capability to protect their accounts and maintain access.
- Admin-mediated resets fit role hierarchy and adds safety.

**Design & implementation approach**
- Organiser submits reset request.
- Admin reviews open requests and resolves selected ones.
- Admin can also force reset directly for an organiser.
- Backend generates a strong temporary password, hashes it, updates user record, returns credentials to admin response.

**Technical decisions**
- Dedicated `PasswordResetRequest` model for state (`open` → `resolved`).
- Password generation excludes ambiguous characters to reduce error.
- Reset always reactivates account (`isActive: true`) to avoid lockout after admin intervention.

### 3.4 Real-Time Discussion Forum

**Why selected**
- Live interaction and announcements improve participant engagement around events.
- Supports both conversation and moderated communication from organisers.

**Design & implementation approach**
- Event-scoped forum rooms using Socket.IO.
- Access control enforces event ownership/registration before joining or posting.
- Supports threaded replies, announcement posts, pinning, soft deletion, and emoji reactions.
- REST operations mutate data and emit room events for synchronized clients.

**Technical decisions**
- Permission checks are role-aware (`participant`, `organiser`, `admin`) and event-context aware.
- Soft-delete chosen over hard-delete to preserve moderation transparency.
- Reaction model uses constrained emoji list to simplify UI and payload consistency.

### 3.5 Bot Protection

**Why selected**
- Authentication endpoints are high-risk for scripted abuse (credential stuffing, fake signups).

**Design & implementation approach**
- Google reCAPTCHA verification middleware on `login` and `signup` endpoints.
- Server validates token with Google API and optionally enforces minimum score.
- Frontend loads reCAPTCHA script and requests action tokens before auth calls.

**Technical decisions**
- Verification occurs server-side to prevent client bypass.
- Threshold configurable via env var (`RECAPTCHA_MIN_SCORE`).
- A test bypass token exists (`SKIP_RECAPTCHA_TEST`) for controlled local/API testing.

---

## 5) Local Setup and Installation

### Prerequisites
- Node.js v22.14.0 
- npm v10.9.2
- MongoDB running locally or through atlas URI
- Google reCAPTCHA v3 site and secret keys
```

### 5.2 Backend environment

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/felicity_management

JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

FRONTEND_URL=http://localhost:5173

RECAPTCHA_SECRET=your_recaptcha_secret
RECAPTCHA_MIN_SCORE=0.5

ADMIN_EMAIL=admin@iiit.ac.in
ADMIN_PASSWORD=change_me

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM=no-reply@example.com
SMTP_CONNECTION_TIMEOUT=10000
SMTP_GREETING_TIMEOUT=10000
SMTP_SOCKET_TIMEOUT=15000
```

### 5.3 Frontend environment

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

### 5.4 Seed initial admin

From `backend/`:

```bash
npm run seed:admin
```

### 5.5 Run the project

Backend (terminal 1):

```bash
cd backend
npm run dev
```

Frontend (terminal 2):

```bash
cd frontend
npm run dev
```

Open: `http://localhost:5173`

---

## 6) Script Reference

### Backend
- `npm run dev` → start backend with nodemon
- `npm start` → start backend with node
- `npm run seed:admin` → create admin account from env vars

### Frontend
- `npm run dev` → start Vite dev server
- `npm run build` → production build

---

## 7) Deployment Note

- Frontend URL: `felicity-management.vercel.app`
