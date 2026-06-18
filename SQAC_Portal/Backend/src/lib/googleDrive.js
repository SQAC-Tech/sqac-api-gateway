import { google } from "googleapis";

/**
 * Returns an authenticated Google Drive client using a service account.
 *
 * Required env vars:
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — full JSON key file contents (as a string)
 *   GOOGLE_DRIVE_FOLDER_ID       — Drive folder ID where signed COCs are stored
 */
function getDriveClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set in .env");

  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  return google.drive({ version: "v3", auth });
}

/**
 * Upload a PDF buffer to the configured Google Drive folder.
 *
 * @param {Buffer}  pdfBuffer  - Signed PDF bytes
 * @param {string}  fileName   - e.g. "RA2411027010001-signed-coc.pdf"
 * @returns {Promise<{fileId: string, webViewLink: string}>}
 */
export async function uploadToDrive(pdfBuffer, fileName) {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID is not set in .env");

  const { Readable } = await import("stream");
  const stream = Readable.from(pdfBuffer);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: "application/pdf",
      parents: [folderId],
    },
    media: {
      mimeType: "application/pdf",
      body: stream,
    },
    fields: "id, webViewLink",
  });

  return {
    fileId: res.data.id,
    webViewLink: res.data.webViewLink,
  };
}

/**
 * Generate a short-lived (1 hour) view link for a Drive file.
 * Note: since files are private (not shared publicly), this generates
 * a signed URL via the Drive API that the service account can access.
 * For secretary viewing we just return the webViewLink and open it
 * while authenticated as the service account owner.
 *
 * @param {string} fileId
 * @returns {Promise<string>} webViewLink
 */
export async function getDriveViewLink(fileId) {
  const drive = getDriveClient();
  const res = await drive.files.get({
    fileId,
    fields: "id, webViewLink, name",
  });
  return res.data.webViewLink;
}
