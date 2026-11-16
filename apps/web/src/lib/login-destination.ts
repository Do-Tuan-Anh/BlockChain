// Only local non-auth pages can be a continuation after welcome/login.
export function loginDestination(value: unknown, locale: string) {
  const fallback = `/${locale}`;
  if (typeof value !== 'string' || !value || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  const path = new URL(value, 'https://trustchain.invalid').pathname;
  if (/^\/(?:en\/|vi\/)?(?:welcome|login|register|forgot-password|reset-password|verify-email)(?:\/|$)/.test(path)) return fallback;
  return value;
}
