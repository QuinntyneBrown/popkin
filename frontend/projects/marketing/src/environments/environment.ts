/**
 * The address of the app, set at build time by `--define POPKIN_APP_URL=...` where the release
 * knows it (ADR 0018); without it, the app is at app.popkin.community (ADR 0020).
 */
declare const POPKIN_APP_URL: string | undefined;

/** The marketing site in production (ADR 0017). */
export const environment = {
  appUrl: typeof POPKIN_APP_URL === 'string' ? POPKIN_APP_URL : 'https://app.popkin.community',
};
