/**
 * Centralized email templates for SQAC Portal.
 * All templates use the SQAC dark-theme branding.
 */

const brandHeader = `
  <div style="text-align: center; margin-bottom: 24px;">
    <div style="display: inline-block; padding: 6px 16px; border-radius: 8px; background: linear-gradient(135deg, #f183ff, #ff6c95); color: #000; font-weight: bold; font-size: 20px;">
      SQAC
    </div>
  </div>`;

const footer = `
  <hr style="border: 0; border-top: 1px solid #221d3f; margin-top: 36px;" />
  <p style="font-size: 11px; color: #6b6679; text-align: center;">This is an automated notification from the SQAC Portal. Please do not reply directly to this message.</p>`;

const wrap = (content) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #1f1a3a; border-radius: 16px; background-color: #0c0a15; color: #f5eefc;">
    ${brandHeader}
    ${content}
    ${footer}
  </div>`;

const pill = (text, color = '#f183ff') => `
  <span style="display:inline-block; padding: 3px 10px; border-radius: 20px; background: ${color}18; border: 1px solid ${color}40; color: ${color}; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">${text}</span>`;

const ctaButton = (href, label, color = 'linear-gradient(to right, #f183ff, #ff6c95)') => `
  <div style="text-align: center; margin: 32px 0;">
    <a href="${href}" style="background: ${color}; color: #000; font-weight: bold; padding: 14px 36px; text-decoration: none; border-radius: 30px; display: inline-block; box-shadow: 0 4px 20px rgba(241,131,255,0.35); font-size: 14px;">${label}</a>
  </div>`;

const infoRow = (label, value) => `
  <tr>
    <td style="padding: 9px 12px; color: #aea9b6; border-bottom: 1px solid #221d3f; font-size: 13px; width: 38%;">${label}</td>
    <td style="padding: 9px 12px; color: #f5eefc; border-bottom: 1px solid #221d3f; font-weight: 600; font-size: 13px;">${value || '—'}</td>
  </tr>`;

const table = (rows) => `
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #221d3f; border-radius: 10px; overflow: hidden;">
    ${rows}
  </table>`;

// ────────────────────────────────────────────────────────────────────────────
// 1. Registration Received  (→ new user, after POST /user/create)
// ────────────────────────────────────────────────────────────────────────────
export const registrationReceivedEmail = (user) => wrap(`
  <h2 style="color: #81ecff; text-align: center; margin-bottom: 24px;">Application Received — Pending Review</h2>
  <p>Dear <strong>${user.name}</strong>,</p>
  <p>Thank you for registering on the SQAC Portal. Your application has been received and is currently <strong>awaiting review</strong> by the Secretary. You cannot log in yet.</p>
  <p>You will receive a separate <em>"Welcome to SQAC"</em> email once your account has been approved.</p>
  <h3 style="color: #f183ff; margin-top: 28px;">What happens next?</h3>
  <ul style="line-height: 1.8; padding-left: 20px;">
    <li>The Secretary will review your registration details.</li>
    <li>You will be notified via email about the approval or rejection.</li>
    <li>Once approved, you can log in using the credentials you set during registration.</li>
  </ul>
`);

// ────────────────────────────────────────────────────────────────────────────
// 2. New Registration Alert  (→ secretaries, when user registers or onboards)
// ────────────────────────────────────────────────────────────────────────────
export const newRegistrationAlertEmail = (user) => wrap(`
  <h2 style="color: #f183ff; text-align: center; margin-bottom: 24px;">New Member Registration</h2>
  <p>A new user has registered on the SQAC Portal and is awaiting your approval.</p>
  ${table(`
    ${infoRow('Name', `<strong>${user.name}</strong>`)}
    ${infoRow('Email', user.email)}
    ${infoRow('Reg Number', user.regNum)}
    ${infoRow('Core Domain', user.coreDomain)}
    ${infoRow('Sub Domain', user.subDomain)}
    ${infoRow('Applied Role', `<span style="color:#f183ff;font-weight:bold;">${user.role || 'member'}</span>`)}
  `)}
  <p>Please log in to the SQAC Portal to approve or reject this registration.</p>
