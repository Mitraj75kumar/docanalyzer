// Truncates/chunks extracted text so it stays within a reasonable size when sent to the AI API.
// Simple char-based cap (not perfectly token accurate, but predictable and dependency-free).
// Kept fairly conservative (~2000 tokens) so a single request comfortably fits under
// typical free-tier rate/quota limits even with the system prompt, conversation
// history (chat), and completion tokens added on top.
const MAX_CHARS = 8000;

const capText = (text, maxChars = MAX_CHARS) => {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[...truncated, document continues...]`;
};

module.exports = { capText, MAX_CHARS };
