import { test, expect } from '@playwright/test'
import { login } from './helpers'

const ADMIN = { email: 'e2e-admin-fixed@test.com', password: 'Passw0rd!123' }

test('admin can create and activate a jockey reward config', async ({ page }) => {
  await login(page, ADMIN)
  await page.goto('/admin/config')

  await page.getByRole('button', { name: 'Jockey Reward' }).click()
  await page.getByRole('button', { name: 'Create New' }).click()

  await page.locator('label:text-is("Win Cut (%)") + div input').fill('12')
  await page.locator('label:text-is("Place Cut (%)") + div input').fill('6')
  await page.getByRole('button', { name: 'Create', exact: true }).click()

  await expect(page.getByText('Create New Config')).not.toBeVisible()

  const row = page.locator('tr').filter({ hasText: 'Inactive' }).first()
  await row.waitFor()
  await row.getByRole('button', { name: 'Activate' }).click()

  await expect(page.locator('div').filter({ hasText: 'Active Configuration' }).getByText('12.0%').first()).toBeVisible()
})

test('admin can create and activate a takeout config', async ({ page }) => {
  await login(page, ADMIN)
  await page.goto('/admin/config')

  await page.getByRole('button', { name: 'Takeout' }).click()
  await page.getByRole('button', { name: 'Create New' }).click()

  await page.locator('label:text-is("Takeout (%)") + div input').fill('15')
  await page.getByRole('button', { name: 'Create', exact: true }).click()

  await expect(page.getByText('Create New Config')).not.toBeVisible()

  const row = page.locator('tr').filter({ hasText: 'Inactive' }).first()
  await row.waitFor()
  await row.getByRole('button', { name: 'Activate' }).click()

  await expect(page.locator('div').filter({ hasText: 'Active Configuration' }).getByText('15.0%').first()).toBeVisible()
})
