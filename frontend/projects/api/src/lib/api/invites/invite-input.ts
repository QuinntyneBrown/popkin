/** The letters and digits an invite code is made of; none is easily mistaken for another. */
const CODE = /^[a-hjkmnp-z2-9]{8,64}$/;

/**
 * The invite code in what a QR code or a person gave: a bare code, or an invite link of this
 * app (`{origin}/i/{code}`, with or without the scheme). Null for anything else, so a QR code
 * that is not a Popkin invite never opens an address (L2-015 AC2, AC3).
 */
export function parseInviteInput(text: string, origin: string): string | null {
  const typed = text.trim().toLowerCase();
  if (!typed || /\s/.test(typed)) return null;
  if (CODE.test(typed)) return typed;
  const home = new URL(origin);
  let link: URL;
  try {
    link = new URL(
      typed.startsWith('/')
        ? typed
        : /^https?:\/\//.test(typed)
          ? typed
          : `${home.protocol}//${typed}`,
      home,
    );
  } catch {
    return null;
  }
  if (link.origin !== home.origin) return null;
  const path = /^\/i\/([^/]+)\/?$/.exec(link.pathname);
  return path && CODE.test(path[1]) ? path[1] : null;
}
