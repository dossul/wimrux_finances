import { test, expect } from '@playwright/test';
import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { login } from '../../helpers/auth.helper';
import { cleanupTestData } from '../../helpers/cleanup.helper';
import { createBfClient } from '../../helpers/bf-clients.helper';
import { updateCompanyBfInfo } from '../../helpers/bf-company.helper';
import { createCertifiedInvoiceViaApi, navigateToInvoiceEditor } from '../../helpers/invoices.helper';

test.describe('Facture normalisée BF - Rendu PDF', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('le PDF certifié affiche les 11 infos émetteur et masque les comptes bancaires client', async ({ page }) => {
    await updateCompanyBfInfo(page);
    const client = await createBfClient(page);

    const invoiceId = await createCertifiedInvoiceViaApi(page, 'FV', {
      clientId: client.id as string,
      description: 'Facture BF PDF E2E',
      totalTtc: 1_000_000,
    });

    await navigateToInvoiceEditor(page, invoiceId);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('invoice-pdf-btn').click(),
    ]);

    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const buffer = fs.readFileSync(downloadPath);
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    const text = parsed.text;

    // 11 éléments émetteur
    expect(text).toContain('WIMRUX BF TEST SARL');
    expect(text).toContain('S.A.R.L. (Société à responsabilité limitée)');
    expect(text).toContain('Ouagadougou');
    expect(text).toContain('Koulouba');
    expect(text).toContain('Secteur 15');
    expect(text).toContain('Plle 15');
    expect(text).toContain('Lot 10');
    expect(text).toContain('Section ZD');
    expect(text).toContain('01 BP6647');
    expect(text).toContain('OUAGA05');
    expect(text).toContain('+22670000001');
    expect(text).toContain('1234567890123'); // IFU
    expect(text).toContain('RCCM-OUAGA-TEST-001');
    expect(text).toContain('RNI (Régime normal d\'imposition)');
    expect(text).toContain('DGE (Direction des grandes entreprises)');
    expect(text).toContain('BOA');
    expect(text).toContain('BF001');

    // Client présent mais sans comptes bancaires
    expect(text).toContain(client.name);
    expect(text).not.toContain('BF123456789');

    // Nettoyage du fichier téléchargé
    try { fs.unlinkSync(downloadPath); } catch { /* ignore */ }
  });
});
