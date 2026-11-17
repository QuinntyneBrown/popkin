/**
 * The address of the Popkin app, set at build time by `--define POPKIN_APP_URL=...` where the
 * release knows it (ADR 0018); without it, the app is at app.popkin.community (ADR 0020).
 */
declare const POPKIN_APP_URL: string | undefined;

/** The admin app in production (ADR 0016, ADR 0024). */
export const environment = {
  popkinAppUrl:
    typeof POPKIN_APP_URL === 'string' ? POPKIN_APP_URL : 'https://app.popkin.community',
  /** The deployment the console acts on, named in its frame; another deployment's label is to be supplied. */
  consoleLabel: 'Production',
  /** Notifications run on the in-browser fake until the API serves them (ADR 0030). */
  fakeNotificationsBackend: true,
};
