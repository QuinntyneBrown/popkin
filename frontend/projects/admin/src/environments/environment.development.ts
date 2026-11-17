/** The admin app in development: the Popkin app is served on :4200. */
export const environment = {
  popkinAppUrl: 'http://localhost:4200',
  /** The deployment the console acts on, named in its frame; another deployment's label is to be supplied. */
  consoleLabel: 'Production',
  /** Notifications run on the in-browser fake until the API serves them (ADR 0030). */
  fakeNotificationsBackend: true,
};
