export const getMeetingEmailTemplate = (meeting, calendarLink) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Meeting Invitation</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 500px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px 20px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .header h2 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          background: #fff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
          border-radius: 0 0 10px 10px;
        }
        .meeting-details {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #667eea;
        }
        .detail-row {
          margin: 12px 0;
        }
        .detail-label {
          font-weight: 600;
          color: #555;
          margin-bottom: 4px;
        }
        .detail-value {
          color: #333;
          word-break: break-all;
        }
        .meeting-link {
          background: #e8f0fe;
          padding: 12px;
          border-radius: 6px;
          margin: 15px 0;
        }
        .meeting-link a {
          color: #1a73e8;
          text-decoration: none;
          word-break: break-all;
        }
        .btn {
          display: inline-block;
          background: #4285f4;
          color: white;
          text-decoration: none;
          padding: 12px 30px;
          border-radius: 6px;
          font-weight: 500;
          margin: 15px 0;
          transition: background 0.3s;
        }
        .btn:hover {
          background: #3367d6;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #e0e0e0;
          margin-top: 20px;
        }
        .badge {
          display: inline-block;
          background: #e8f5e9;
          color: #2e7d32;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        @media only screen and (max-width: 600px) {
          .container {
            padding: 10px;
          }
          .content {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>📅 Meeting Invitation</h2>
        </div>

        <div class="content">
          <p style="font-size: 16px; margin-top: 0;">Hello,</p>
          <p>You have been invited to a meeting:</p>

          <div class="meeting-details">
            <div class="detail-row">
              <div class="detail-label">📌 Meeting Title</div>
              <div class="detail-value"><strong>${meeting.title}</strong></div>
            </div>

            <div class="detail-row">
              <div class="detail-label">📅 Date</div>
              <div class="detail-value">${meeting.startDate}</div>
            </div>

            <div class="detail-row">
              <div class="detail-label">⏰ Time</div>
              <div class="detail-value">${meeting.startTime}</div>
            </div>

            ${
              meeting.description
                ? `
            <div class="detail-row">
              <div class="detail-label">📝 Description</div>
              <div class="detail-value">${meeting.description}</div>
            </div>
            `
                : ""
            }

            <div class="detail-row">
              <div class="detail-label">🔗 Meeting Link</div>
              <div class="meeting-link">
                <a href="${meeting.meetlink}" target="_blank">${meeting.meetlink}</a>
              </div>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${calendarLink}" class="btn" target="_blank">
              ➕ Add to Google Calendar
            </a>
          </div>

          <div class="badge" style="display: inline-block;">
            ⏰ Reminders will be sent by Google
          </div>

          <div class="footer">
            <p>This is an automated meeting invitation.<br>
            Please do not reply to this email.</p>
            <p style="margin-bottom: 0;">&copy; ${new Date().getFullYear()} Your Company Name</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getPlainTextTemplate = (meeting, calendarLink) => {
  return `
MEETING INVITATION

Title: ${meeting.title}
Date: ${meeting.startDate}
Time: ${meeting.startTime}
Meeting Link: ${meeting.meetlink}
${meeting.description ? `Description: ${meeting.description}` : ""}

Add to Google Calendar: ${calendarLink}

After adding to calendar, Google will send you reminders.

This is an automated message. Please do not reply.
  `;
};
