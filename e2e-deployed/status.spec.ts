import { expect, test } from '@playwright/test'

// Runs against a real deployment (no mocks): the deployed build must reach its API and the API its database.
test('deployed frontend reaches the API and the database', async ({ page }) => {
  await page.goto('/status')
  await expect(page.getByText('API: OK')).toBeVisible()
  await expect(page.getByText('Database: OK')).toBeVisible()
})
