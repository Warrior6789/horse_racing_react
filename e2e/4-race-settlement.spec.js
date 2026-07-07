import { test, expect } from '@playwright/test'

const ADMIN = { email: 'e2e-admin-fixed@test.com', password: 'Passw0rd!123' }
const OWNER = { email: 'e2e-owner-fixed@test.com', password: 'Passw0rd!123' }
const JOCKEY = { email: 'e2e-jockey-fixed@test.com', password: 'Passw0rd!123' }

async function login(page, { email, password }) {
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
}

async function balanceOn(page, walletPath) {
  await page.goto(walletPath)
  const text = await page.getByText('Current Balance').locator('..').getByText(/VND$/).first().innerText()
  return Number(text.replace(/[^\d]/g, ''))
}

test('admin advances a race through to Finished and prizes are paid out', async ({ page }) => {
  test.setTimeout(1_320_000)

  await login(page, ADMIN)
  await expect(page).toHaveURL(/\/admin\/dashboard/)

  await page.goto('/admin/races')
  const row = page.locator('tr').filter({ hasText: 'E2E Test Track' })
  await row.waitFor()

  for (let i = 0; i < 3; i++) {
    await row.getByRole('button', { name: 'Advance' }).click()
    await page.waitForTimeout(1000)
  }

  await expect(row.getByText('Live')).toBeVisible({ timeout: 15_000 })

  await expect(row.getByText(/Finished|Completed/)).toBeVisible({ timeout: 1_200_000 })

  const ownerBalance = await balanceOn(page, '/owner/wallet')
  expect(ownerBalance).toBeGreaterThan(0)

  await login(page, JOCKEY)
  const jockeyBalance = await balanceOn(page, '/jockey/wallet')
  expect(jockeyBalance).toBeGreaterThan(0)

  await login(page, OWNER)
  const ownerBalanceAgain = await balanceOn(page, '/owner/wallet')
  expect(ownerBalanceAgain).toBe(ownerBalance)
})
