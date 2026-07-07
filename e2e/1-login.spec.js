import { test, expect } from '@playwright/test'

test('a newly registered spectator can log in and lands on the spectator dashboard', async ({ page }) => {
  const unique = Date.now()
  const email = `e2e-spectator-${unique}@test.com`
  const password = 'Passw0rd!123'

  await page.goto('/register')
  await page.locator('#fullName').fill('E2E Spectator')
  await page.locator('#email').fill(email)
  await page.locator('#phone').fill('0900000000')
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Create Account' }).click()

  await expect(page).toHaveURL(/\/login\?registered=1/)
  await expect(page.getByText('Account created! Please sign in.')).toBeVisible()

  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()

  await expect(page).toHaveURL(/\/spectator\/dashboard/)
})
