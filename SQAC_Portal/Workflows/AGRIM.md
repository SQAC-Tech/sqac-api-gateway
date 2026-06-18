### 🟡 Agrim — Frontend (Auth + Onboarding + Member Pages + App Routing)
Files: All pages/auth/, pages/member/, components/common/, App.jsx
Add: Meetings Page + Attendance View + Firebase Setup + Toast System

### Prompt

You are building the frontend Auth flow, Onboarding, and Member-side pages for a Club Portal using React and Tailwind CSS.

SETUP:
- Use React Router v6 for routing
- Use axios for API calls (there will be a shared api/axios.js with base URL and auth token already configured — just import it)
- Use React Context for auth state (AuthContext already provided — just use useAuth() hook)
- All pages go inside src/pages/, components in src/components/common/

DESIGN GUIDELINES:
- Use Tailwind CSS only
- Color scheme: use a dark navy primary (#1e293b), accent color teal (#0d9488)
- Clean, minimal, professional — this is an internal club management portal
- Mobile responsive

--- PAGE 1: Login.jsx ---
A centered login card with:
- Club logo/name at top
- Username input field
- Password input field (with show/hide toggle)
- Login button
- On submit: POST to /api/auth/login with { username, password }
- On success: save JWT to localStorage, save user info to AuthContext, redirect to /dashboard
- Show error message if login fails (e.g., "Account pending approval" or "Invalid credentials")

--- PAGE 2: Onboarding.jsx (Multi-step form) ---
This is shown to new members after they register. 3 steps:
Step 1 - Personal Info Form:
  Fields: Full Name, Email, Domain (dropdown: tech/design/marketing/content/management), Department, Mobile Number
  Submit → POST /api/auth/register
  On success: show the generated username and password in a styled card. Tell user to save these. "Your credentials have been generated. Please save them!"

Step 2 - Member Joining Undertaking:
  Show a text block (placeholder: "I, [name], agree to abide by the club's rules and regulations...")
  A signature pad component at bottom (use the library react-signature-canvas OR just a simple checkbox "I digitally sign this document")
  Button: "Sign & Continue"

Step 3 - Code of Conduct:
  Similar to step 2 but with CoC text
  After signing: POST /api/auth/complete-onboarding with { undertakingSigned: true, cocSigned: true }
  Show success screen: "Your registration is complete! Awaiting board approval. You will be notified."

Use a step indicator at top (Step 1 of 3 → Step 2 of 3 → Step 3 of 3).

--- PAGE 3: Dashboard.jsx (Member Home) ---
After login, members land here. Show:
- Welcome message with their name
- Quick stats cards: "Your Tasks: X", "Your Projects: X", "Upcoming Meetings: X"
- Recent Notices list (fetch from GET /api/notices, show top 3)
- Recent warnings if any (fetch from GET /api/warnings/my)
Use GET /api/users/me to get logged in user info.

--- PAGE 4: Profile.jsx ---
Show logged in user's profile:
- Avatar (initials-based if no pic) 
- Fields: Name, Username, Email, Domain, Department, Mobile, Position, Debt, Role badge
- Edit button → opens same page in edit mode with input fields
- PUT /api/users/me to save changes

--- PAGE 5: MyTasks.jsx ---
Fetch GET /api/tasks/mine
Show tasks in a list with status badges (pending/in-progress/done)
Each task: title, description, due date, status
Clicking a task opens a modal showing full details
Member can PATCH /api/tasks/:id/status to update status

--- PAGE 6: MyProjects.jsx ---
Fetch GET /api/projects (backend already filters by member if needed)
Show as cards: project title, domain, deadline, status badge

--- COMPONENTS ---
Navbar.jsx:
- Club name on left
- Nav links: Dashboard | My Tasks | My Projects | Chat | Notices
- Right side: user avatar dropdown (Profile | Logout)
- If user role is board/domain_lead/associate: show "Admin Panel" link

ProtectedRoute.jsx:
- Checks if JWT exists in localStorage and user is logged in
- If not: redirect to /login

RoleGuard.jsx:
- Takes a prop: allowedRoles={['board', 'domain_lead']}
- If user's role not in allowedRoles: shows "Access Denied" page or null

App.jsx (routing):
<Routes>
  <Route path="/" element={<Navigate to="/login" />} />
  <Route path="/login" element={<Login />} />
  <Route path="/onboarding" element={<Onboarding />} />
  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
  <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
  <Route path="/my-projects" element={<ProtectedRoute><MyProjects /></ProtectedRoute>} />
  <Route path="/chat" element={<ProtectedRoute><ChatLayout /></ProtectedRoute>} />
  <Route path="/notices" element={<ProtectedRoute><NoticeBoard /></ProtectedRoute>} />
  <Route path="/admin/*" element={<ProtectedRoute><RoleGuard allowedRoles={['board','domain_lead','associate']}><AdminDashboard /></RoleGuard></ProtectedRoute>} />
</Routes>


### Prompt additional

--- ADDITIONAL TASK 1: MyMeetings.jsx ---
Route: /meetings

Fetch GET /api/meetings/upcoming for future meetings.
Also fetch all meetings for past ones (GET /api/meetings).
Split into two tabs: "Upcoming" and "Past"

Each meeting card shows:
  - Title, date/time (formatted nicely: "Monday, Apr 7 at 3:00 PM")
  - Meeting link button (if meetingLink exists → opens in new tab)
  - "View MOM" button (only shows if meeting is in Past tab)
    → on click: fetch GET /api/meetings/:id/mom → show in a modal

My Attendance section (below the meetings list):
  Fetch GET /api/attendance/my
  Show a simple summary card: "Attendance: 7/10 meetings — 70%"
  Below: a table of past meetings with your status (Present ✓ / Absent ✗ / Late ⚠)

Add /meetings to your App.jsx routes:
<Route path="/meetings" element={<ProtectedRoute><MyMeetings /></ProtectedRoute>} />
Add "Meetings" to Navbar links.

--- ADDITIONAL TASK 2: Firebase Frontend Setup ---
Install: npm install firebase

Create src/firebase.js:
import { initializeApp } from 'firebase/app'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
}
const app = initializeApp(firebaseConfig)
export const storage = getStorage(app)
export default app

