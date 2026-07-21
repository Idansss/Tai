/** Strip secrets and obvious payment credentials before model / log surfaces. */
export function redactSensitive(text: string): string {
  return text
    .replace(/\b(?:sk-|pk_|rk_)[A-Za-z0-9_-]{10,}\b/g, '[redacted]')
    .replace(/\b(?:Bearer\s+)[A-Za-z0-9._-]{10,}\b/gi, 'Bearer [redacted]')
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[card-redacted]')
    .replace(/\bcvv\s*[:=]?\s*\d{3,4}\b/gi, 'cvv [redacted]');
}

export function sanitizeModelOutput(text: string): string {
  // Strip accidental internal IDs / vector chatter if a model emits them.
  return text
    .replace(/\bchecksum[=:]\s*[a-f0-9]{8,}\b/gi, '')
    .replace(/\bchunk[_-]?id[=:]\s*\S+/gi, '')
    .trim();
}