`);

// ────────────────────────────────────────────────────────────────────────────
// 3. Onboarding Confirmation  (→ user, after Step 2 onboarding completed)
// ────────────────────────────────────────────────────────────────────────────
export const onboardingConfirmationEmail = (user) => wrap(`
  <h2 style="color: #81ecff; text-align: center; margin-bottom: 24px;">Application Submitted!</h2>
  <p>Hi <strong>${user.name}</strong>,</p>
  <p>Your onboarding is complete! Your application has been submitted to the Secretary for review.</p>

  ${table(`
    ${infoRow('Applied Role', `<span style="color:#f183ff;font-weight:bold;">${user.role || 'member'}</span>`)}
    ${infoRow('Core Domain', user.coreDomain || '—')}
    ${infoRow('Sub Domain', user.subDomain || '—')}
    ${infoRow('Registration No.', user.regNum || '—')}
  `)}

  <div style="margin: 24px 0; padding: 16px 20px; border-left: 4px solid #81ecff; background: rgba(129,236,255,0.06); border-radius: 0 10px 10px 0;">
    <p style="margin: 0; color: #81ecff; font-weight: 600; font-size: 13px;">⏳ What's next?</p>
    <p style="margin: 8px 0 0 0; color: #aea9b6; font-size: 13px; line-height: 1.6;">The Secretary will review your application and you will receive an email once a decision has been made. This usually takes 1–3 business days.</p>
  </div>
`);

// ────────────────────────────────────────────────────────────────────────────
// 4. Approval  (→ user, when account is approved)
// ────────────────────────────────────────────────────────────────────────────
export const approvalEmail = (user, loginLink) => wrap(`
  <h2 style="color: #ff6c95; text-align: center; margin-bottom: 24px;">Welcome to SQAC! 🎉</h2>
  <p>Dear <strong>${user.name}</strong>,</p>
  <p>Great news — your account on the SQAC Portal has been <strong>approved</strong> by the Secretary. You are now an active member!</p>
  <p>Log in to access your dashboard, participate in meetings, view notices, and collaborate on projects.</p>

  ${ctaButton(loginLink, 'Login to Portal')}

  <h3 style="color: #f183ff; border-bottom: 1px solid #332b56; padding-bottom: 8px; margin-top: 28px;">Terms &amp; Portal Conduct:</h3>
  <ul style="line-height: 1.6; padding-left: 20px; color: #aea9b6; font-size: 13px;">
    <li>All technical assignments and metrics will be monitored within the portal environment.</li>
    <li>Maintain confidentiality of your login credentials and system assets.</li>
    <li>Ensure active participation and timely updates on all assigned dashboard tasks.</li>
  </ul>

  <p style="font-size: 12px; color: #6b6679;">If the button above doesn't work: <a href="${loginLink}" style="color: #81ecff;">${loginLink}</a></p>
`);

// ────────────────────────────────────────────────────────────────────────────
// 5. Rejection  (→ user, when application is rejected)
// ────────────────────────────────────────────────────────────────────────────
export const rejectionEmail = (user, reason) => wrap(`
  <h2 style="color: #ff6c95; text-align: center; margin-bottom: 24px;">Application Status Update</h2>
  <p>Dear <strong>${user.name}</strong>,</p>
  <p>Thank you for your interest in joining the SQAC Portal. After reviewing your application, we regret to inform you that your request for portal access has been <strong>declined</strong> at this time.</p>

  ${reason ? `
  <div style="margin: 24px 0; padding: 16px 20px; border-left: 4px solid #ff6c95; background: rgba(255,108,149,0.08); border-radius: 0 8px 8px 0;">
    <p style="color: #aea9b6; font-size: 12px; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.1em;">Reason from Administrator</p>
    <p style="color: #f5eefc; margin: 0; line-height: 1.6;">${reason}</p>
  </div>` : `
  <p style="color: #aea9b6;">This decision is typically based on incomplete credentials, matching requirements, or domain availability.</p>`}

  <p>If you believe this was in error, please reach out to the club administration for further clarification.</p>
