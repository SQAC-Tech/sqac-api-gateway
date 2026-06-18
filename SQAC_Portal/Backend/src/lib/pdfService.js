import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { cocPdfConfig } from "../config/cocPdfConfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COC_PDF_PATH = join(
  __dirname, "..", "..", "..", "Frontend", "public", "SQAC Code of Conduct.pdf"
);

/**
 * Generate a signed COC PDF.
 *
 * @param {object} params
 * @param {string} params.signatureBase64  Base64-encoded PNG/JPG signature image
 * @param {string} params.memberName
 * @param {string} params.position         Human-readable role/position
 * @param {string} params.domain           Sub-domain
 * @param {string} params.mimeType         'image/png' | 'image/jpeg'
 * @returns {Promise<Uint8Array>} Signed PDF bytes
 */
export async function generateSignedCOC({ signatureBase64, memberName, position, domain, mimeType }) {
  const pdfBytes = readFileSync(COC_PDF_PATH);
  const pdfDoc  = await PDFDocument.load(pdfBytes);
  const font    = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { signaturePage, fields, text } = cocPdfConfig;
  const pages = pdfDoc.getPages();
  console.log(`PDF has ${pages.length} pages, targeting index ${signaturePage}`);
  const page = pages[signaturePage];
  if (!page) throw new Error(`Page index ${signaturePage} out of range (PDF has ${pages.length} pages)`);

  const BLACK    = rgb(0, 0, 0);
  const textSize = text.size;

  // Coordinates are already in PDF points (bottom-left origin) — use directly.

  page.drawText(memberName || "", {
    x: fields.name.x,
    y: fields.name.y,
    size: textSize,
    font,
    color: BLACK,
    maxWidth: fields.name.width,
  });

  page.drawText(position || "", {
    x: fields.position.x,
    y: fields.position.y,
    size: textSize,
    font,
    color: BLACK,
    maxWidth: fields.position.width,
  });

  page.drawText(domain || "—", {
    x: fields.domain.x,
    y: fields.domain.y,
    size: textSize,
    font,
    color: BLACK,
    maxWidth: fields.domain.width,
  });

  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });
  page.drawText(dateStr, {
    x: fields.date.x,
    y: fields.date.y,
    size: textSize,
    font,
    color: BLACK,
    maxWidth: fields.date.width,
  });

  // Signature image — drawn above the signature line (y is bottom of image box)
  const sigBuffer = Buffer.from(signatureBase64, "base64");
  const sigImage  = mimeType === "image/png"
    ? await pdfDoc.embedPng(sigBuffer)
    : await pdfDoc.embedJpg(sigBuffer);

  page.drawImage(sigImage, {
    x:      fields.signature.x,
    y:      fields.signature.y,
    width:  fields.signature.width,
    height: fields.signature.height,
  });

  return pdfDoc.save();
}
