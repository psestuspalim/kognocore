export function readableAnswer(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'string' || (parsed && typeof parsed === 'object')) return readableAnswer(parsed);
    } catch { /* Plain text is already readable. */ }
    return value;
  }
  if (Array.isArray(value)) return value.map(readableAnswer).join('; ');
  if (typeof value === 'object') return Object.entries(value).map(([key, answer]) => `${key}: ${readableAnswer(answer)}`).join('; ');
  return String(value);
}

// This flags formatting differences only; it does not judge semantic correctness.
export function possibleVerificationMismatch(selected, expected) {
  const normalize = value => readableAnswer(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
  const actual = normalize(selected);
  return Boolean(actual && actual === normalize(expected));
}
