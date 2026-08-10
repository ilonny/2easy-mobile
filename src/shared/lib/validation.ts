export function getEmailDomain(email: string | undefined | null): string | null {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const parts = normalized.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return parts[1];
}

export function isOutlookEmail(email: string | undefined | null): boolean {
  const domain = getEmailDomain(email);
  if (!domain) {
    return false;
  }
  return domain === 'outlook.com' || domain.startsWith('outlook.');
}

export const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}