`);

// ────────────────────────────────────────────────────────────────────────────
// 6. Meeting Scheduled  (→ relevant members, when a new meeting is created)
// ────────────────────────────────────────────────────────────────────────────
export const meetingScheduledEmail = (meeting, calendarLink) => wrap(`
  <h2 style="color: #f183ff; text-align: center; margin-bottom: 24px;">📅 New Meeting Scheduled</h2>
  <p>A new meeting has been scheduled that you are part of. Here are the details:</p>

  <div style="margin: 24px 0; padding: 20px 24px; border: 1px solid #2a1f4a; border-radius: 12px; background: rgba(241,131,255,0.04);">
    <h3 style="color: #f5eefc; margin: 0 0 16px 0; font-size: 18px;">${meeting.title}</h3>
    ${table(`
      ${infoRow('Date', new Date(meeting.startDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}
      ${infoRow('Time', meeting.startTime || '—')}
      ${infoRow('Scope', meeting.teamScope || 'All Teams')}
      ${meeting.description ? infoRow('Agenda', meeting.description) : ''}
    `)}
  </div>

  ${meeting.meetlink ? `
  ${ctaButton(meeting.meetlink, 'Join Meeting', 'linear-gradient(to right, #81ecff, #f183ff)')}
  ` : ''}

  ${calendarLink ? `
  <div style="text-align: center; margin-top: -8px;">
    <a href="${calendarLink}" style="font-size: 12px; color: #aea9b6; text-decoration: none;">+ Add to Google Calendar</a>
  </div>` : ''}

  <p style="color: #aea9b6; font-size: 13px; margin-top: 24px;">You received this because you are part of the <strong style="color:#f183ff;">${meeting.teamScope || 'All'}</strong> team scope.</p>
`);

// ────────────────────────────────────────────────────────────────────────────
// 7. Project Assigned  (→ each team member, when team is auto-assigned)
// ────────────────────────────────────────────────────────────────────────────
export const projectAssignedEmail = (memberName, project, memberRole, portalLink) => wrap(`
  <h2 style="color: #81ecff; text-align: center; margin-bottom: 24px;">🚀 Project Assigned to You</h2>
  <p>Hi <strong>${memberName}</strong>,</p>
  <p>You have been assigned to a new project on the SQAC Portal. Here's a brief:</p>

  <div style="margin: 24px 0; padding: 20px 24px; border: 1px solid #1a2a4a; border-radius: 12px; background: rgba(129,236,255,0.04);">
    <div style="margin-bottom: 12px;">
      <span style="font-size: 11px; font-weight: 700; color: #81ecff; text-transform: uppercase; letter-spacing: 0.1em;">${project.domain || 'General'}</span>
    </div>
    <h3 style="color: #f5eefc; margin: 0 0 6px 0; font-size: 18px;">${project.title}</h3>
    <p style="color: #aea9b6; margin: 0 0 16px 0; font-size: 13px; line-height: 1.6;">${project.description || ''}</p>
    ${table(`
      ${infoRow('Your Role', `<strong style="color:#f183ff;">${memberRole}</strong>`)}
      ${infoRow('Difficulty', project.difficulty || '—')}
      ${infoRow('Domain', project.domain || '—')}
      ${project.techStack?.length ? infoRow('Tech Stack', project.techStack.join(', ')) : ''}
      ${infoRow('Status', 'In Progress')}
    `)}
  </div>

  <div style="margin: 20px 0; padding: 14px 18px; background: rgba(241,131,255,0.06); border-radius: 10px; border: 1px solid #2a1f4a;">
    <p style="margin: 0; color: #aea9b6; font-size: 12px;">💡 <strong style="color:#f5eefc;">Next steps:</strong> Log in to the portal and navigate to My Projects to see your project workspace, submit deliverables, and communicate with your team.</p>
  </div>

  ${ctaButton(portalLink || '#', 'Open My Projects')}
