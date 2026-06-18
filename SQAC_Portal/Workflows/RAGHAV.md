### 🔵 Raghav — Admin Panel Frontend + Axios Setup
Files: All pages/admin/, api/axios.js
Add: Mass Mailing Page + Warnings Admin Page + Debt Management UI
### Prompt 

You are building the Admin Panel frontend for a Club Portal using React + Tailwind CSS. You are also setting up the shared Axios instance that the entire frontend uses.

TECH STACK: React, Tailwind CSS, Axios, React Router v6

--- FIRST: api/axios.js ---
Create a configured Axios instance:
import axios from 'axios'
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000' })
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
export default api

--- ADMIN PANEL LAYOUT ---
All admin pages use a sidebar layout:
Left sidebar (fixed): 
  - Club Portal Admin
  - Links: Dashboard | Members | Projects | Tasks | Meetings | Attendance | Onboarding Approvals | Certificates | Settings (coming soon)
Main content: rest of the screen

--- PAGE 1: AdminDashboard.jsx ---
Overview stats:
- Total members (fetch GET /api/users, count)
- Pending approvals (filter isApproved=false)
- Active projects (fetch GET /api/projects, filter status=active)
- Upcoming meetings (fetch GET /api/meetings, filter scheduledAt > now)
Show as 4 stat cards in a grid.
Below: a table of "Recent Pending Approvals" with Approve button

--- PAGE 2: MemberList.jsx ---
Fetch GET /api/users
Show as a table with columns: Name, Username, Email, Domain, Role, Status (badge: Approved/Pending)
Each row has actions: View | Edit Role | Reset Credentials | Delete
Add search/filter by domain and role
Role shown as a color badge (board=purple, domain_lead=blue, associate=green, member=gray)
"Approve" button if not yet approved (calls PATCH /api/users/:id/approve)

--- PAGE 3: MemberDetail.jsx ---
Route: /admin/members/:id
Fetch GET /api/users/:id
Show full profile card
Below: their tasks, projects, attendance history, warnings, certificates (all as tabs)

--- PAGE 4: ProjectManager.jsx ---
Fetch GET /api/projects
Show as cards with status badge
"Create Project" button → opens a modal with form:
  Title, Description, Domain, Deadline, Assign Members (multi-select dropdown from user list)
On submit: POST /api/projects
Each card has: Edit, Delete, Assign Members buttons

--- PAGE 5: TaskAssign.jsx ---
Show all tasks: GET /api/tasks
Filter by member (dropdown), status (dropdown)
"Assign New Task" button → modal with:
  Title, Description, Assign To (member dropdown), Due Date, Link to Project (optional)
On submit: POST /api/tasks
Task list shows assigned member's name, status badge, due date

--- PAGE 6: MeetingManager.jsx ---
Fetch GET /api/meetings
Show upcoming and past meetings in two tabs
"Schedule Meeting" button → modal:
  Title, Description, Date & Time, Meeting Link, Select Attendees (multi-select)
On submit: POST /api/meetings
Each meeting card: "Add MOM" button → opens a textarea modal → saves MOM to POST /api/meetings/:id/mom

--- PAGE 7: AttendanceTracker.jsx ---
Select a meeting from dropdown (fetch meetings list)
After selecting: show list of meeting's attendees
For each: Present / Absent / Late radio buttons
"Save Attendance" → POST /api/attendance/mark
Also show GET /api/attendance/meeting/:id to view past attendance

--- PAGE 8: OnboardApproval.jsx ---
Fetch GET /api/users then filter isApproved=false
Show as a table: Name, Email, Domain, Dept, Registration Date
"Approve" button → PATCH /api/users/:id/approve → refresh list
"Reject / Delete" → DELETE /api/users/:id

--- PAGE 9: CertGenerator.jsx ---
Form:
  Select Member (dropdown fetching all users)
  Certificate Type (participation / completion / appreciation / custom)
  Title, Description/Achievement text
Preview area showing how cert will look (simple HTML preview)
"Generate & Send" → POST /api/certificate/generate
Below: list of issued certificates with PDF download links

DESIGN: Keep it clean and professional. Use Tailwind's slate color palette for the admin. Sidebar bg: slate-800, text: slate-100. Main content bg: slate-50 or white. Buttons: teal-600 for primary actions, red-500 for destructive actions.


--- ADDITIONAL TASK 1: MassMailer.jsx ---
Route in admin sidebar: "Mass Mail"

Form:
  Subject: text input
  Body: textarea (with basic formatting hints)
  Recipients: toggle between "All Members" checkbox OR a multi-select dropdown (fetch GET /api/users)
  Preview box: shows how the email will look (just the subject + body in a styled div)
  "Send Mail" button

On submit: POST /api/mail/send
  { subject, body, sendToAll: true } OR { subject, body, recipientIds: [...] }

Show result after sending:
  "✅ Successfully sent to 42 members"
  If any failed: "❌ Failed for: email@a.com, email@b.com"

--- ADDITIONAL TASK 2: WarningsAdmin.jsx ---
Route in admin sidebar: "Warnings"

Top section: "Issue New Warning" button → modal:
  Select Member (dropdown from GET /api/users)
  Reason (textarea, required)
  Severity (dropdown: mild / moderate / severe)
  Submit → POST /api/warnings

Table of all warnings (GET /api/warnings):
  Columns: Member Name, Reason, Severity (colored badge), Issued By, Date, Acknowledged
  Severity badges: mild=yellow, moderate=orange, severe=red
  Filter dropdown: All / Mild / Moderate / Severe
  Filter dropdown: All / Acknowledged / Unacknowledged

--- ADDITIONAL TASK 3: Debt Management in MemberDetail.jsx ---
In the existing MemberDetail.jsx page (the tabbed view), add a "Debt" tab:

Shows: Current debt amount (large number, red if >0, green if 0)
Debt history table: Amount | Reason | Operation | Changed By | Date

"Update Debt" button (board only) → small modal:
  Operation: Add / Subtract / Set (dropdown)
  Amount: number input
  Reason: text input
  Submit → PATCH /api/users/:id/debt

--- ADDITIONAL TASK 4: Notification Bell in Navbar ---
(Coordinate with Chirag who handles SocketContext)
Import useSocket from SocketContext.

Add a bell icon in the admin sidebar header (top right):
- Badge count (number of unread notifications)
- Clicking opens a dropdown list of recent notifications (store in useState array)

const socket = useSocket()
useEffect(() => {
  if (!socket) return
  socket.on('new_notice', (data) => addNotification('Notice', data.title))
  socket.on('new_meeting', (data) => addNotification('Meeting', data.title))
  socket.on('task_assigned', (data) => addNotification('Task', data.taskTitle))
  return () => {
    socket.off('new_notice')
    socket.off('new_meeting')
    socket.off('task_assigned')
  }
}, [socket])

Each notification in dropdown: [icon] "New notice: Club Meeting Update" — just now
"Clear all" button at bottom of dropdown.

### Missing Coordination Details To Add

Follow `MASTER.md` if any instruction conflicts with this file.

Add these constraints without removing the text above:
- You also own `AdminLayout.jsx`.
- Agrim owns the top-level `/admin/*` route wiring in `App.jsx`; do not edit `App.jsx`.
- Keep all admin work inside admin pages plus `api/axios.js` to avoid merge conflicts.
