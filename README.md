# SQAC API Gateway

> **Single entry point that fans out to three independent Express backends** — the SQAC Member Portal, the SQAC Website backend, and the SQAC Member-Form service — all deployed as **one** process or Vercel serverless function.

---

## Table of Contents

1. [Why a Gateway?](#why-a-gateway)
2. [Repository Layout](#repository-layout)
3. [How the Gateway Works](#how-the-gateway-works)
   - [Request Routing](#request-routing)
   - [Module System Compatibility](#module-system-compatibility)
   - [Local vs. Vercel Execution](#local-vs-vercel-execution)
   - [Keep-Alive Mechanism](#keep-alive-mechanism)
4. [Sub-Backends](#sub-backends)
   - [SQAC Portal Backend](#1-sqac-portal-backend)
   - [SQAC Website Backend](#2-sqac-website-backend)
   - [SQAC Member-Form Backend](#3-sqac-member-form-backend)
5. [Full API Reference](#full-api-reference)
6. [Authentication & Roles](#authentication--roles)
7. [Environment Variables](#environment-variables)
8. [Getting Started (Local Dev)](#getting-started-local-dev)
9. [Deploying to Vercel](#deploying-to-vercel)
10. [Deploying to Koyeb / Render](#deploying-to-koyeb--render)
11. [Architecture Diagram](#architecture-diagram)

---

## Why a Gateway?

Each sub-project (Portal, Website, Member-Form) was originally a standalone Express server with its own `app.listen()`. Running them separately means three different origins, three deployments to manage, and CORS headaches across all frontends.

The gateway solves this by:
- Importing each sub-app and **mounting it on a single Express instance**.
- Using **path prefix matching** to dispatch requests to the correct backend — no URL stripping, so each sub-app keeps its own routes intact.
- Exporting the combined app so it can run either as a **long-lived server** (Koyeb/Render) or as a **Vercel serverless function** via `api/index.js`.

---

## Repository Layout

```
sqac-api-gateway/
├── gateway.js                  # 🚪 Main entry point — mounts all three backends
├── api/
│   └── index.js                # Vercel serverless adapter (re-exports gateway.js)
├── vercel.json                 # Vercel config: rewrites all traffic → /api
├── package.json                # Gateway-level deps (express, dotenv) + postinstall
├── .env.example                # Template for all environment variables
│
├── SQAC_Portal/
│   └── Backend/                # ESM — member portal (auth, admin, projects, etc.)
│       ├── server.js           # Portal Express app (exported, no app.listen)
│       ├── package.json
│       └── src/
│           ├── controllers/    # Business logic handlers
│           ├── middleware/     # auth, role, permissions middleware
│           ├── models/         # Mongoose schemas
│           └── routes/         # certificate, project, mom, coc, mail, chat routes
│
├── sqac-website/
│   └── backend/                # CommonJS — public website data & contact form
│       ├── server.js           # Website Express app (exported, no app.listen)
│       ├── package.json
│       ├── models/             # Data, Contact mongoose models
│       └── utils/              # Cloudinary storage helper
│
└── SQAC-Member-Form/
    └── backend/                # ESM — member registration form
        ├── index.js            # Member-Form Express app (exported, no app.listen)
        ├── package.json
        └── lib/                # db.js, cloudinary.js, schema.js
```

---

## How the Gateway Works

### Request Routing

[`gateway.js`](./gateway.js) uses a simple prefix-matching dispatcher to decide which backend handles each request:

```
Incoming request
       │
       ▼
  Does path start with /api/data, /api/contact, /api/upload, /api/health?
       │ YES → sqac-website backend
       │ NO
       ▼
  Does path start with /api/form, /api/getdata?
       │ YES → sqac-member-form backend
       │ NO
       ▼
       Portal backend (catch-all for everything else)
```

Key design decision: **the URL is NOT stripped** before being forwarded. Each sub-app receives the full original path, so its internal route definitions require no changes.

```js
// gateway.js — routing logic
const WEBSITE_PREFIXES    = ["/api/data", "/api/contact", "/api/upload", "/api/health"];
const MEMBERFORM_PREFIXES = ["/api/form", "/api/getdata"];

app.use((req, res, next) => {
  if (matches(WEBSITE_PREFIXES, req.path))    return websiteApp(req, res, next);
  if (matches(MEMBERFORM_PREFIXES, req.path)) return memberFormApp(req, res, next);
  return portalApp(req, res, next);           // default / catch-all
});
```

### Module System Compatibility

The three backends use different module systems:

| Backend | Module System | How the gateway imports it |
|---|---|---|
| SQAC Portal | ESM (`"type": "module"`) | `import portalApp from "..."` |
| SQAC Member-Form | ESM (`"type": "module"`) | `import memberFormApp from "..."` |
| SQAC Website | CommonJS (`"type": "commonjs"`) | `createRequire(import.meta.url)(...)` |

The gateway itself is ESM (`"type": "module"` in its root `package.json`). It uses Node's `createRequire` to dynamically `require()` the CommonJS website backend without any transpilation step.

### Local vs. Vercel Execution

The gateway detects its environment via `process.env.VERCEL`:

```
process.env.VERCEL is set?
  YES → Export the app only. Vercel manages the HTTP lifecycle.
  NO  → Call app.listen(PORT) to start a real HTTP server.
```

```js
export default app;   // always export for Vercel

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => console.log(`🚀 SQAC API Gateway running on port ${PORT}`));
}
```

On **Vercel**, `api/index.js` re-exports the combined app:

```js
// api/index.js
import app from "../gateway.js";
export default app;
```

`vercel.json` rewrites every request to `/api`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/api" }],
  "functions": {
    "api/index.js": { "maxDuration": 60, "memory": 1024 }
  }
}
```

### Keep-Alive Mechanism

On free-tier hosting platforms (Koyeb, Render) that spin down idle instances, the gateway optionally self-pings its own `/health` endpoint every **14 minutes** to prevent cold starts:

```js
if (process.env.KEEPALIVE_URL) {
  setInterval(() => {
    fetch(`${process.env.KEEPALIVE_URL}/health`)
      .then(r => console.log(`[KeepAlive] ${r.status}`))
      .catch(e => console.error("[KeepAlive] failed:", e.message));
  }, 14 * 60 * 1000);
}
```

Set `KEEPALIVE_URL` to your public deployment URL to enable this.

---

## Sub-Backends

### 1. SQAC Portal Backend

**Location:** `SQAC_Portal/Backend/`  
**Module system:** ESM  
**Routing:** Catch-all — handles all routes not matched by the Website or Member-Form prefixes.

**Tech stack:** Express 5, MongoDB (Mongoose), JWT, Redis, Supabase, Cloudinary, Nodemailer, Google Drive API, Groq AI, `pdf-lib`

**Key features:**
- Full authentication with JWT (cookie + Authorization header)
- Role-based access control (RBAC) with granular permissions
- Member management, approval workflows, and admin tools
- Meeting scheduling & attendance tracking
- Notices and warnings system
- AI-powered project management and team recommendation engine
- AI-assisted Minutes of Meeting (MOM) generation
- Code of Conduct (COC) signing flow with PDF export
- Certificate generation and verification

#### Middleware Stack

| Middleware | File | Purpose |
|---|---|---|
| `cors` | `server.js` | Allow only origins listed in `FRONTEND_URL` env var |
| `express.json` | `server.js` | Parse JSON bodies up to 50 MB |
| `cookie-parser` | `server.js` | Parse `session` cookie for JWT |
| `authenticateToken` | `User.controller.js` | Verify JWT — applied to all protected routes |
| `requireRole` | `role.middleware.js` | Gate by specific role strings |
| `requirePermission` | `permissions.middleware.js` | Gate by capability (e.g. `MANAGE_ATTENDANCE`) |

---

### 2. SQAC Website Backend

**Location:** `sqac-website/backend/`  
**Module system:** CommonJS  
**Handles prefixes:** `/api/data`, `/api/contact`, `/api/upload`, `/api/health`

**Tech stack:** Express 5, MongoDB (Mongoose), Cloudinary v1, Multer, `node-cron`, `xlsx`

**Key features:**
- Public data endpoints for the website frontend
- Contact form submission and retrieval
- Image uploads to Cloudinary
- Hourly cron job (`0 * * * *`) to sync `data.xlsx` → MongoDB

---

### 3. SQAC Member-Form Backend

**Location:** `SQAC-Member-Form/backend/`  
**Module system:** ESM  
**Handles prefixes:** `/api/form`, `/api/getdata`

**Tech stack:** Express 5, MongoDB (Mongoose), Cloudinary v2, Multer (memory storage, max 5 MB)

**Key features:**
- Member registration with profile photo upload (streamed directly to Cloudinary)
- Auto-slug generation from member name for SEO-friendly profile URLs
- Fetch all members or a single member by slug

---

## Full API Reference

### Gateway-Level Routes

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/` | Root status — returns gateway info | Public |
| `GET` | `/health` | Health check — returns `{ status: "ok" }` | Public |

---

### Portal Backend Routes

#### Auth

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/user/create` | Register a new user | Public |
| `POST` | `/user/login` | Login — sets `session` cookie | Public |
| `POST` | `/logout` | Logout — clears cookie | Public |
| `POST` | `/api/auth/complete-onboarding` | Complete onboarding after first login | Public |

#### OTP & Password Reset

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/otp/get` | Request an OTP | Public |
| `POST` | `/otp/verify` | Verify submitted OTP | Public |
| `POST` | `/password/reset` | Reset password using verified OTP | Public |

#### User Profile *(JWT required for all below)*

| Method | Path | Description |
|---|---|---|
| `GET` | `/user/profile` | Get logged-in user's profile |
| `PUT` | `/user/update` | Edit profile |
| `GET` | `/user/role` | Get role of logged-in user |
| `GET` | `/api/permissions/me` | Get permission flags for logged-in user's role |

#### Admin Management

| Method | Path | Description | Required Permission |
|---|---|---|---|
| `GET` | `/admin/members` | List all approved members | — |
| `GET` | `/admin/subadmins` | List all sub-admins | — |
| `DELETE` | `/admin/user/:id` | Delete a member | `DELETE_MEMBER` |
| `DELETE` | `/admin/subadmin/:id` | Delete a sub-admin | — |
| `PUT` | `/admin/position/:id` | Change member position | — |
| `PUT` | `/admin/role/:id` | Change member role | `CHANGE_ROLE` |
| `POST` | `/admin/approve/:id` | Approve a pending member | `APPROVE_MEMBER` |
| `GET` | `/admin/status/:id` | Check member approval status | — |
| `POST` | `/admin/reject/:id` | Reject a pending member | `REJECT_MEMBER` |
| `POST` | `/admin/warn/:id` | Send a warning to a member | `ISSUE_WARNING` |
| `GET` | `/admin/pending` | List all pending member registrations | — |

#### Meetings

| Method | Path | Description |
|---|---|---|
| `POST` | `/meet/create` | Create a new meeting |
| `PUT` | `/meet/edit/:id` | Edit a meeting |
| `DELETE` | `/meet/delete/:id` | Delete a meeting |
| `GET` | `/meet/getmeet` | List all meetings |

#### Notices

| Method | Path | Description |
|---|---|---|
| `GET` | `/notices` | Get all notices |
| `POST` | `/notices/create` | Create a notice |
| `DELETE` | `/notices/:id` | Delete a notice |
| `GET` | `/usernotice/:id` | Get notices for a specific user |

#### Attendance

| Method | Path | Description | Required Permission |
|---|---|---|---|
| `POST` | `/attendance/add` | Add an attendance record | `MANAGE_ATTENDANCE` |
| `GET` | `/attendance/user/:userID` | Get attendance for a user | — |
| `GET` | `/attendance/all` | Get all attendance records | `MANAGE_ATTENDANCE` |
| `PUT` | `/attendance/edit/:id` | Edit an attendance record | `MANAGE_ATTENDANCE` |
| `GET` | `/attendance/domain` | Get attendance grouped by domain | `MANAGE_ATTENDANCE` |
| `GET` | `/attendance/by-domain-subdomain` | Get attendance by domain + subdomain | `MANAGE_ATTENDANCE` |

#### Certificates (`/api/certificate/*`)

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/certificate/my` | Get logged-in user's certificates | JWT |
| `GET` | `/api/certificate/user/:userId` | Get certificates for a specific user | JWT |
| `GET` | `/api/certificate/verify/:credentialId` | Verify a certificate by credential ID | Public |
| `POST` | `/api/certificate/upload-generated` | Upload a generated certificate | JWT |

#### Projects & AI (`/api/projects/*`)

| Method | Path | Description | Required Permission |
|---|---|---|---|
| `GET` | `/api/projects/stats` | Dashboard statistics | — |
| `GET` | `/api/projects/members` | All member profiles | — |
| `GET` | `/api/projects/members/status/:status` | Members filtered by status | — |
| `PUT` | `/api/projects/members/:id/status` | Update member status | `admin`/`subadmin` role |
| `PUT` | `/api/projects/members/:id/skills` | Update member skills | `admin`/`subadmin` role |
| `GET` | `/api/projects/members/email/:email` | Get member profile by email | — |
| `POST` | `/api/projects/members/upsert` | Create/update a member profile | `admin`/`subadmin` role |
| `POST` | `/api/projects/ai-generate` | AI-generate a project description | `CREATE_PROJECT` |
| `POST` | `/api/projects/` | Create a project | `CREATE_PROJECT` |
| `GET` | `/api/projects/` | List all projects | — |
| `GET` | `/api/projects/my-projects` | List projects assigned to logged-in user | — |
| `GET` | `/api/projects/:id` | Get a project by ID | — |
| `PUT` | `/api/projects/:id` | Update a project | `CREATE_PROJECT` |
| `PUT` | `/api/projects/:id/complete` | Mark a project as complete | `ASSIGN_PROJECT` |
| `DELETE` | `/api/projects/:id` | Delete a project | `CREATE_PROJECT` |
| `POST` | `/api/projects/:projectId/recommend` | AI-recommend a team for a project | `ASSIGN_PROJECT` |
| `POST` | `/api/projects/:id/unassign` | Unassign a team from a project | `ASSIGN_PROJECT` |
| `POST` | `/api/projects/:id/submissions` | Add a submission | — |
| `PUT` | `/api/projects/:id/submissions/:submissionId/review` | Review a submission | — |
| `POST` | `/api/projects/:id/threads` | Post a thread message | — |

#### Minutes of Meeting (`/api/mom/*`)

| Method | Path | Description | Required Permission |
|---|---|---|---|
| `GET` | `/api/mom/members/approved` | Get approved members (for picker) | — |
| `POST` | `/api/mom/pdf` | Generate MOM PDF (letterhead) | — |
| `POST` | `/api/mom/ai-generate` | AI-generate MOM content | `GENERATE_MOM` |
| `GET` | `/api/mom/all` | List all MOMs | — |
| `POST` | `/api/mom/create` | Create a MOM | `GENERATE_MOM` |
| `GET` | `/api/mom/:id` | Get a MOM by ID | — |
| `PUT` | `/api/mom/:id` | Update a MOM | `GENERATE_MOM` |
| `DELETE` | `/api/mom/:id` | Delete a MOM | `DELETE_MOM` |

#### Code of Conduct (`/api/coc/*`)

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/coc/document` | Get COC document (for iframe embed) | Public |
| `GET` | `/api/coc/status` | Get COC signing status for logged-in user | JWT |
| `POST` | `/api/coc/preview` | Generate a COC preview | JWT |
| `POST` | `/api/coc/confirm` | Confirm / sign the COC | JWT |
| `POST` | `/api/coc/profile` | Complete profile after COC signing | JWT |
| `GET` | `/api/coc/records` | List all COC acceptance records | JWT |
| `GET` | `/api/coc/records/:userId/pdf` | Download COC PDF for a user | JWT |

#### Misc (Portal)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/ping` | Keep-alive ping — returns `{ message: "pong" }` |

---

### Website Backend Routes

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/data` | Get all website data documents | Public |
| `GET` | `/api/data/field/:fieldName` | Get a specific field across all documents | Public |
| `POST` | `/api/upload/:id` | Upload / update image for a data record | Public |
| `GET` | `/api/health` | Website backend health check | Public |
| `POST` | `/api/contact` | Submit a contact form | Public |
| `GET` | `/api/contact` | Retrieve all contact submissions | Public |

---

### Member-Form Backend Routes

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/api/form` | Register a new member (`multipart/form-data`, field `image` required) | Public |
| `GET` | `/api/getdata` | List all registered members | Public |
| `GET` | `/api/getdata/:slug` | Get a single member by their name-slug | Public |

---

## Authentication & Roles

The Portal backend uses **JWT authentication** stored in an HTTP-only cookie named `session`, or passed as a `Bearer` token in the `Authorization` header.

### Roles (lowest → highest privilege)

```
member  →  associate_lead  →  domain_lead  →  corp_lead  →  project_lead
       →  technical_lead  →  joint_secretary  →  secretary
```

### Permission Matrix

| Permission | secretary | joint_sec | technical_lead | project_lead | corp_lead | domain_lead | associate_lead | member |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `APPROVE_MEMBER` | ✅ | | | | | | | |
| `REJECT_MEMBER` | ✅ | | | | | | | |
| `DELETE_MEMBER` | ✅ | | | | | | | |
| `CHANGE_ROLE` | ✅ | | | | | | | |
| `SEND_MASS_MAIL` | ✅ | ✅ | | | | | | |
| `CREATE_PROJECT` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | |
| `ASSIGN_PROJECT` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | |
| `SCHEDULE_MEET` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | |
| `SEND_NOTICE` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | |
| `ISSUE_WARNING` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | |
| `MANAGE_ATTENDANCE` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | | |
| `GENERATE_CERT` | ✅ | ✅ | ✅ | ✅ | ✅ | | | |
| `GENERATE_MOM` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `DELETE_MOM` | ✅ | ✅ | | | | | | |
| `VIEW_MEMBERS` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | |

The `GET /api/permissions/me` endpoint returns these as camelCase boolean flags (e.g. `canApproveMember`, `canManageAttendance`) for the frontend to use for conditional rendering.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. All three backends share a **single `.env` file** at the repository root since they run in one process.

```bash
cp .env.example .env
```

| Variable | Used By | Description |
|---|---|---|
| `PORT` | Gateway | Port to listen on locally (default: `8080`) |
| `KEEPALIVE_URL` | Gateway | Public URL for keep-alive self-ping (optional) |
| `PORTAL_MONGO_URI` | Portal | MongoDB connection string for the portal DB |
| `WEBSITE_MONGO_URI` | Website | MongoDB connection string for the website DB |
| `MONGO_URI` | Both | Fallback if the specific URIs above are not set |
| `FRONTEND_URL` | Portal | Comma-separated list of allowed CORS origins |
| `JWT_SECRET` | Portal | Secret key for signing / verifying JWTs |
| `GROQ_API_KEY` | Portal | API key for Groq AI (project & MOM generation) |
| `REDIS_URI` | Portal | Redis connection string |
| `CLOUDINARY_CLOUD` | Portal | Cloudinary cloud name (Portal account) |
| `CLOUDINARY_API` | Portal | Cloudinary API key (Portal account) |
| `CLOUDINARY_SECRET` | Portal | Cloudinary API secret (Portal account) |
| `SUPABASE_URL` | Portal | Supabase project URL |
| `SUPABASE_KEY` | Portal | Supabase anon / service key |
| `SUPABASE_BUCKET` | Portal | Supabase storage bucket name |
| `SMTP_HOST` | Portal | SMTP server hostname |
| `SMTP_PORT` | Portal | SMTP server port |
| `SMTP_USER` | Portal | SMTP username / email |
| `SMTP_PASS` | Portal | SMTP password |
| `GOOGLE_DRIVE_FOLDER_ID` | Portal | Google Drive folder ID for uploads |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Portal | Service account JSON as a single-line string |
| `CLOUDINARY_CLOUD_NAME` | Website | Cloudinary cloud name (Website account — different var names!) |
| `CLOUDINARY_API_KEY` | Website | Cloudinary API key (Website account) |
| `CLOUDINARY_API_SECRET` | Website | Cloudinary API secret (Website account) |

> **Note:** Portal and Website intentionally use **different Cloudinary variable names** so they can connect to separate Cloudinary accounts if needed.

---

## Getting Started (Local Dev)

### Prerequisites

- **Node.js ≥ 20**
- A `.env` file at the project root (see [Environment Variables](#environment-variables))

### Install

```bash
# Installs gateway deps AND all three sub-backend deps in one command
npm install
```

The `postinstall` script in `package.json` automatically runs:

```bash
npm install --prefix SQAC_Portal/Backend
npm install --prefix sqac-website/backend
npm install --prefix SQAC-Member-Form/backend
```

### Run

```bash
# Development (auto-restart on file changes via Node --watch)
npm run dev

# Production
npm start
```

The gateway starts on `http://localhost:8080` (or the value of `PORT`).

### Verify

```bash
curl http://localhost:8080/health
# → { "status": "ok", "gateway": "sqac-api-gateway" }
```

---

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add all environment variables from `.env.example` in **Settings → Environment Variables**.
4. Deploy. Vercel will:
   - Run `npm install` (triggering `postinstall` for all sub-backends automatically)
   - Serve everything through `api/index.js` as a single serverless function
   - Rewrite all `/*` traffic to `/api` per `vercel.json`

> The function is configured for a **60-second max duration** and **1 GB memory** in `vercel.json`.

---

## Deploying to Koyeb / Render

1. Connect your GitHub repo.
2. Set the **build command** to `npm install`.
3. Set the **start command** to `npm start`.
4. Add all environment variables from `.env.example`.
5. Set `KEEPALIVE_URL` to your app's public URL to prevent spin-down on free tiers.

Koyeb automatically injects `PORT`; the gateway reads it via `process.env.PORT || 8080`.

---

## Architecture Diagram

```
                         ┌──────────────────────────────────────┐
                         │          SQAC API Gateway            │
                         │            (gateway.js)              │
                         │                                      │
  Client / Frontend ───▶ │  GET /health     → Gateway response │
  (or Vercel rewrite)    │  GET /           → Gateway response  │
                         │                                      │
                         │  Path Dispatcher Middleware          │
                         │                                      │
                         │  /api/data                           │
                         │  /api/contact      ──────────────────┼──▶  sqac-website/backend
                         │  /api/upload                         │     (CommonJS · Mongoose ·
                         │  /api/health                         │      Cloudinary · node-cron)
                         │                                      │
                         │  /api/form         ──────────────────┼──▶  SQAC-Member-Form/backend
                         │  /api/getdata                        │     (ESM · Mongoose ·
                         │                                      │      Cloudinary · Multer)
                         │                                      │
                         │  everything else   ──────────────────┼──▶  SQAC_Portal/Backend
                         │  (catch-all)                         │     (ESM · JWT · Groq AI ·
                         │                                      │      Supabase · Cloudinary ·
                         │                                      │      Redis · Nodemailer)
                         └──────────────────────────────────────┘
                                          │
                          ┌───────────────▼────────────────┐
                          │  Vercel serverless (api/)  OR  │
                          │  Long-lived HTTP server        │
                          │  (Koyeb / Render / local)      │
                          └────────────────────────────────┘
```

---

> **Adding a new sub-backend?**
> 1. Add its folder and ensure it exports its Express `app` **without** calling `app.listen()`.
> 2. Import it in `gateway.js`.
> 3. Define its path prefixes and add a branch to the dispatcher middleware.
> 4. Add `npm install --prefix <path>` to the `postinstall` script in the root `package.json`.
> 5. Document any new environment variables in `.env.example`.
