/**
 * The admin app under Playwright: as in development, but every notification request goes to the
 * network, where the e2e fixtures answer it (ADR 0005, ADR 0030).
 */
export const environment = {
  popkinAppUrl: 'http://localhost:4200',
  consoleLabel: 'Production',
  fakeNotificationsBackend: false,
};
