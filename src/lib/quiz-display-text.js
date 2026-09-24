// Remove unresolved citation tokens from imported text, preserving actual references.
export function cleanQuizDisplayText(value) {
  return String(value ?? '')
    .replace(/\[(?:cite_start|cite_end)\]/gi, '')
    .replace(/\[\s*cite\s*:\s*\d+(?:\s*[,;]\s*\d+)*\s*\]/gi, '')
    .replace(/\bcite\s*:\s*\d+(?:\s*[,;]\s*\d+)*/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .trim();
}
