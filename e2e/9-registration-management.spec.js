import { test, expect } from '@playwright/test'
import { login, createRace, createHorse, registerHorseToRace } from './helpers'

const ADMIN = { email: 'e2e-admin-fixed@test.com', password: 'Passw0rd!123' }
const OWNER = { email: 'e2e-owner-fixed@test.com', password: 'Passw0rd!123' }

test('admin can accept a registration and then scratch the confirmed horse', async ({ page }) => {
  const unique = Date.now()
  const raceName = `E2E RegMgmt Race ${unique}`
  const horseName = `E2E RegMgmt Horse ${unique}`

  await login(page, ADMIN)
  await createRace(page, { raceName, racecourseName: 'E2E Test Track', raceNumber: 98, startTimeMinutesFromNow: 150 })

  await login(page, OWNER)
  await createHorse(page, horseName)

  await login(page, OWNER)
  await registerHorseToRace(page, { raceName, horseName })

  await login(page, ADMIN)
  await page.goto('/admin/registrations')
  const raceRow = page.locator('tr').filter({ hasText: raceName })
  await raceRow.waitFor()
  await raceRow.getByRole('button', { name: 'View Registrations' }).click()

  const regRow = page.locator('tr').filter({ hasText: horseName })
  await regRow.waitFor()
  await expect(regRow.getByText('Pending')).toBeVisible()
  await regRow.getByRole('button', { name: 'Accept' }).click()

  await expect(regRow.getByText(/Approved|Confirmed/)).toBeVisible()

  await regRow.getByRole('button', { name: 'Scratch' }).click()
  await expect(regRow.getByText('Scratched')).toBeVisible()
})

test('admin can reject a pending registration', async ({ page }) => {
  const unique = Date.now()
  const raceName = `E2E RegReject Race ${unique}`
  const horseName = `E2E RegReject Horse ${unique}`

  await login(page, ADMIN)
  await createRace(page, { raceName, racecourseName: 'E2E Test Track', raceNumber: 97, startTimeMinutesFromNow: 150 })

  await login(page, OWNER)
  await createHorse(page, horseName)

  await login(page, OWNER)
  await registerHorseToRace(page, { raceName, horseName })

  await login(page, ADMIN)
  await page.goto('/admin/registrations')
  const raceRow = page.locator('tr').filter({ hasText: raceName })
  await raceRow.waitFor()
  await raceRow.getByRole('button', { name: 'View Registrations' }).click()

  const regRow = page.locator('tr').filter({ hasText: horseName })
  await regRow.waitFor()
  await regRow.getByRole('button', { name: 'Reject' }).click()

  await expect(regRow.getByText('Rejected')).toBeVisible()
})
