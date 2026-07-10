import { test, expect } from '@playwright/test'
import { login } from './helpers'

const OWNER = { email: 'e2e-owner-fixed@test.com', password: 'Passw0rd!123' }

test('owner can start a deposit and is redirected to the payment gateway', async ({ page }) => {
  await login(page, OWNER)
  await page.goto('/owner/wallet')

  await page.getByRole('button', { name: 'Deposit' }).click()
  await page.locator('input[placeholder="50000"]').fill('50000')

  const originalUrl = page.url()
  await page.getByRole('button', { name: 'Deposit via VNPay' }).click()

  await page.waitForTimeout(3000)
  const navigatedAway = page.url() !== originalUrl && !page.url().includes('/owner/wallet')
  const inlineSuccess = await page.getByText('Deposit initiated.').isVisible().catch(() => false)

  expect(navigatedAway || inlineSuccess).toBe(true)
})

test('payment cancel page shows an error state when no order code is given', async ({ page }) => {
  await login(page, OWNER)
  await page.goto('/payment/cancel')

  await expect(page.getByText('Something went wrong')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Order code not found.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Back to Wallet' })).toBeVisible()

  await page.getByRole('button', { name: 'Back to Wallet' }).click()
  await expect(page).toHaveURL(/\/owner\/wallet/)
})

test('payment cancel page shows success for a well-formed but unknown order code', async ({ page }) => {
  await login(page, OWNER)
  await page.goto('/payment/cancel?orderCode=999999999999')

  await expect(page.getByText('Transaction Cancelled')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: 'Back to Wallet' })).toBeVisible()
})
