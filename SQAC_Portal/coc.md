# IMPLEMENTATION TASK: Mandatory Code of Conduct (COC) Acceptance System

## IMPORTANT: Read Before Making Changes

Before implementing anything:

1. Analyze the existing codebase.
2. Identify:

   * Current authentication flow
   * Current onboarding flow
   * User schema
   * Membership approval workflow
   * Route protection/middleware
   * Existing Google Drive integration
   * Existing admin panel architecture
   * Existing file upload utilities
3. Reuse existing patterns whenever possible.
4. Do NOT create parallel systems if equivalent functionality already exists.
5. Follow existing project conventions, folder structure, naming patterns, UI components, and API architecture.

---

# BUSINESS CONTEXT

The club currently has:

```text
Application
↓
Board Review
↓
Approval
↓
Member Login
```

We want to introduce a mandatory Code of Conduct acceptance step AFTER approval and BEFORE members gain access to the portal.

The Code of Conduct already exists as a PDF.

The PDF already contains a designated signature area.

Members will upload a signature image.

The backend will automatically place the signature into the PDF and generate a signed version.

The signed PDF will be stored in Google Drive.

MongoDB will store metadata and audit information.

---

# TARGET USER FLOW

```text
Application Submitted
        ↓
Board Review
        ↓
Approved
        ↓
First Login
        ↓
Accept Code of Conduct
        ↓
Complete Profile
        ↓
Portal Access
```

---

# MEMBER STATES

Implement a clean progression.

```text
APPLIED
APPROVED
COC_PENDING
PROFILE_PENDING
ACTIVE
```

Expected lifecycle:

```text
APPLIED
↓
APPROVED
↓
COC_PENDING
↓
PROFILE_PENDING
↓
ACTIVE
```

Use existing status fields if available.

Do not introduce unnecessary state duplication.

---

# USER MODEL CHANGES

Extend existing user schema.

Add:

```ts
cocAccepted: boolean

cocAcceptedAt: Date | null

cocVersionAccepted: string | null

profileCompleted: boolean
```

Defaults:

```ts
cocAccepted: false
cocAcceptedAt: null
cocVersionAccepted: null
```

Do not break existing users.

Provide migration-safe implementation.

---

# COC VERSIONING

Create:

```ts
CURRENT_COC_VERSION = "2026-v1"
```

Store accepted version on the user record.

Future COC updates should only require changing this constant.

---

# ROUTE PROTECTION

Approved users should NOT access the dashboard until:

```text
COC Accepted
AND
Profile Completed
```

Required behavior:

```text
Approved User
↓
Login
↓
COC Check
↓
Profile Check
↓
Dashboard
```

Pseudo logic:

```ts
if (!user.cocAccepted) {
  redirect("/accept-coc");
}

if (!user.profileCompleted) {
  redirect("/complete-profile");
}
```

Integrate with existing middleware.

Do not duplicate authentication logic.

---

# NEW PAGE

Create:

```text
/accept-coc
```

Accessible only to authenticated approved members.

---

# PAGE LAYOUT

Display:

```text
--------------------------------
Code of Conduct
--------------------------------

[ Embedded PDF Viewer ]

☐ I have read the Code of Conduct

☐ I agree to abide by the Code of Conduct

Upload Signature

[ Choose File ]

Signature Preview

[ image preview ]

[ Generate Preview ]
```

---

# PDF VIEWER

Requirements:

* Embedded
* Responsive
* Read-only
* Scrollable
* Works on desktop and mobile

Do not require downloading the PDF.

Use the existing COC PDF.

---

# ACCEPTANCE CHECKBOXES

Required:

```text
I have read the Code of Conduct

I agree to abide by the Code of Conduct
```

Submission disabled until both are checked.

---

# SIGNATURE UPLOAD

Allowed:

```text
PNG
JPG
JPEG
```

Validation:

```text
Maximum Size: 2MB

Minimum Width: 200px

Minimum Height: 50px
```

Display preview immediately.

Reject invalid uploads gracefully.

---

# IMPORTANT

DO NOT build:

* Signature drawing canvas
* Signature dragging UI
* Signature placement editor

The placement position is fixed.

Users only upload a signature image.

The backend determines placement.

---

# EXISTING PDF TEMPLATE

Use the official COC PDF.

Do NOT generate a new PDF from scratch.

Process:

```text
Load Existing PDF
↓
Embed Signature
↓
Add Metadata
↓
Generate Signed PDF
```

---

# PDF CONFIGURATION

Create a dedicated config file.

Example:

```ts
export const cocPdfConfig = {
  page: 3,

  signature: {
    x: 380,
    y: 120,
    width: 120,
    height: 50,
  },

  memberName: {
    x: 120,
    y: 120,
  },

  acceptanceDate: {
    x: 120,
    y: 95,
  },
};
```

All coordinates must come from config.

No scattered hardcoded values.

---

# SIGNED PDF PREVIEW

After upload:

Generate preview PDF.

Display:

```text
--------------------------------
Signed COC Preview
--------------------------------

[ PDF Viewer ]

[ Back ]

[ Confirm & Submit ]
```

