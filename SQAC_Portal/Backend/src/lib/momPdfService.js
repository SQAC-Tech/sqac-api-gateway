import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LETTERHEAD_PATH = join(__dirname, "..", "..", "public", "letterheadSQAC.pdf");

// Letterhead page geometry (pt). Tune these if content overlaps header/footer.
const PAGE_W = 559;
const PAGE_H = 784;
const MARGIN_X = 56;
const CONTENT_TOP = PAGE_H - 150; // first baseline area below the header band
const CONTENT_BOTTOM = 70;        // stop above the footer band
const CONTENT_W = PAGE_W - MARGIN_X * 2;

// Palette (white-letterhead friendly — dark text on white)
const INK = rgb(0.1, 0.1, 0.13);
const MUTED = rgb(0.42, 0.42, 0.46);
const PRIMARY = rgb(0.776, 0.235, 0.83); // deep magenta (#c63cd4-ish) for print contrast
const PINK = rgb(0.85, 0.27, 0.46);
const RULE = rgb(0.82, 0.82, 0.86);

function fmtDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Wrap a string to fit maxW at the given font/size → array of lines. */
function wrapLines(text, font, size, maxW) {
  const words = String(text ?? "").replace(/\s+/g, " ").trim().split(" ");
  if (!words[0]) return [""];
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Build a MOM PDF rendered on the SQAC letterhead.
 * @param {object} mom
 * @returns {Promise<Uint8Array>}
 */
export async function buildMOMPdf(mom = {}) {
  const lhBytes = readFileSync(LETTERHEAD_PATH);
  const out = await PDFDocument.create();
  const [letterhead] = await out.embedPdf(lhBytes, [0]);

  const font = await out.embedFont(StandardFonts.Helvetica);
  const bold = await out.embedFont(StandardFonts.HelveticaBold);

  let page;
  let y;

  const newPage = () => {
    page = out.addPage([PAGE_W, PAGE_H]);
    page.drawPage(letterhead, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
    y = CONTENT_TOP;
  };

  // Ensure there's room; otherwise start a fresh letterhead page.
  const ensure = (needed) => {
    if (y - needed < CONTENT_BOTTOM) newPage();
  };

  const text = (str, { x = MARGIN_X, size = 9.5, f = font, color = INK } = {}) => {
    page.drawText(String(str ?? ""), { x, y, size, font: f, color });
  };

  // Paragraph of wrapped text; advances y. Returns nothing.
  const paragraph = (str, { x = MARGIN_X, size = 9.5, f = font, color = INK, lh = 13, maxW = CONTENT_W } = {}) => {
    const lines = wrapLines(str, f, size, maxW - (x - MARGIN_X));
    for (const ln of lines) {
      ensure(lh);
      page.drawText(ln, { x, y, size, font: f, color });
      y -= lh;
    }
  };

  const sectionHeader = (label) => {
    ensure(26);
    y -= 6;
    page.drawText(label.toUpperCase(), { x: MARGIN_X, y, size: 10, font: bold, color: PRIMARY });
    y -= 6;
    page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: MARGIN_X + CONTENT_W, y },
      thickness: 0.7,
      color: RULE,
    });
    y -= 14;
  };

  // ── First page ────────────────────────────────────────────────────────────
  newPage();

  // Document label
  page.drawText("MINUTES OF MEETING", { x: MARGIN_X, y, size: 9, font: bold, color: PINK });
  y -= 20;

  // Title
  for (const ln of wrapLines(mom.title || "Untitled Meeting", bold, 17, CONTENT_W)) {
    ensure(22);
    page.drawText(ln, { x: MARGIN_X, y, size: 17, font: bold, color: INK });
    y -= 22;
  }
  y -= 4;

  // Meta row (label/value pairs)
  const meta = [
    ["Date", fmtDate(mom.date)],
    ["Time", mom.startTime || "—"],
    ["Duration", mom.duration || "—"],
    ["Scope", String(mom.teamScope || "all").replace(/^\w/, (c) => c.toUpperCase())],
  ];
  const colW = CONTENT_W / meta.length;
  ensure(26);
  meta.forEach(([label, value], i) => {
    const cx = MARGIN_X + i * colW;
    page.drawText(label.toUpperCase(), { x: cx, y, size: 6.5, font: bold, color: MUTED });
    page.drawText(String(value), { x: cx, y: y - 11, size: 9.5, font, color: INK });
  });
  y -= 24;
  page.drawLine({ start: { x: MARGIN_X, y }, end: { x: MARGIN_X + CONTENT_W, y }, thickness: 0.7, color: RULE });
  y -= 16;

  // Overview
  if (mom.description) {
    sectionHeader("Overview");
    paragraph(mom.description, { color: rgb(0.25, 0.25, 0.3), lh: 13 });
    y -= 6;
  }

  // Attendees
  if (mom.attendees?.length) {
    sectionHeader(`Attendees (${mom.attendees.length})`);
    mom.attendees.forEach((a) => {
      ensure(13);
      const sub = [a.role || "member", a.coreDomain].filter(Boolean).join(" · ");
      const tag = a.external ? "  (guest)" : "";
      page.drawText(`•  ${a.name || "Unknown"}`, { x: MARGIN_X, y, size: 9.5, font: bold, color: INK });
      const nameW = bold.widthOfTextAtSize(`•  ${a.name || "Unknown"}`, 9.5);
      page.drawText(`${sub ? `   ${sub}` : ""}${tag}`, { x: MARGIN_X + nameW, y, size: 8.5, font, color: MUTED });
      y -= 13;
    });
    y -= 6;
  }

  // Discussion points
  if (mom.discussedPoints?.length) {
    sectionHeader("Discussion Points");
    mom.discussedPoints.filter(Boolean).forEach((pt) => {
      ensure(14);
      page.drawText("•", { x: MARGIN_X, y, size: 9.5, font: bold, color: PRIMARY });
      paragraph(pt, { x: MARGIN_X + 12, size: 9.5, lh: 13, maxW: CONTENT_W });
      y -= 3;
    });
    y -= 4;
  }

  // Decisions
  if (mom.decisions?.length) {
    sectionHeader("Key Decisions");
    mom.decisions.filter(Boolean).forEach((d) => {
      ensure(14);
      page.drawText("»", { x: MARGIN_X, y, size: 9.5, font: bold, color: PINK });
      paragraph(d, { x: MARGIN_X + 14, size: 9.5, lh: 13, maxW: CONTENT_W });
      y -= 3;
    });
    y -= 4;
  }

  // Action items
  const actions = (mom.actionItems || []).filter((a) => a && (a.task || a.assignee));
  if (actions.length) {
    sectionHeader("Action Items");
    const cols = [CONTENT_W * 0.52, CONTENT_W * 0.28, CONTENT_W * 0.2];
    ensure(16);
    ["Task", "Assignee", "Due"].forEach((h, i) => {
      const cx = MARGIN_X + cols.slice(0, i).reduce((s, w) => s + w, 0);
      page.drawText(h.toUpperCase(), { x: cx, y, size: 6.5, font: bold, color: MUTED });
    });
    y -= 6;
    page.drawLine({ start: { x: MARGIN_X, y }, end: { x: MARGIN_X + CONTENT_W, y }, thickness: 0.5, color: RULE });
    y -= 13;
    actions.forEach((it) => {
      const taskLines = wrapLines(it.task || "—", font, 9, cols[0] - 6);
      const rowH = Math.max(taskLines.length * 12, 12) + 4;
      ensure(rowH);
      const rowTop = y;
      taskLines.forEach((ln, li) => {
        page.drawText(ln, { x: MARGIN_X, y: rowTop - li * 12, size: 9, font, color: INK });
      });
      page.drawText(it.assignee || "—", { x: MARGIN_X + cols[0], y: rowTop, size: 9, font, color: rgb(0.25, 0.25, 0.3) });
      page.drawText(fmtDate(it.dueDate), { x: MARGIN_X + cols[0] + cols[1], y: rowTop, size: 9, font, color: rgb(0.25, 0.25, 0.3) });
      y = rowTop - rowH;
    });
    y -= 4;
  }

  // Next meeting
  if (mom.nextMeetDate || mom.nextMeetAgenda) {
    sectionHeader("Next Meeting");
    ensure(14);
    page.drawText("Scheduled:", { x: MARGIN_X, y, size: 9, font: bold, color: INK });
    page.drawText(fmtDate(mom.nextMeetDate), { x: MARGIN_X + 64, y, size: 9, font, color: INK });
    y -= 14;
    if (mom.nextMeetAgenda) {
      page.drawText("Agenda:", { x: MARGIN_X, y, size: 9, font: bold, color: MUTED });
      paragraph(mom.nextMeetAgenda, { x: MARGIN_X + 50, size: 9, lh: 13, maxW: CONTENT_W });
    }
  }

  return out.save();
}
