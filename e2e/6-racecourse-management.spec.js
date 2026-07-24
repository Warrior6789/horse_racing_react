import { test, expect } from '@playwright/test'
import { login } from './helpers'

const ADMIN = { email: 'e2e-admin-fixed@test.com', password: 'Passw0rd!123' }

test('admin can create, edit, and delete a racecourse', async ({ page }) => {
  const unique = Date.now()
  const name = `E2E Racecourse ${unique}`
  const renamed = `${name} Renamed`

  await login(page, ADMIN)
  await page.goto('/admin/racecourses')

  await page.getByRole('button', { name: 'Add Racecourse' }).click()
  await page.locator('label:text-is("Name *") + input').fill(name)
  await page.locator('label:text-is("Location") + input').fill('E2E Test Location')
  await page.locator('label:text-is("Track Type *") + select').selectOption('Turf')
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  const row = page.locator('tr').filter({ hasText: name })
  await row.waitFor()
  await expect(row.getByText('Turf')).toBeVisible()

  await row.getByRole('button', { name: 'Edit' }).click()
  await page.locator('label:text-is("Name *") + input').fill(renamed)
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  const renamedRow = page.locator('tr').filter({ hasText: renamed })
  await renamedRow.waitFor()

  page.once('dialog', (dialog) => dialog.accept())
  await renamedRow.getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('tr').filter({ hasText: renamed })).not.toBeVisible()
})
