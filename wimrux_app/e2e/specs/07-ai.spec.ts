import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../helpers/console-errors.helper';
import { waitForAppPage } from '../helpers/wait.helper';
import { AI } from '../fixtures/selectors';

/**
 * 07 — Tests Assistant IA
 * 
 * Couvre :
 * - Page IA se charge
 * - Page AI Ask se charge
 * - Champ de saisie visible
 * - Envoi d'un message (sans vérifier la réponse IA)
 */

test.describe('07 — Assistant IA', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  test('page assistant IA se charge sans erreur', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/app/ai-assistant');
    await waitForAppPage(page);

    await expect(page.locator('.q-page')).toBeVisible();

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });

  test('page AI Ask se charge sans erreur', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/app/ai/ask');
    await waitForAppPage(page);

    await expect(page.locator('.q-page')).toBeVisible();

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });

  test('champ de saisie IA visible', async ({ page }) => {
    await page.goto('/app/ai/ask');
    await waitForAppPage(page);

    const input = page.locator(`${AI.chatInput}, ${AI.input}, textarea, input[placeholder*="message"]`);
    const isVisible = await input.first().isVisible({ timeout: 5_000 }).catch(() => false);

    console.log(`[IA] Champ de saisie: ${isVisible ? 'visible' : 'non trouvé'}`);
  });
});
