import Groq from "groq-sdk";

// Lazy singleton — created on first call so dotenv has already run by then
let _groq = null;
function getGroq() {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}


/**
 * Generate a structured MOM JSON from a natural-language prompt.
 * @param {string} prompt - Free-form description of the meeting.
 * @returns {Promise<object>} - Parsed MOM fields as a JS object.
 */
export async function generateMOMFromPrompt(prompt) {
  const systemPrompt = `You are a professional meeting secretary assistant for SQAC (Student Quality Assurance Club), a college tech club.
Your job is to convert a free-form meeting description into a structured Minutes of Meeting (MOM) document.

Return ONLY a valid JSON object (no markdown, no explanation, just raw JSON) with this exact shape:
{
  "title": "string — concise meeting title",
  "description": "string — 2-3 sentence meeting summary",
  "discussedPoints": ["string", "string", ...],
  "decisions": ["string", "string", ...],
  "actionItems": [
    { "task": "string", "assignee": "string or empty", "dueDate": "YYYY-MM-DD or empty string" }
  ],
  "nextMeetDate": "YYYY-MM-DD or empty string",
  "nextMeetAgenda": "string — what the next meeting should cover, or empty"
}

Rules:
- discussedPoints: 3-10 bullet strings of what was discussed
- decisions: 1-5 strings of concrete decisions made
- actionItems: any tasks mentioned with who should do them
- Keep language professional but concise
- If information is not mentioned in the prompt, leave that field as empty string or empty array
- Do NOT invent information not present in the prompt`;

  const completion = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 1500,
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";

  // Strip markdown code fences if the model wraps it anyway
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Return a safe fallback so the UI doesn't crash
    return {
      title: "",
      description: cleaned, // at least keep the raw text in description
      discussedPoints: [],
      decisions: [],
      actionItems: [],
      nextMeetDate: "",
      nextMeetAgenda: "",
    };
  }
}