`);

// ────────────────────────────────────────────────────────────────────────────
// 8. Warning Issued  (→ member, when a warning is issued by a lead/secretary)
// ────────────────────────────────────────────────────────────────────────────
export const warningEmail = (user, reason, issuedByName) => wrap(`
  <h2 style="color: #ff6c95; text-align: center; margin-bottom: 24px;">⚠️ Official Warning</h2>
  <p>Dear <strong>${user.name}</strong>,</p>
  <p>You have received an official warning from the SQAC administration. Please review the details below carefully.</p>

  <div style="margin: 24px 0; padding: 18px 22px; border-left: 4px solid #ff6c95; background: rgba(255,108,149,0.07); border-radius: 0 10px 10px 0;">
    <p style="color: #aea9b6; font-size: 11px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.12em;">Reason for Warning</p>
    <p style="color: #f5eefc; margin: 0; font-size: 14px; line-height: 1.7;">${reason}</p>
  </div>

  ${table(`
    ${infoRow('Issued By', issuedByName || 'SQAC Administration')}
    ${infoRow('Date', new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))}
  `)}

  <div style="margin: 24px 0; padding: 14px 18px; background: rgba(255,108,149,0.05); border-radius: 10px; border: 1px solid rgba(255,108,149,0.2);">
    <p style="margin: 0; color: #aea9b6; font-size: 13px; line-height: 1.6;">Repeated warnings may result in suspension or removal from the portal. If you believe this warning was issued in error, please contact a lead or the Secretary directly.</p>
  </div>
`);

// ────────────────────────────────────────────────────────────────────────────
// 9. Certificate Issued  (→ recipient, when certificate is generated)
// ────────────────────────────────────────────────────────────────────────────
export const certificateIssuedEmail = (name, title, imageUrl, certLink, linkedInUrl) => wrap(`
  <h2 style="color: #f183ff; text-align: center; margin-bottom: 8px;">🏆 Certificate Issued</h2>
  <p style="text-align: center; color: #aea9b6; margin-top: 0;">Congratulations on your achievement</p>

  <div style="margin: 24px 0; padding: 24px; border: 1px solid #2a1f4a; border-radius: 14px; background: rgba(241,131,255,0.04); text-align: center;">
    <p style="color: #aea9b6; font-size: 13px; margin: 0 0 4px 0;">Issued to</p>
    <h3 style="color: #f5eefc; margin: 0 0 8px 0; font-size: 22px;">${name}</h3>
    <p style="color: #aea9b6; font-size: 13px; margin: 0 0 12px 0;">for successfully completing</p>
    <h4 style="color: #f183ff; margin: 0; font-size: 16px;">${title}</h4>
  </div>

  ${imageUrl ? `
  <div style="text-align: center; margin: 20px 0;">
    <img src="${imageUrl}" alt="Certificate" style="max-width: 100%; border-radius: 10px; border: 1px solid #2a1f4a;" />
  </div>` : ''}

  <div style="text-align: center; margin: 24px 0;">
    ${ctaButton(certLink, 'View & Download Certificate')}
  </div>

  ${linkedInUrl ? `
  <div style="text-align: center; margin: 8px 0 24px 0;">
    <a href="${linkedInUrl}" style="display:inline-block; padding: 12px 28px; background: #0077b5; color: #fff; text-decoration: none; border-radius: 30px; font-size: 13px; font-weight: bold;">🔗 Share on LinkedIn</a>
  </div>` : ''}

  <p style="text-align: center; color: #6b6679; font-size: 12px;">You can verify the authenticity of this certificate using the credential link above.</p>
