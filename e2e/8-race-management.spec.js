import { test, expect } from '@playwright/test'
import { login, createRace } from './helpers'

const ADMIN = { email: 'e2e-admin-fixed@test.com', password: 'Passw0rd!123' }

test('admin can create, edit, and delete a race', async ({ page }) => {
  const unique = Date.now()
  const raceName = `E2E CRUD Race ${unique}`
  const renamed = `${raceName} Renamed`

  await login(page, ADMIN)

  const row = await createRace(page, {
    raceName,
    racecourseName: 'E2E Test Track',
    raceNumber: 99,
    startTimeMinutesFromNow: 150,
  })
  await expect(row.getByText('Scheduled')).toBeVisible()

  await row.getByRole('button', { name: 'Edit' }).click()
  await page.locator('label:text-is("Race Name *") + input').fill(renamed)
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  const renamedRow = page.locator('tr').filter({ hasText: renamed })
  await renamedRow.waitFor()

  page.once('dialog', (dialog) => dialog.accept())
  await renamedRow.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.locator('tr').filter({ hasText: renamed })).not.toBeVisible()
})