Nothing should be stored yet.

User must confirm.

---

# GOOGLE DRIVE STORAGE

Use existing Google Drive integration if available.

Otherwise implement Service Account based upload.

Folder:

```text
Club Portal
└── Signed COC
```

File naming:

```text
<memberId>-signed-coc.pdf
```

Example:

```text
DBUG2026-014-signed-coc.pdf
```

Files must remain private.

No public sharing.

---

# MONGODB COLLECTION

Create:

```text
CodeOfConductAcceptance
```

Schema:

```ts
{
  _id: ObjectId,

  userId: ObjectId,

  memberId: string,

  fullName: string,

  acceptedAt: Date,

  cocVersion: string,

  driveFileId: string,

  ipAddress: string,

  userAgent: string,

  createdAt: Date,

  updatedAt: Date,
}
```

Indexes:

```ts
userId
memberId
acceptedAt
driveFileId
```

One acceptance record per user per version.

---

# AUDIT TRAIL

Store:

```ts
acceptedAt
ipAddress
userAgent
cocVersion
driveFileId
```

This data is required for compliance and future verification.

---

# API ENDPOINTS

## Generate Preview

```http
POST /api/coc/preview
```

Input:

```text
multipart/form-data
```

Fields:

```text
signature
```

Responsibilities:

```text
Validate upload
Generate signed PDF
Return preview
```

Response:

```json
{
  "previewUrl": "..."
}
```

---

## Confirm Acceptance

```http
POST /api/coc/confirm
```

Responsibilities:

```text
Upload signed PDF to Google Drive
Create acceptance record
Update user record
Set cocAccepted=true
Set cocAcceptedAt
Set cocVersionAccepted
```

Response:

```json
{
  "success": true
}
```

---

## Get Status

```http
GET /api/coc/status
```

Response:

```json
{
  "accepted": true,
  "version": "2026-v1"
}
```

---

# USER STATUS TRANSITIONS

When approved:

```ts
cocAccepted = false
```

After successful COC acceptance:

```ts
cocAccepted = true
```

Then redirect:

```text
/complete-profile
```

After profile completion:

```ts
profileCompleted = true
```

Then redirect:

```text
/dashboard
```

---

# ADMIN PANEL

Create:

```text
/admin/coc
```

Admin capabilities:

### List Records

Columns:

```text
Name
Member ID
Accepted At
COC Version
```

### Search

Search by:

```text
Name
Member ID
```

### View PDF

Open signed PDF from Google Drive.

---

# RE-ACCEPTANCE SUPPORT

Must support future versions.

Logic:

```ts
if (
  user.cocVersionAccepted !== CURRENT_COC_VERSION
) {
  redirect("/accept-coc");
}
```

This should work automatically when the version changes.

No database migration should be required.

---

# ERROR HANDLING

Handle:

```text
Invalid file type
Oversized file
Corrupt image
Drive upload failure
PDF generation failure
Duplicate acceptance
Network interruption
```

Show user-friendly messages.

Log detailed server-side errors.

---

# SECURITY REQUIREMENTS

Validate:

```text
Authenticated user
Approved member
Valid image type
Valid image size
```

Prevent:

```text
Unauthorized access
Duplicate submissions
Bypassing acceptance
Uploading arbitrary files
```

Use server-side validation.

Do not rely solely on frontend checks.

---

# PERFORMANCE REQUIREMENTS

Use:

```text
Memory buffers
Streaming where possible
```

Avoid:

```text
Temporary disk storage
Large filesystem operations
```

PDF generation should complete within a few seconds.

---

# CODE QUALITY REQUIREMENTS

Follow existing:

```text
Folder structure
API architecture
Component patterns
Naming conventions
Error handling conventions
Styling system
TypeScript standards
```

Use:

```text
Strong typing
Reusable components
Reusable hooks
Reusable services
```

Avoid:

```text
Hardcoded values
Duplicate logic
Monolithic components
```

---

# FINAL DELIVERABLES

Implement:

### Frontend

* COC acceptance page
* PDF viewer
* Signature upload
* Signature preview
* Signed PDF preview
* Confirmation flow

### Backend

* PDF generation service
* Signature embedding
* Google Drive upload
* Acceptance APIs

### Database

* User schema updates
* COC acceptance collection

### Middleware

* Access protection
* COC enforcement
* Profile completion enforcement

### Admin

* Acceptance records
* Search
* View signed PDFs

---

# ACCEPTANCE CRITERIA

Feature is considered complete only when:

1. Approved users are blocked from portal access until COC acceptance.
2. Existing COC PDF is displayed inside the portal.
3. User uploads signature image.
4. Signature is automatically placed in the designated signature area.
5. Signed PDF preview is generated.
6. User confirms acceptance.
7. Signed PDF uploads successfully to Google Drive.
8. Acceptance record is created in MongoDB.
9. User record is updated correctly.
10. User is redirected to profile completion.
11. Middleware prevents bypassing the process.
12. Admins can review acceptance records.
13. Future COC versions can force re-acceptance automatically.
14. Implementation is production-ready and fully integrated with the existing architecture.
