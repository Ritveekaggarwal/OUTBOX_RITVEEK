const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const SINGLE_EMAIL = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export const MAX_LEAD_FILE_BYTES = 5 * 1024 * 1024;

export function isValidEmail(value: string): boolean {
  return SINGLE_EMAIL.test(value.trim());
}

/** Pulls every email address out of CSV / TXT content, lower-cased and de-duplicated. */
export function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_PATTERN) ?? [];
  return [...new Set(matches.map((email) => email.toLowerCase()))];
}

export async function parseLeadFile(file: File): Promise<string[]> {
  if (file.size > MAX_LEAD_FILE_BYTES) throw new Error('File is larger than 5 MB');
  return extractEmails(await file.text());
}
