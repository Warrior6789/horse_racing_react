import { test, expect } from '@playwright/test'

const JOCKEY = { email: 'e2e-jockey-fixed@test.com', password: 'Passw0rd!123' }

async function login(page, { email, password }) {
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
}

test('jockey can accept a pending race invitation', async ({ page }) => {
  await login(page, JOCKEY)
  await expect(page).toHaveURL(/\/jockey\/dashboard/)

  await page.goto('/jockey/requests')

  const row = page.locator('tr').filter({ hasText: 'E2E Thunder' })
  await row.waitFor()
  await row.getByRole('button', { name: 'Accept' }).click()

  await expect(row).not.toBeVisible()
})
