import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../../helpers/console-errors.helper';
import { waitForAppPage } from '../../helpers/wait.helper';
import { AI } from '../../fixtures/selectors';

test.describe('AI assistant', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  test('envoie une question et reçoit une réponse de l\'assistant', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/app/ai-assistant');
    await waitForAppPage(page);

    const question = 'Quels sont les groupes de taxation au Burkina Faso ?';
    await page.click(AI.chatInput);
    await page.fill(AI.chatInput, question);
    await page.press(AI.chatInput, 'Enter');

    // Attendre que la bulle assistant apparaisse
    const assistantBubbles = page.locator('[data-role="assistant"]');
    await expect(assistantBubbles.first()).toBeVisible({ timeout: 60_000 });

    // Vérifier que le texte de la question est présent
    await expect(page.locator('[data-role="user"]').filter({ hasText: question })).toBeVisible();

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });
});
