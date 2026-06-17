import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../../helpers/console-errors.helper';
import { waitForAppPage } from '../../helpers/wait.helper';
import { cleanupTestData } from '../../helpers/cleanup.helper';
import { createSupplierViaApi } from '../../helpers/suppliers.helper';
import { createBankAccountViaApi } from '../../helpers/banking.helper';
import { RECEIVED_INVOICE, WIZARD, PAYMENT } from '../../fixtures/selectors';
import { TEST_MARKER } from '../../fixtures/test-data';

async function saveAndNotify(page: any, selector: string): Promise<void> {
  await page.click(selector);
  const notification = page.locator('.q-notification');
  await notification.waitFor({ state: 'visible', timeout: 20_000 });
  const notifText = (await notification.textContent()) ?? '';
  if (!/créé|cree|succès|succes|enregistré|enregistre|soldée|soldee/i.test(notifText)) {
    throw new Error(`Notification inattendue : ${notifText}`);
  }
}

test.describe('Received invoice & payment', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData();
    await login(page, 'adminWestago');
  });

  test('crée une facture fournisseur manuellement et enregistre un paiement bancaire', async ({ page }) => {
    const errors = createErrorCollector(page);

    const uniqueSuffix = Date.now().toString();
    const supplierName = `Fournisseur Paiement E2E ${uniqueSuffix} ${TEST_MARKER}`;
    const supplierId = await createSupplierViaApi(page, {
      name: supplierName,
      regime: 'RNI',
      division: 'DME-CV',
    });

    const bankAccountName = `BOA Paiement E2E`;
    const accountId = await createBankAccountViaApi(page, {
      bankName: bankAccountName,
      accountNumber: '1234567890',
      openingBalance: 5_000_000,
    });

    await page.goto('/app/invoices/received');
    await waitForAppPage(page);

    await page.click(RECEIVED_INVOICE.newBtn);
    await page.waitForSelector(`[data-testid="wizard-supplier-select"]`, { state: 'visible', timeout: 10_000 });

    // Sélectionner le fournisseur
    await page.locator(WIZARD.supplierSelect).click();
    await page.waitForSelector('.q-menu .q-item', { state: 'visible', timeout: 10_000 });
    await page.locator('.q-menu .q-item').filter({ hasText: supplierName }).first().click();

    const invoiceNumber = `FA-FRN-${uniqueSuffix}`;
    await page.fill(WIZARD.supplierInvoiceNumber, invoiceNumber);
    await page.fill(WIZARD.receivedAt, new Date().toISOString().slice(0, 16));

    await page.click(WIZARD.nextBtn);
    await page.waitForTimeout(500);

    // Étape 2 : renseigner explicitement la référence pour éviter l'appel RPC asynchrone
    await page.waitForSelector(WIZARD.reference, { state: 'visible', timeout: 10_000 });
    await page.fill(WIZARD.reference, `FR-E2E-${uniqueSuffix}`);

    await page.click(WIZARD.nextBtn);
    await page.waitForTimeout(500);

    // Montants
    await page.fill(WIZARD.totalHt, '1000000');
    await page.fill(WIZARD.totalTva, '180000');

    await page.fill('[data-testid="wizard-total-psvb"]', '0');

    await page.fill('[data-testid="wizard-stamp-duty"]', '0');

    await page.fill(WIZARD.totalTtc, '1180000');

    await page.click(WIZARD.nextBtn);
    await page.waitForTimeout(500);

    await saveAndNotify(page, WIZARD.saveBtn);

    // Retour à la liste et attendre le rechargement
    await page.goto('/app/invoices/received');
    await waitForAppPage(page);
    await page.waitForSelector(`${RECEIVED_INVOICE.table} tbody tr`, { state: 'visible', timeout: 15_000 });

    const row = page.locator(RECEIVED_INVOICE.table).locator('tbody tr').filter({ hasText: invoiceNumber }).first();
    await expect(row).toBeVisible();

    // Enregistrer un paiement
    const paymentBtn = row.locator(RECEIVED_INVOICE.paymentBtn);
    await paymentBtn.click();

    await page.waitForSelector(PAYMENT.amount, { state: 'visible', timeout: 10_000 });
    await page.fill(PAYMENT.amount, '1180000');
    await page.fill(PAYMENT.reference, 'VIR-E2E-001');

    await page.locator(`${PAYMENT.bankAccount} input`).first().click();
    const bankOption = page.locator('.q-menu .q-item').filter({ hasText: bankAccountName }).first();
    await bankOption.waitFor({ state: 'visible', timeout: 15_000 });
    await bankOption.click();

    await saveAndNotify(page, PAYMENT.saveBtn);

    await page.goto('/app/invoices/received');
    await waitForAppPage(page);

    await expect.poll(
      async () => {
        const updatedRow = page.locator(RECEIVED_INVOICE.table).locator('tbody tr').filter({ hasText: invoiceNumber }).first();
        return (await updatedRow.textContent()) ?? '';
      },
      { timeout: 15_000 }
    ).toMatch(/Payé|paid/);

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });
});
