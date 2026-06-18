### 🟢 Tusharika — Backend (Notices + Warnings) — Beginner Friendly

Files: models/Notice.js, models/Warning.js, routes/notice.routes.js, routes/warning.routes.js, controllers/notice.controller.js, controllers/warning.controller.js
Add: Debt Display Route (very small)

### Prompt
You are building two simple modules for a Club Portal backend: Notices and Warnings. This is a beginner-friendly task. Tech stack: Node.js, Express, MongoDB + Mongoose.

These already exist (just import them, don't create them):
- middleware/auth.middleware.js → verifyToken (checks if user is logged in)
- middleware/role.middleware.js → requireRole (checks user's role)

--- HOW MIDDLEWARE WORKS ---
verifyToken: use it on every route so only logged-in users can access
requireRole('board', 'domain_lead'): use it when only admins should access a route

Example route:
router.post('/', verifyToken, requireRole('board', 'domain_lead'), noticeController.create)
router.get('/', verifyToken, noticeController.getAll)  // any logged in user can read

--- MODEL 1: Notice ---
Create a file models/Notice.js with this schema:
  title: String (required)
  content: String (required)
  createdBy: { type: ObjectId, ref: 'User' }
  createdAt: Date (default: Date.now)
  isImportant: Boolean (default: false)  // for pinning important notices

--- MODEL 2: Warning ---
Create a file models/Warning.js with this schema:
  issuedTo: { type: ObjectId, ref: 'User', required: true }  // which member
  reason: String (required)
  issuedBy: { type: ObjectId, ref: 'User' }
  severity: { type: String, enum: ['mild', 'moderate', 'severe'], default: 'mild' }
  createdAt: Date (default: Date.now)
  acknowledged: Boolean (default: false)  // member has seen it

--- ROUTES TO BUILD ---

Notices (file: routes/notice.routes.js):
POST   /api/notices         → create notice (only board and domain_lead can do this)
GET    /api/notices         → get all notices, latest first (any logged in user)
GET    /api/notices/:id     → get single notice (any logged in user)
PUT    /api/notices/:id     → update notice (only board and domain_lead)
DELETE /api/notices/:id     → delete notice (only board)

Warnings (file: routes/warning.routes.js):
POST   /api/warnings                → issue a warning to a member (only board)
GET    /api/warnings                → get all warnings (only board and domain_lead)
GET    /api/warnings/my             → get MY own warnings (any logged in user, uses req.user.userId)
PATCH  /api/warnings/:id/acknowledge → member marks their warning as seen (any logged in user, but only if warning.issuedTo == req.user.userId)

--- CONTROLLER TIPS ---
For each route, create a controller function:
- Use try/catch for error handling
- Use Model.find(), Model.findById(), new Model({}), model.save(), Model.findByIdAndUpdate()
- Return json responses with appropriate status codes:
  200 for success, 201 for created, 400 for bad request, 403 for forbidden, 404 for not found, 500 for server error

Example controller:
const getAll = async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 }).populate('createdBy', 'name username')
    res.json(notices)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

Start simple, get it working, then test each route using Postman or Thunder Client.

### Addiontal work 

--- ADDITIONAL TASK: One small route to add ---
Once Mahik adds the debt fields to the User model, add this to your warning.routes.js
(since you're already handling member-facing small routes):

GET /api/warnings/stats
  → Returns count of warnings for the logged-in user
  → Response: { total: 3, unacknowledged: 1 }
  → Use verifyToken, filter Warning by issuedTo === req.user.userId

This is literally 5-6 lines in your controller. Just a .countDocuments() call.

### Missing Coordination Details To Add

Follow `MASTER.md` if any instruction conflicts with this file.

Add these constraints without removing the text above:
- Stay inside your notice/warning files only.
- After creating a notice, import Shaurya's notifier and emit `new_notice`.
- After issuing a warning, import Shaurya's notifier and emit `new_warning`.
