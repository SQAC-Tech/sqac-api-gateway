### 🔵 Manya — Backend (Projects, Tasks, Meetings, Attendance, MOM)

Files: models/Project.js, models/Task.js, models/Meeting.js, models/Attendance.js, all their routes + controllers

Add: Member-Facing Meeting + Attendance Endpoints

### Prompt
You are building the Projects, Tasks, Meetings, Attendance, and MOM (Minutes of Meeting) module of a Club Portal backend. Tech stack: Node.js, Express, MongoDB + Mongoose.

Assume these already exist (built by another teammate, just import and use):
- middleware/auth.middleware.js → exports verifyToken
- middleware/role.middleware.js → exports requireRole

--- MODEL 1: Project ---
Fields:
  title: String (required)
  description: String
  domain: String // which club domain this belongs to
  assignedTo: [{ type: ObjectId, ref: 'User' }] // array of members
  assignedTeam: String // team name if applicable
  createdBy: { type: ObjectId, ref: 'User' }
  status: { enum: ['active', 'completed', 'on-hold'], default: 'active' }
  deadline: Date
  createdAt: Date (default now)

--- MODEL 2: Task ---
Fields:
  title: String (required)
  description: String
  project: { type: ObjectId, ref: 'Project' } // optional, can be standalone
  assignedTo: { type: ObjectId, ref: 'User' } // single member
  assignedBy: { type: ObjectId, ref: 'User' }
  status: { enum: ['pending', 'in-progress', 'done'], default: 'pending' }
  dueDate: Date
  createdAt: Date (default now)

--- MODEL 3: Meeting ---
Fields:
  title: String (required)
  description: String
  scheduledAt: Date (required)
  createdBy: { type: ObjectId, ref: 'User' }
  attendees: [{ type: ObjectId, ref: 'User' }] // pre-set attendee list
  meetingLink: String // optional zoom/gmeet link
  mom: String // Minutes of Meeting, filled after meeting
  momGeneratedAt: Date
  status: { enum: ['upcoming', 'completed', 'cancelled'], default: 'upcoming' }

--- MODEL 4: Attendance ---
Fields:
  meeting: { type: ObjectId, ref: 'Meeting', required: true }
  member: { type: ObjectId, ref: 'User', required: true }
  status: { enum: ['present', 'absent', 'late'], default: 'absent' }
  markedAt: Date (default now)
  markedBy: { type: ObjectId, ref: 'User' } // admin who marked it

--- ROUTES TO BUILD ---

Projects:
POST   /api/projects         → create project (requireRole board, domain_lead)
GET    /api/projects         → get all projects (all logged in)
GET    /api/projects/:id     → get single project
PUT    /api/projects/:id     → update project (requireRole board, domain_lead)
DELETE /api/projects/:id     → delete project (requireRole board)
PATCH  /api/projects/:id/assign → add/remove members from project (requireRole board, domain_lead)

Tasks:
POST   /api/tasks            → create and assign task (requireRole board, domain_lead, associate)
GET    /api/tasks            → get all tasks. Query param: ?assignedTo=userId to filter
GET    /api/tasks/mine       → get tasks assigned to logged in user (verifyToken)
GET    /api/tasks/:id        → get single task
PUT    /api/tasks/:id        → update task (creator or assigned person)
PATCH  /api/tasks/:id/status → update status only (assigned person themselves)

Meetings:
POST   /api/meetings                    → create meeting (requireRole board, domain_lead)
GET    /api/meetings                    → get all meetings (all logged in)
GET    /api/meetings/:id                → get single meeting with populated attendees
PUT    /api/meetings/:id                → update meeting (requireRole board, domain_lead)
POST   /api/meetings/:id/mom            → save/update MOM text (requireRole board, domain_lead)

Attendance:
POST   /api/attendance/mark             → mark attendance for a meeting
  Body: { meetingId, records: [{ memberId, status }] }
  requireRole board, domain_lead, associate
GET    /api/attendance/meeting/:meetingId → get attendance for a meeting
GET    /api/attendance/member/:memberId   → get attendance history for a member
GET    /api/attendance/my               → get own attendance (verifyToken)

MOM Generator:
POST /api/meetings/:id/generate-mom
  Takes: { keyPoints: ["point1", "point2", ...], decisions: [], actionItems: [] }
  Formats a clean MOM text string from these inputs
  Saves it to meeting.mom and sets momGeneratedAt
  Returns the formatted MOM string

IMPORTANT: Do not touch User model or auth routes. Do not create app.js.
Export your routes and tell the main app to mount them — you just need to create route files.

### Additonal workflow Prompt

--- ADDITIONAL TASK: Member-Friendly Endpoints ---
Add these routes (members can access these, not just admins):

GET /api/meetings/upcoming
  → Returns meetings where scheduledAt > now, sorted ascending
  → Any logged-in user can access (verifyToken only, no requireRole)
  → Populate createdBy with name

GET /api/meetings/:id/mom
  → Returns just the mom field of a meeting (so members can read the MOM)
  → Any logged-in user (verifyToken)
  → If mom is empty, return { mom: null, message: "MOM not yet published" }

GET /api/attendance/summary/:memberId
  → Returns attendance summary for a member:
    { total: 10, present: 7, absent: 2, late: 1, percentage: 70 }
  → The member can only see their own (check req.user.userId === memberId)
  → board and domain_lead can see anyone's summary

These are small additions to your existing routes — just add new route handlers,
don't change any existing ones.

### Missing Coordination Details To Add

Follow `MASTER.md` if any instruction conflicts with this file.

Add these constraints without removing the text above:
- Only work inside your model/route/controller files.
- Mahik mounts your routes; do not edit boot files.
- On task assignment, import Shaurya's notifier and emit `task_assigned`.
- On meeting creation, import Shaurya's notifier and emit `new_meeting`.
