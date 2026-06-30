// Safety utilities for confession text:
//   - sanitizePII(): strips phone numbers, emails, URLs, credit cards,
//     SSN-like patterns. Returns { sanitized, stripped } so the caller
//     can warn the user about what was removed.
//   - detectCrisis(): checks for self-harm / crisis language. Returns
//     boolean. Used to flag confessions for admin review + show the
//     poster supportive resources.

/* ============================================================
   PII DETECTION — regex patterns for private info
   ============================================================ */

const PII_PATTERNS = [
  // Email addresses
  {
    name: "email",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: "[email removed]",
  },
  // Phone numbers (US + international, various formats)
  {
    name: "phone",
    regex: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[phone removed]",
  },
  // URLs (http/https/www)
  {
    name: "url",
    regex: /\b(?:https?:\/\/|www\.)[^\s<]+[^\s<.)]/gi,
    replacement: "[link removed]",
  },
  // Credit card numbers (13-19 digit patterns, with or without spaces/dashes)
  {
    name: "credit card",
    regex: /\b(?:\d[ -]*?){13,19}\b/g,
    replacement: "[card removed]",
  },
  // SSN-like patterns (XXX-XX-XXXX)
  {
    name: "SSN",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: "[SSN removed]",
  },
];

/**
 * Strip PII (personally identifiable information) from text.
 * Returns the sanitized text + a list of what was stripped.
 */
export function sanitizePII(text) {
  let sanitized = text;
  const stripped = [];

  for (const { name, regex, replacement } of PII_PATTERNS) {
    // Reset lastIndex for global regexes
    regex.lastIndex = 0;
    if (regex.test(sanitized)) {
      regex.lastIndex = 0;
      sanitized = sanitized.replace(regex, replacement);
      stripped.push(name);
    }
  }

  return { sanitized, stripped };
}

/* ============================================================
   CRISIS DETECTION — self-harm / suicide keyword matching
   ============================================================ */

const CRISIS_PHRASES = [
  "kill myself", "killing myself", "kill me",
  "end it all", "end my life", "ending my life",
  "don't want to be here", "dont want to be here",
  "don't want to live", "dont want to live",
  "want to die", "wanna die", "wanna kill",
  "suicide", "suicidal",
  "self harm", "self-harm",
  "cutting myself", "cut myself",
  "hurt myself", "hurting myself",
  "no reason to live", "better off dead",
  "better off without me",
  "everyone would be better off",
  "nobody would miss me",
  "nobody cares if i live",
  "give up on life", "giving up on life",
  "can't go on", "cant go on",
  "no point in living", "no point anymore",
  "last goodbye", "final goodbye",
];

/**
 * Check if text contains crisis/self-harm language.
 * Returns true if any crisis phrase is found (case-insensitive).
 *
 * If true, the confession should:
 *   1. Still be saved (NOT silenced)
 *   2. Be flagged with isFlagged: true for admin review
 *   3. Trigger a supportive overlay on the client with crisis resources
 */
export function detectCrisis(text) {
  const lower = text.toLowerCase();
  return CRISIS_PHRASES.some((phrase) => lower.includes(phrase));
}

/* ============================================================
   PROFANITY FILTER — server-side backstop
   ============================================================ */

const SERVER_PROFANITY = [
  "fuck", "shit", "bitch", "asshole", "dick", "piss",
  "nigger", "nigga", "faggot", "fag", "retard", "tranny",
];

export function filterProfanity(text) {
  let result = text;
  for (const word of SERVER_PROFANITY) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    result = result.replace(regex, "****");
  }
  return result;
}
