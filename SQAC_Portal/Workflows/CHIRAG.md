### 🟣 Chirag — Frontend (Chat UI + Notices/Warnings + Socket Integration)
Files: context/SocketContext.jsx, pages/chat/, pages/notices/
Add: Notification Bell for Members + Warning Acknowledgment Toast
### Prompt 

You are building the Chat interface and Notices/Warnings display for a Club Portal frontend. Tech stack: React, Tailwind CSS, socket.io-client.

Import and use:
- api from '../api/axios' (Raghav's axios instance — just import it)
- useAuth() hook from AuthContext (Mahik/Agrim built this)

--- FIRST: context/SocketContext.jsx ---
Create a Socket context that:
1. Connects to socket server when user logs in (read token from localStorage)
2. Disconnects on logout
3. Provides the socket instance via useSocket() hook to all children

import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)
export const useSocket = () => useContext(SocketContext)

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    
    const s = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token }
    })
    setSocket(s)
    return () => s.disconnect()
  }, [])
  
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
}

--- PAGE 1: ChatLayout.jsx ---
WhatsApp-style layout:
Left panel (w-1/3): list of conversations
  - "Group Chat" at top (always present, for all members)
  - Below: list of all members for direct messages (fetch GET /api/users, show as contact list)
  - Each contact: avatar (initials), name, last message preview (if any)
  - Search bar to filter members

Right panel (w-2/3): active chat window (GroupChat or DirectChat depending on selection)
  - If nothing selected: show "Select a conversation"
  - Store selected chat in local state: { type: 'group' | 'direct', userId?: string, userName?: string }

--- PAGE 2: GroupChat.jsx ---
Props: none (it's always the group)

On mount:
  - Fetch last 50 group messages: GET /api/chat/group
  - Listen to socket event 'new_group_message'

Layout:
  Header: "Group Chat 🌐" + member count
  Messages area (scrollable, flex-col):
    Each message bubble:
      - Own messages: right-aligned, teal background
      - Others: left-aligned, white background with sender name above
      - Show: avatar initials, sender name, message text, timestamp
  Input area at bottom:
    - Text input + Send button
    - On send: emit socket.emit('group_message', { content })
    - Clear input after send

Infinite scroll: when user scrolls to top, fetch older messages (GET /api/chat/group?before=<oldest message timestamp>)

--- PAGE 3: DirectChat.jsx ---
Props: { userId, userName }

On mount (or when userId changes):
  - Fetch GET /api/chat/direct/:userId
  - Listen to socket event 'new_direct_message' (filter by sender === userId OR receiver === userId)

Layout: Same as GroupChat but:
  Header: avatar + userName + "Direct Message"
  On send: socket.emit('direct_message', { receiverId: userId, content })

--- PAGE 4: NoticeBoard.jsx ---
Fetch GET /api/notices (sort by createdAt desc)

Layout:
  Header: "Notice Board 📢"
  Filter tabs: All | Important (filter isImportant=true)
  Notice cards (full width, stacked):
    - "IMPORTANT" red badge if isImportant
    - Title (large), content (paragraph)
    - Posted by: name, date (format: "2 hours ago" or "Apr 2, 2026")

If user role is board or domain_lead:
  - Show "Post Notice" button at top right
  - Clicking opens a modal:
      Title input, Content textarea, "Mark as Important" checkbox
      Submit → POST /api/notices → refresh list

--- PAGE 5: WarningList.jsx ---
For members: fetch GET /api/warnings/my
For admins (board/domain_lead): fetch GET /api/warnings (all warnings)

Member view:
  If no warnings: "You're doing great! No warnings issued." (green card)
  If warnings exist: warning cards with:
    - Severity badge (mild=yellow, moderate=orange, severe=red)
    - Reason text
    - Issued by, date
    - "Acknowledge" button if acknowledged=false → PATCH /api/warnings/:id/acknowledge → mark as seen

Admin view (board/domain_lead):
  "Issue Warning" button → modal:
    Select Member (dropdown), Reason (textarea), Severity (dropdown)
    Submit → POST /api/warnings → refresh
  Table of all warnings with: Member name, Reason, Severity, Issued by, Date, Acknowledged status

DESIGN NOTES:
- Messages should feel like WhatsApp — clean bubbles, timestamps in small text
- Notices should feel like a bulletin board — card-based, easy to scan
- Warnings should feel serious — red/orange accents for severe warnings

### Additional Prompt 
--- ADDITIONAL TASK 1: Notification Bell Component ---
Create src/components/common/NotificationBell.jsx

This will live in the Navbar (tell Agrim to import it into Navbar.jsx):

import { useSocket } from '../../context/SocketContext'
import { useState, useEffect } from 'react'

export default function NotificationBell() {
  const socket = useSocket()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  
  const unread = notifications.filter(n => !n.read).length
  
  const add = (type, message) => {
    setNotifications(prev => [{ id: Date.now(), type, message, read: false, time: new Date() }, ...prev].slice(0, 20))
  }
  
  useEffect(() => {
    if (!socket) return
    socket.on('new_warning', (d) => add('warning', `Warning issued: ${d.reason}`))
    socket.on('new_notice', (d) => add('notice', `New notice: ${d.title}`))
    socket.on('task_assigned', (d) => add('task', `Task assigned: ${d.taskTitle}`))
    socket.on('account_approved', (d) => add('success', d.message))
    socket.on('new_meeting', (d) => add('meeting', `New meeting: ${d.title}`))
    return () => {
      socket.off('new_warning')
      socket.off('new_notice')
      socket.off('task_assigned')
      socket.off('account_approved')
      socket.off('new_meeting')
    }
  }, [socket])
  
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => { setOpen(!open); markAllRead() }}>
        🔔 {unread > 0 && <span>{unread}</span>}
      </button>
      {open && (
        <div className="notification-dropdown">  {/* style this with Tailwind */}
          {notifications.length === 0 && <p>No notifications yet</p>}
          {notifications.map(n => (
            <div key={n.id} className={`notif-item type-${n.type}`}>
              <p>{n.message}</p>
              <small>{new Date(n.time).toLocaleTimeString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

Style the dropdown with Tailwind: absolute positioned, white card, shadow,
max-h-80 overflow-y-auto, min-w-72.
Color-code by type: warning=red-50, notice=blue-50, task=teal-50, success=green-50

--- ADDITIONAL TASK 2: Notifier calls in Tusharika's controllers ---
Tusharika doesn't know how to import the notifier. Help her by telling her exactly what to add:

In notice.controller.js, after successfully creating a notice, add:
const notifier = require('../socket/notifier')
notifier.toAll('new_notice', { title: notice.title, content: notice.content })

In warning.controller.js, after creating a warning, add:
const notifier = require('../socket/notifier')
notifier.toUser(warning.issuedTo.toString(), 'new_warning', {
  reason: warning.reason,
  severity: warning.severity
})

(Just give Tusharika these exact 2 lines to paste into her controllers —
you don't write her controllers, just help her add these snippets.)

### Missing Coordination Details To Add

Follow `MASTER.md` if any instruction conflicts with this file.

Add these constraints without removing the text above:
- You own `SocketContext.jsx` and `NotificationBell.jsx` only on the shared shell side.
- Agrim owns `Navbar.jsx`, `App.jsx`, and `main.jsx`; do not edit those files.
- Your socket provider should reconnect cleanly when the auth token changes.
