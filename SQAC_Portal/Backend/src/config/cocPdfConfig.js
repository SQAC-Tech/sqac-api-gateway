export const CURRENT_COC_VERSION = "2026-v1";

export const cocPdfConfig = {
  // 0-indexed (4th/last page in the document)
  signaturePage: 3,

  // All coordinates are in PDF points (pt), origin at bottom-left of page.
  // Captured directly from the PDF via pdf-lib page inspection at 559 × 784 pt.
  fields: {
    name:      { x: 194, y: 402, width: 330 },
    signature: { x: 195, y: 357, width: 330, height: 35 },
    position:  { x: 193, y: 331, width: 330 },
    domain:    { x: 194, y: 298, width: 330 },
    date:      { x: 194, y: 258, width: 330 },
  },

  text: {
    size: 14,
    font: "Helvetica",
  },
};
