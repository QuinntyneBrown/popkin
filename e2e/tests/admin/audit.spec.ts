import { atTheRecording, auditPage, recordedAdmins, recordedAudit } from '../../fixtures/admin';
import { expect, test } from '../../fixtures/pk-test';
import { answer, answerOnce, hold, problem } from '../../fixtures/stubs';
import { AuditPage } from '../../pages/admin/audit.page';

const [aiko, marco, kwame, lena] = recordedAudit.entries;
const lenaId = recordedAdmins.find((admin) => admin.name === 'Lena Fischer')!.id;

test.describe('Audit log (L2-120)', () => {
  // The console shows times where its admins are: London, as the mocks do.
  test.use({ timezoneId: 'Europe/London' });
  test.beforeEach(({ page }) => atTheRecording(page));

  // Given an Owner signed in to the console, when they open the audit log, then every action is
  // listed newest first under its day, with the admin who took it and its target (L2-120 AC1,
  // AC3), in the console's frame that names them and their role (L2-089 AC1).
  test('lists every action taken in the console, newest first', async ({ page, pk }) => {
    const audit = new AuditPage(page);

    await pk.open('adminAudit');

    await expect(audit.root).toBeVisible();
    await expect(audit.heading).toHaveText('Audit log');
    await expect(audit.days).toHaveText(['Today']);
    await expect(audit.rows).toHaveCount(4);
    await expect(audit.rows.first()).toContainText('Lena Fischer');
    await expect(audit.rows.first()).toContainText('Added admin');
    await expect(audit.rows.first()).toContainText('Aiko Tanaka');
    // The first Owner was added by Popkin itself, from the setting (L2-119 AC9).
    await expect(audit.rows.last()).toContainText('Popkin');
    await expect(audit.showing).toContainText('Showing 4 of 4 actions');
    await expect(audit.olderActions).toBeHidden();
    await expect(audit.shell.current).toHaveText('Audit log');
    await expect(audit.shell.me).toContainText('Lena Fischer');
    await expect(audit.shell.me).toContainText('Owner');
  });

  // Given the log, when an admin searches it, then only the matching actions show, and "Clear
  // filters" brings back the whole log (L2-120 AC2).
  test('searches actions, people and Popkins', async ({ page, pk }) => {
    const audit = new AuditPage(page);
    await answer(page, 'GET /api/admin/audit?search=marco', auditPage([marco]));
    await pk.open('adminAudit');

    await audit.search.fill('marco');

    await expect(audit.rows).toHaveCount(1);
    await expect(audit.rows.first()).toContainText('Marco Bianchi');
    await expect(audit.showing).toContainText('Showing 1 of 1 action');
    await audit.clearFilters.click();
    await expect(audit.rows).toHaveCount(4);
    await expect(audit.search).toHaveValue('');
    await expect(audit.clearFilters).toBeHidden();
  });

  // Given the log, when an admin chooses one admin, then only that admin's actions show, counted
  // by their name (L2-120 AC2).
  test('shows the actions of one admin', async ({ page, pk }) => {
    const audit = new AuditPage(page);
    await answer(
      page,
      `GET /api/admin/audit?adminId=${lenaId}`,
      auditPage([aiko, marco, kwame], 3),
    );
    await pk.open('adminAudit');

    await expect(audit.admin.locator('option')).toHaveText([
      'All admins',
      'Lena Fischer',
      'Aiko Tanaka',
      'Kwame Mensah',
      'Marco Bianchi',
    ]);
    await audit.admin.selectOption({ label: 'Lena Fischer' });

    await expect(audit.rows).toHaveCount(3);
    await expect(audit.showing).toContainText('Showing 3 of 3 actions by Lena Fischer');
  });

  // Given a search nothing matches, then the log says so and offers to clear it.
  test('says when no action matches', async ({ page, pk }) => {
    const audit = new AuditPage(page);
    await answer(page, 'GET /api/admin/audit?search=refund', auditPage([], 0));
    await pk.open('adminAudit');

    await audit.search.fill('refund');

    await expect(audit.empty).toContainText('No matching actions');
    await expect(audit.empty).toContainText(
      'Try a person’s name, a Popkin, or an action such as “suspended”.',
    );
    await expect(audit.table).toBeHidden();
    await audit.empty.getByRole('button', { name: 'Clear filters' }).click();
    await expect(audit.rows).toHaveCount(4);
  });

  // Given more actions than one page, when "Older actions" is pressed, then the next page follows
  // the last entry shown (L2-120 AC3).
  test('pages back through older actions', async ({ page, pk }) => {
    const audit = new AuditPage(page);
    await answer(page, 'GET /api/admin/audit', auditPage([aiko, marco], 4, String(marco.id)));
    await answer(page, `GET /api/admin/audit?before=${marco.id}`, auditPage([kwame, lena], 4));
    await pk.open('adminAudit');
    await expect(audit.showing).toContainText('Showing 2 of 4 actions');

    await audit.olderActions.click();

    await expect(audit.rows).toHaveCount(4);
    await expect(audit.showing).toContainText('Showing 4 of 4 actions');
    await expect(audit.olderActions).toBeHidden();
  });

  // Given the log, "Export CSV" downloads the rows the search and the filter match (L2-120 AC4).
  test('exports what the filters match', async ({ page, pk }) => {
    const audit = new AuditPage(page);
    await answer(page, 'GET /api/admin/audit?search=marco', auditPage([marco]));
    await pk.open('adminAudit');
    await expect(audit.exportCsv).toHaveAttribute('href', '/api/admin/audit/export');

    await audit.search.fill('marco');

    await expect(audit.exportCsv).toHaveAttribute('href', '/api/admin/audit/export?search=marco');
    await expect(audit.exportCsv).toHaveAttribute('download', '');
  });

  // Given the log is slow, then the page says it is loading; given it fails, then it says so and
  // "Try again" asks again (L2-089 AC7).
  test('says when the log is loading or could not be read', async ({ page, pk }) => {
    const audit = new AuditPage(page);
    const release = await hold(page, 'GET /api/admin/audit');
    await pk.open('adminAudit');
    await expect(audit.loading).toBeAttached();
    release();
    await expect(audit.rows).toHaveCount(4);

    await answerOnce(page, 'GET /api/admin/audit?search=aiko', problem(500, 'server_error'));
    await audit.search.fill('aiko');
    await expect(audit.empty).toContainText('Couldn’t load the audit log');
    await expect(audit.openHealth).toHaveAttribute('href', '/health');
    await answer(page, 'GET /api/admin/audit?search=aiko', auditPage([aiko]));
    await audit.tryAgain.click();
    await expect(audit.rows).toHaveCount(1);
  });
});