`);

// ────────────────────────────────────────────────────────────────────────────
// 10. MOM Created  (→ attendees, after a MOM is published)
// ────────────────────────────────────────────────────────────────────────────
export const momCreatedEmail = (mom, recipientName, portalLink) => wrap(`
  <h2 style="color: #81ecff; text-align: center; margin-bottom: 24px;">📝 Meeting Minutes Published</h2>
  <p>Hi <strong>${recipientName}</strong>,</p>
  <p>The Minutes of Meeting (MOM) for a session you were part of have been published on the SQAC Portal.</p>

  <div style="margin: 24px 0; padding: 20px 24px; border: 1px solid #1a2a4a; border-radius: 12px; background: rgba(129,236,255,0.04);">
    <h3 style="color: #f5eefc; margin: 0 0 16px 0; font-size: 17px;">${mom.title}</h3>
    ${table(`
      ${infoRow('Date', mom.date ? new Date(mom.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—')}
      ${infoRow('Start Time', mom.startTime || '—')}
      ${infoRow('Duration', mom.duration || '—')}
      ${infoRow('Team Scope', mom.teamScope || 'All')}
    `)}
  </div>

  ${mom.discussedPoints?.length ? `
  <div style="margin: 20px 0;">
    <h4 style="color: #f183ff; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em;">Points Discussed</h4>
    <ul style="color: #aea9b6; font-size: 13px; line-height: 1.8; padding-left: 20px; margin: 0;">
      ${mom.discussedPoints.map((p) => `<li>${p}</li>`).join('')}
    </ul>
  </div>` : ''}

  ${mom.decisions?.length ? `
  <div style="margin: 20px 0;">
    <h4 style="color: #81ecff; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em;">Decisions Taken</h4>
    <ul style="color: #aea9b6; font-size: 13px; line-height: 1.8; padding-left: 20px; margin: 0;">
      ${mom.decisions.map((d) => `<li>${d}</li>`).join('')}
    </ul>
  </div>` : ''}

  ${mom.actionItems?.length ? `
  <div style="margin: 20px 0; padding: 14px 18px; background: rgba(241,131,255,0.06); border-radius: 10px; border: 1px solid #2a1f4a;">
    <h4 style="color: #f183ff; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em;">Action Items</h4>
    <ul style="color: #aea9b6; font-size: 13px; line-height: 1.8; padding-left: 20px; margin: 0;">
      ${mom.actionItems.map((a) => `<li>${typeof a === 'object' ? (a.task || JSON.stringify(a)) : a}</li>`).join('')}
    </ul>
  </div>` : ''}

  ${mom.nextMeetDate ? `
  <div style="margin: 20px 0; padding: 12px 18px; background: rgba(129,236,255,0.05); border-radius: 10px;">
    <p style="margin: 0; color: #81ecff; font-size: 13px;">📅 <strong>Next Meeting:</strong> ${new Date(mom.nextMeetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}${mom.nextMeetAgenda ? ` — ${mom.nextMeetAgenda}` : ''}</p>
  </div>` : ''}

  ${ctaButton(portalLink || '#', 'View Full MOM', 'linear-gradient(to right, #81ecff, #f183ff)')}
`);

// ────────────────────────────────────────────────────────────────────────────
// 11. New Notice  (→ domain-relevant members, when a notice is posted)
// ────────────────────────────────────────────────────────────────────────────
export const newNoticeEmail = (notice, portalLink) => wrap(`
  <h2 style="color: #f183ff; text-align: center; margin-bottom: 24px;">📢 New Notice Posted</h2>
  <p>A new notice has been posted on the SQAC Portal${notice.domain && notice.domain !== 'Board' ? ` for the <strong>${notice.domain}</strong> team` : ''} by <strong>${notice.author || 'SQAC'}</strong>.</p>

  <div style="margin: 24px 0; padding: 20px 24px; border: 1px solid #2a1f4a; border-radius: 12px; background: rgba(241,131,255,0.04);">
    <div style="margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
      ${notice.domain ? pill(notice.domain) : ''}
      ${notice.subDomain ? pill(notice.subDomain, '#81ecff') : ''}
    </div>
    <h3 style="color: #f5eefc; margin: 0 0 10px 0; font-size: 18px;">${notice.title}</h3>
    <p style="color: #aea9b6; margin: 0; font-size: 13px; line-height: 1.7;">${notice.desc || ''}</p>
    ${notice.link ? `<p style="margin: 12px 0 0 0;"><a href="${notice.link}" style="color: #81ecff; font-size: 13px;">🔗 ${notice.link}</a></p>` : ''}
  </div>

  ${ctaButton(portalLink || '#', 'View on Noticeboard', 'linear-gradient(to right, #f183ff, #ff6c95)')}

  <p style="color: #6b6679; font-size: 12px; text-align: center;">You received this because you are a member of the SQAC Portal.</p>
`);
