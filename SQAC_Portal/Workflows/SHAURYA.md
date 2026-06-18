### 🟠 Shaurya — Backend (Chat + Socket.IO + Mail + Certificates)
Files: models/Message.js, models/Certificate.js, socket/chat.socket.js, all chat/mail/certificate routes + controllers

### Prompt
You are building the Chat, Mass Mailing, and Certificate Generator modules for a Club Portal backend. Tech stack: Node.js, Express, MongoDB, Socket.IO, Nodemailer.

Import but do not modify:
- middleware/auth.middleware.js → verifyToken
- middleware/role.middleware.js → requireRole
- models/User.js → for referencing users

--- MODEL 1: Message ---
Fields:
  sender: { type: ObjectId, ref: 'User', required: true }
  content: String (required)
  chatType: { type: String, enum: ['group', 'direct'] }
  receiver: { type: ObjectId, ref: 'User' }  // only for direct messages, null for group
  timestamp: Date (default: Date.now)
  readBy: [{ type: ObjectId, ref: 'User' }]  // for read receipts

--- MODEL 2: Certificate ---
Fields:
  issuedTo: { type: ObjectId, ref: 'User', required: true }
  issuedBy: { type: ObjectId, ref: 'User' }
  type: { type: String, enum: ['participation', 'completion', 'appreciation', 'custom'] }
  title: String
  description: String
  issuedAt: Date (default: Date.now)
  pdfUrl: String  // Firebase storage URL of generated PDF

--- SOCKET.IO SETUP (socket/chat.socket.js) ---
Export a function initSocket(server) that sets up Socket.IO:

const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')

module.exports = function initSocket(server) {
  const io = new Server(server, { cors: { origin: process.env.CLIENT_URL, credentials: true } })

  // Auth middleware for socket: verify JWT from handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Not authenticated'))
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.user = decoded
      next()
    } catch { next(new Error('Invalid token')) }
  })

  io.on('connection', (socket) => {
    console.log('User connected:', socket.user.username)

    // Join group room
    socket.join('group_chat')

    // Handle group message
    socket.on('group_message', async (data) => {
      const message = await Message.create({
        sender: socket.user.userId,
        content: data.content,
        chatType: 'group'
      })
      await message.populate('sender', 'name username profilePic')
      io.to('group_chat').emit('new_group_message', message)
    })

    // Handle direct message
    socket.on('direct_message', async (data) => {
      // data = { receiverId, content }
      const message = await Message.create({
        sender: socket.user.userId,
        receiver: data.receiverId,
        content: data.content,
        chatType: 'direct'
      })
      await message.populate('sender', 'name username profilePic')
      // Emit to sender and receiver only
      socket.emit('new_direct_message', message)
      io.to(`user_${data.receiverId}`).emit('new_direct_message', message)
    })

    // Join personal room for direct messages
    socket.join(`user_${socket.user.userId}`)

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.user.username)
    })
  })
}

--- CHAT REST ROUTES ---
GET /api/chat/group?before=<timestamp>&limit=50
  → fetch last 50 group messages, paginated. Populate sender name+username+profilePic

GET /api/chat/direct/:userId?before=<timestamp>&limit=50
  → fetch direct conversation between logged-in user and :userId

--- MAIL ROUTES ---
POST /api/mail/send
  requireRole board
  Body: { subject, body, recipientIds[] OR sendToAll: true }
  Use Nodemailer to send emails. SMTP config from .env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
  If sendToAll: true, fetch all users and send to all emails
  Return: { sent: count, failed: [] }

--- CERTIFICATE ROUTES ---
POST /api/certificate/generate
  requireRole board, domain_lead
  Body: { userId, type, title, description }
  - Generate a simple HTML certificate string (with member name, title, issued date, issued by name)
  - Use the 'html-pdf' or 'puppeteer' npm package to convert HTML → PDF buffer
  - Upload PDF to Firebase Storage (use firebase-admin SDK), get download URL
  - Save Certificate doc to MongoDB with pdfUrl
  - Return the pdfUrl

GET /api/certificate/my
  → get own certificates (verifyToken)
  Returns array of Certificate docs

GET /api/certificate/user/:userId
  requireRole board, domain_lead
  → get all certificates for a specific user

In app.js (main server file created by Mahik), import your initSocket function:
const initSocket = require('./socket/chat.socket')
const server = require('http').createServer(app)
initSocket(server)
server.listen(PORT)  // use server.listen instead of app.listen


--- ADDITIONAL TASK: Real-time Notification Events ---
In your chat.socket.js, add a notification emission system.
Other route controllers will call this to push real-time alerts.

Create a helper: src/socket/notifier.js
let _io = null
const notifier = {
  init(io) { _io = io },
  
  // Send a notification to a specific user
  toUser(userId, event, data) {
    if (_io) _io.to(`user_${userId}`).emit(event, data)
  },
  
  // Broadcast to all connected users
  toAll(event, data) {
    if (_io) _io.emit(event, data)
  }
}
module.exports = notifier

In your initSocket function, after creating io:
const notifier = require('./notifier')
notifier.init(io)

Export notifier so other controllers can import it:
// In any controller, e.g. warning.controller.js:
const notifier = require('../socket/notifier')
// After creating a warning:
notifier.toUser(warning.issuedTo, 'new_warning', {
  message: `You received a warning: ${warning.reason}`,
  severity: warning.severity
})

Do the same for these notification triggers (you don't write these — the other person writes them in their controller, they just import your notifier):
- New notice published → notifier.toAll('new_notice', { title, content })
- Task assigned → notifier.toUser(assignedTo, 'task_assigned', { taskTitle })
- Warning issued → notifier.toUser(issuedTo, 'new_warning', { reason, severity })
- Onboarding approved → notifier.toUser(userId, 'account_approved', { message: 'Your account has been approved!' })
- Meeting scheduled → notifier.toAll('new_meeting', { title, scheduledAt })

Tell Mahik, Manya, and Tusharika to import notifier and fire these events in their controllers at the relevant points.

### Missing Coordination Details To Add

Follow `MASTER.md` if any instruction conflicts with this file.

Add these constraints without removing the text above:
- You also own backend Firebase Admin setup in `config/firebaseAdmin.js`.
- Keep notifier API stable because other backend teammates depend on it.
- Mahik owns `server.js`; you only provide the socket initializer and notifier helper.
