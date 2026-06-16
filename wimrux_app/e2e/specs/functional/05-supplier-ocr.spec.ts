import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { login } from '../../helpers/auth.helper';
import { createErrorCollector, getCriticalErrors } from '../../helpers/console-errors.helper';
import { cleanupTestData } from '../../helpers/cleanup.helper';
import { waitForAppPage } from '../../helpers/wait.helper';
import { INVOICE } from '../../fixtures/selectors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PDF_FIXTURE = path.join(__dirname, '..', '..', 'fixtures', 'real', 'test-bank-statement.pdf');

test.describe('Supplier OCR', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('upload un PDF et vérifie que pdf-to-images répond sans erreur 401', async ({ page }) => {
    test.setTimeout(180_000);

    const errors = createErrorCollector(page);

    await page.goto('/app/invoices/received');
    await waitForAppPage(page);

    await page.click(INVOICE.ocrImportBtn);

    const fileInput = page.locator(INVOICE.ocrFileInput);
    await fileInput.setInputFiles(PDF_FIXTURE);

    // Le traitement peut démarrer immédiatement ou échouer rapidement si la config OCR est absente.
    // On attend l'un des états terminaux visibles.
    await Promise.race([
      page.waitForSelector('.q-spinner-oval', { state: 'visible', timeout: 10_000 }),
      page.waitForSelector('.q-banner:has-text("Extraction réussie")', { state: 'visible', timeout: 10_000 }),
      page.waitForSelector('.q-banner.bg-negative', { state: 'visible', timeout: 10_000 }),
    ]);

    // Si un spinner est apparu, attendre la fin du traitement
    const spinner = page.locator('.q-spinner-oval');
    if (await spinner.isVisible().catch(() => false)) {
      await Promise.race([
        page.waitForSelector('.q-banner:has-text("Extraction réussie")', { state: 'visible', timeout: 120_000 }),
        page.waitForSelector('.q-banner.bg-negative', { state: 'visible', timeout: 120_000 }),
      ]);
    }

    // Vérifier qu'aucune erreur 401 n'a été levée sur pdf-to-images
    const pdfToImagesErrors = getCriticalErrors(errors, 'pdf-to-images');
    expect(pdfToImagesErrors).toHaveLength(0);

    // Vérifier que pdf-to-images a répondu 2xx (sinon il y aurait une erreur réseau)
    const pdfToImagesCalls = errors.networkErrors.filter((e) => e.includes('pdf-to-images'));
    expect(pdfToImagesCalls.some((e) => /^[45]\d{2} /.test(e))).toBe(false);
  });
});
