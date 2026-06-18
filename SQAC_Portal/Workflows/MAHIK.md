### 🔴 Mahik Jain — Backend Core (Auth + Users + App Setup)

Files: app.js, config/db.js, models/User.js, routes/auth.routes.js, routes/user.routes.js, controllers/auth.controller.js, controllers/user.controller.js, middleware/auth.middleware.js, middleware/role.middleware.js

Add: Debt Routes + .env + README

### Prompt

You are building the backend foundation of a Club Portal web app using Node.js, Express, and MongoDB (Mongoose). Your job is ONLY auth, user management, and app scaffolding.

TECH STACK: Node.js, Express, MongoDB + Mongoose, bcryptjs, jsonwebtoken, dotenv, cors

--- TASK 1: app.js ---
Set up a clean Express app:
- Import and use cors, express.json()
- Connect to MongoDB using mongoose (connection string from .env as MONGO_URI)
- Mount routes like:
  app.use('/api/auth', authRoutes)
  app.use('/api/users', userRoutes)
  // Other team members will add their routes here later (project, task, notice, warning, chat, mail, certificate)
- Start server on PORT from .env (default 5000)
- Export app for potential testing

--- TASK 2: User Model ---
Create a Mongoose schema called User with these fields:
  name: String (required)
  email: String (required, unique, lowercase)
  username: String (unique) // auto-generated during onboarding
  password: String (hashed)
  role: { type: String, enum: ['board', 'domain_lead', 'associate', 'member'], default: 'member' }
  domain: String // e.g. 'tech', 'design', 'marketing'
  department: String
  mobileNo: String
  position: String
  profilePic: String // URL
  debt: Number (default: 0)
  isApproved: Boolean (default: false) // board must approve after onboarding
  isOnboarded: Boolean (default: false) // has completed onboarding steps
  undertakingSigned: Boolean (default: false)
  cocSigned: Boolean (default: false)
  createdAt: Date (default: Date.now)

Add a pre-save hook to hash password using bcryptjs with saltRounds=10.
Add an instance method comparePassword(candidatePassword) that returns a boolean.

--- TASK 3: Auth Controller & Routes ---
Create these endpoints:

POST /api/auth/register
- Takes: name, email, domain, department, mobileNo
- Auto-generates a username: firstname.lastname format (e.g. "john.doe") + random 3-digit number if collision
- Auto-generates a random 8-char password
- Saves user with isApproved=false, isOnboarded=false
- Returns: { username, password, message: "Complete your onboarding" }

POST /api/auth/login
- Takes: username, password
- Validates credentials
- Checks isApproved === true (if not approved, return 403 with message "Account pending approval")
- Returns JWT with payload: { userId, role, username }
- JWT expires in 7d

POST /api/auth/complete-onboarding
- Protected route (must be logged in)
- Takes: undertakingSigned, cocSigned (both boolean)
- Updates user's fields accordingly
- Sets isOnboarded=true when both are true

--- TASK 4: Middleware ---
auth.middleware.js:
- verifyToken: reads Authorization header "Bearer <token>", verifies JWT, attaches req.user = decoded payload

role.middleware.js:
- requireRole(...roles): middleware factory
  Example usage: requireRole('board', 'domain_lead')
  If req.user.role not in roles, return 403 Forbidden

--- TASK 5: User Controller & Routes (admin + self) ---
GET /api/users/me → returns own profile (protected)
PUT /api/users/me → update own profile (name, mobileNo, profilePic)
GET /api/users → returns all users (requireRole board, domain_lead, associate)
GET /api/users/:id → get single user info (requireRole board, domain_lead)
PATCH /api/users/:id/approve → set isApproved=true (requireRole board only)
PATCH /api/users/:id/role → change role (requireRole board only)
POST /api/users/:id/reset-credentials → generate new password, return it (requireRole board only)
DELETE /api/users/:id → soft delete or mark inactive (requireRole board only)

IMPORTANT: Do not touch any other route files. Other team members own their routes. You just mount them in app.js with a comment placeholder.

### Additional Work
--- ADDITIONAL TASK: Debt Management Routes ---
Add to user.routes.js:

GET  /api/users/:id/debt      → get debt amount of a member (requireRole board, domain_lead)
PATCH /api/users/:id/debt     → update debt (requireRole board only)
  Body: { amount: Number, reason: String, operation: 'add' | 'subtract' | 'set' }
  Keeps a debtHistory array on user: [{ amount, reason, operation, changedBy, changedAt }]
  Update the User model to add:
    debt: { type: Number, default: 0 }
    debtHistory: [{ amount, reason, operation, changedBy: ObjectId ref User, changedAt: Date }]

--- ADDITIONAL TASK: .env.example file ---
Create .env.example at root of backend/:
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com

--- ADDITIONAL TASK: README.md ---
Create a README.md at project root with:
1. Project overview (what the Club Portal does)
2. Tech stack list
3. How to clone and run backend (npm install, cp .env.example .env, npm run dev)
4. How to clone and run frontend (npm install, npm run dev)
5. Folder structure overview
6. List of all API endpoints grouped by module
7. Role permission table (board / domain_lead / associate / member)

### Missing Coordination Details To Add

Follow `MASTER.md` if any instruction conflicts with this file.

Add these constraints without removing the text above:
- Split bootstrapping into `app.js` and `server.js`.
- `app.js` should configure Express and export `app`.
- `server.js` should create the HTTP server, initialize Shaurya's socket setup, and call `server.listen`.
- `POST /api/auth/register` must also return `onboardingToken` and a lightweight `user` object so onboarding can continue before approval.
- `POST /api/auth/complete-onboarding` must accept the onboarding token in `Authorization`.
- `PATCH /api/users/:id/approve` must emit `account_approved` using Shaurya's notifier helper.
