import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../../helpers/console-errors.helper';
import { waitForAppPage } from '../../helpers/wait.helper';
import { ensureAiCreditPackExists } from '../../helpers/ai.helper';
import { cleanupTestData } from '../../helpers/cleanup.helper';
import { AI_CREDITS } from '../../fixtures/selectors';

test.describe('AI credits', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData();
    await login(page, 'adminWestago');
    await ensureAiCreditPackExists(page, {
      name: 'Pack E2E',
      creditsUsd: 10,
      priceXof: 5000,
      priceUsd: 8,
    });
  });

  test('affiche les packs et simule l\'achat de crédits IA', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/app/settings/ai/credits');
    await waitForAppPage(page);

    await expect(page.locator(AI_CREDITS.balance)).toBeVisible();

    const packs = page.locator(AI_CREDITS.pack);
    await expect(packs.first()).toBeVisible({ timeout: 15_000 });
    const packCount = await packs.count();
    expect(packCount).toBeGreaterThan(0);

    // Sélectionner le premier pack
    await packs.first().click();

    await expect(page.locator(AI_CREDITS.paymentMethod)).toBeVisible();
    await page.locator(AI_CREDITS.paymentMethod).getByText('Mobile Money').click();

    await page.click(AI_CREDITS.payBtn);

    // Attendre le dialog de confirmation
    const dialog = page.locator(AI_CREDITS.confirmDialog);
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await expect(dialog).toContainText('Paiement confirmé');

    // Fermer le dialog et vérifier l'historique
    await page.locator(AI_CREDITS.confirmDialog).getByText('Fermer').click();

    await expect(page.locator(AI_CREDITS.historyTable)).toBeVisible();
    const historyRow = page.locator(AI_CREDITS.historyTable).locator('tbody tr').first();
    await expect(historyRow).toContainText('Achat');

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });
});
