import { test, expect } from '@playwright/test'
import { login, registerFreshSpectator } from './helpers'

const OWNER = { email: 'e2e-owner-fixed@test.com', password: 'Passw0rd!123' }
const ADMIN = { email: 'e2e-admin-fixed@test.com', password: 'Passw0rd!123' }

test('wrong password shows an error and stays on the login page', async ({ page }) => {
  await login(page, { email: OWNER.email, password: 'WrongPassword!999' })

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Invalid email or password.')).toBeVisible()
})

test('unknown email shows an error and stays on the login page', async ({ page }) => {
  await login(page, { email: `nonexistent-${Date.now()}@test.com`, password: 'Whatever!123' })

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Invalid email or password.')).toBeVisible()
})

test('a banned account cannot log in', async ({ page }) => {
  const spectator = await registerFreshSpectator(page, 'banned-target')

  await login(page, ADMIN)
  await expect(page).toHaveURL(/\/admin\/dashboard/)
  await page.goto('/admin/accounts')
  await page.getByPlaceholder('Search by email...').fill(spectator.email)
  await page.locator('form').getByRole('button').click().catch(() => {})

  const row = page.locator('tr').filter({ hasText: spectator.email })
  await row.waitFor()
  await row.getByRole('button', { name: 'Ban' }).click()
  await expect(row.getByRole('button', { name: 'Restore' })).toBeVisible()

  await login(page, spectator)

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Invalid email or password.')).not.toBeVisible()
})
