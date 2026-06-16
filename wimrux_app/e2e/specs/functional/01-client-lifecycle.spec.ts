import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../../helpers/console-errors.helper';
import { cleanupTestData } from '../../helpers/cleanup.helper';
import { createClientPM } from '../../helpers/clients.helper';
import { CLIENT } from '../../fixtures/selectors';

test.describe('Client lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('crée un client PM et le retrouve dans la liste', async ({ page }) => {
    const errors = createErrorCollector(page);

    const client = await createClientPM(page);

    const row = page.locator(CLIENT.row).filter({ hasText: client.name });
    await expect(row).toBeVisible();
    await expect(row).toContainText(client.ifu);

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });
});
