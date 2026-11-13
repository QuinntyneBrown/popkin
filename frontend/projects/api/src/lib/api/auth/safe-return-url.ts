/**
 * A return URL is honoured only when it is a path inside the app: one leading `/`, not `//`, no
 * scheme. Anything else is `null`, which prevents open redirects.
 */
export function safeReturnUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) return null;
  if (/^\/[^/]*:/.test(url) || [...url].some((c) => c.charCodeAt(0) < 32)) return null;
  return url;
}