In your Onboarding.jsx Step 2 and Step 3 (digital signatures):
After the user signs (or checks the checkbox), upload the signature as a PNG/text file to Firebase Storage:
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../firebase'

const uploadSignature = async (userId, type) => {
  // type = 'undertaking' or 'coc'
  const content = `Digitally signed by userId:${userId} at ${new Date().toISOString()}`
  const blob = new Blob([content], { type: 'text/plain' })
  const storageRef = ref(storage, `signatures/${userId}/${type}.txt`)
  await uploadBytes(storageRef, blob)
  const url = await getDownloadURL(storageRef)
  return url  // store this URL if needed, or just proceed
}

Also handle profile picture upload in Profile.jsx:
- Add a "Change Photo" button
- On file select: uploadBytes to Firebase Storage path `avatars/${userId}`
- Get download URL → PUT /api/users/me with { profilePic: downloadURL }

--- ADDITIONAL TASK 3: Toast Notification System ---
Install: npm install react-hot-toast

In your main.jsx or App.jsx, add:
import { Toaster } from 'react-hot-toast'
// Inside your JSX tree:
<Toaster position="top-right" toastOptions={{ duration: 3000 }} />

Now everywhere in the frontend (your pages AND tell Raghav and Chirag to also use this):
import toast from 'react-hot-toast'
// On success:
toast.success('Task updated!')
// On error:
toast.error('Something went wrong')
// On loading (for long operations):
const id = toast.loading('Generating certificate...')
toast.dismiss(id)
toast.success('Certificate ready!')

Also create a src/components/common/Spinner.jsx:
export default function Spinner() {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )
}
Use this everywhere while data is loading (while axios call is pending).

Also create src/components/common/EmptyState.jsx:
export default function EmptyState({ message = "Nothing here yet" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <p className="text-lg">{message}</p>
    </div>
  )
}

### Missing Coordination Details To Add

Follow `MASTER.md` if any instruction conflicts with this file.

Add these constraints without removing the text above:
- You also own `main.jsx` and `AuthContext.jsx`.
- `main.jsx` should wrap `BrowserRouter`, `AuthProvider`, `SocketProvider`, and `Toaster`.
- Onboarding must store and use the `onboardingToken` returned by `/api/auth/register`.
- `Navbar.jsx`, `App.jsx`, and `main.jsx` are yours only; others should not edit them.
- Import Chirag's `NotificationBell` into `Navbar.jsx`.
