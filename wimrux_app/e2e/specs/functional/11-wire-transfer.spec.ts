import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../../helpers/console-errors.helper';
import { waitForAppPage } from '../../helpers/wait.helper';
import { createBankAccountViaApi, createWireTransferViaApi } from '../../helpers/banking.helper';
import { WIRE_TRANSFER } from '../../fixtures/selectors';
import { TEST_MARKER } from '../../fixtures/test-data';

test.describe('Wire transfer', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  test('crée un ordre de virement et l\'affiche en brouillon', async ({ page }) => {
    const errors = createErrorCollector(page);

    const accountId = await createBankAccountViaApi(page, {
      bankName: `Compte Virement E2E ${TEST_MARKER}`,
      accountNumber: 'VIR123456',
      openingBalance: 10_000_000,
    });

    const beneficiaryName = `Bénéficiaire E2E ${TEST_MARKER}`;
    await createWireTransferViaApi(page, {
      sourceBankAccountId: accountId,
      beneficiaryName,
      amount: 1_500_000,
      beneficiaryBank: 'ORABANK',
      motif: 'Paiement fournisseur E2E',
    });

    await page.goto('/app/banking/transfers');
    await waitForAppPage(page);

    const row = page.locator(WIRE_TRANSFER.table).locator('tbody tr').filter({ hasText: beneficiaryName }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('Brouillon');

    // Vérifier que le dialog de création s'ouvre correctement
    await page.click(WIRE_TRANSFER.newBtn);
    await page.waitForSelector(WIRE_TRANSFER.dialog, { state: 'visible', timeout: 10_000 });
    await expect(page.locator(WIRE_TRANSFER.sourceAccount)).toBeVisible();
    await expect(page.locator(WIRE_TRANSFER.beneficiary)).toBeVisible();
    await expect(page.locator(WIRE_TRANSFER.amount)).toBeVisible();

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });
});
