import { test, expect } from '@playwright/test'
import { login } from './helpers'

const OWNER = { email: 'e2e-owner-fixed@test.com', password: 'Passw0rd!123' }
const ADMIN = { email: 'e2e-admin-fixed@test.com', password: 'Passw0rd!123' }

test('owner requests a withdrawal and admin approves it', async ({ page }) => {
  const holderName = `E2E Approve ${Date.now()}`

  await login(page, OWNER)
  await page.goto('/owner/wallet')

  await page.getByRole('button', { name: 'Withdraw' }).click()
  await page.locator('input[placeholder="100"]').fill('1000')
  await page.locator('input[placeholder="Vietcombank"]').fill('Vietcombank')
  await page.locator('input[placeholder="0123456789"]').fill('0123456789')
  await page.locator('input[placeholder="NGUYEN VAN A"]').fill(holderName)
  await page.getByRole('button', { name: 'Submit Request' }).click()

  await expect(page.getByText('Withdrawal request submitted.')).toBeVisible()

  await login(page, ADMIN)
  await page.goto('/admin/withdrawals')

  const row = page.locator('tr').filter({ hasText: holderName })
  await row.waitFor()
  await expect(row.getByText('Pending')).toBeVisible()
  await row.getByRole('button', { name: 'Approve' }).click()

  await expect(row.getByText('Approved')).toBeVisible()
})

test('owner requests a withdrawal and admin rejects it', async ({ page }) => {
  const holderName = `E2E Reject ${Date.now()}`

  await login(page, OWNER)
  await page.goto('/owner/wallet')

  await page.getByRole('button', { name: 'Withdraw' }).click()
  await page.locator('input[placeholder="100"]').fill('1000')
  await page.locator('input[placeholder="Vietcombank"]').fill('Vietcombank')
  await page.locator('input[placeholder="0123456789"]').fill('0123456789')
  await page.locator('input[placeholder="NGUYEN VAN A"]').fill(holderName)
  await page.getByRole('button', { name: 'Submit Request' }).click()

  await expect(page.getByText('Withdrawal request submitted.')).toBeVisible()

  await login(page, ADMIN)
  await page.goto('/admin/withdrawals')

  const row = page.locator('tr').filter({ hasText: holderName })
  await row.waitFor()
  await row.getByRole('button', { name: 'Reject' }).click()

  await expect(row.getByText('Rejected')).toBeVisible()
})
