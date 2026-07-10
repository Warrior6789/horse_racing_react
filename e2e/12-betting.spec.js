import { test, expect } from '@playwright/test'
import { login, createRace, createHorse, registerHorseToRace, registerFreshSpectator, fundAccountBalance } from './helpers'

const ADMIN = { email: 'e2e-admin-fixed@test.com', password: 'Passw0rd!123' }
const OWNER = { email: 'e2e-owner-fixed@test.com', password: 'Passw0rd!123' }

test('spectator can place a bet on a confirmed horse once betting is open', async ({ page }) => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requires E2E_DATABASE_URL to fund a fresh spectator account')

  const unique = Date.now()
  const raceName = `E2E Betting Race ${unique}`
  const horseName = `E2E Betting Horse ${unique}`

  await login(page, ADMIN)
  await createRace(page, { raceName, racecourseName: 'E2E Test Track', raceNumber: 96, startTimeMinutesFromNow: 260 })

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
  await regRow.getByRole('button', { name: 'Accept' }).click()
  await expect(regRow.getByText(/Approved|Confirmed/)).toBeVisible()

  await page.goto('/admin/races')
  const adminRaceRow = page.locator('tr').filter({ hasText: raceName })
  await adminRaceRow.waitFor()
  await adminRaceRow.getByRole('button', { name: 'Advance' }).click()
  await expect(adminRaceRow.getByText('Betting Open')).toBeVisible({ timeout: 15_000 })

  const spectator = await registerFreshSpectator(page, 'bettor')
  await fundAccountBalance(spectator.email, 500_000)

  await login(page, spectator)
  await page.goto('/spectator/races')
  const spectatorRaceCard = page.locator('div[class*="hover:border-stone-700/80"]').filter({ hasText: raceName })
  await spectatorRaceCard.waitFor()
  await spectatorRaceCard.getByRole('button', { name: 'Place Bet' }).click()

  await expect(page).toHaveURL(/\/spectator\/races\/.+\/bet/)
  await page.locator('button').filter({ hasText: horseName }).click()
  await page.getByRole('button', { name: 'Win', exact: true }).click()
  await page.locator('input[placeholder="0"]').fill('10000')
  await page.getByRole('button', { name: 'Confirm Wager' }).click()

  await expect(page.getByText('Bet Placed!')).toBeVisible({ timeout: 15_000 })

  await page.goto('/spectator/bets')
  const betCard = page.locator('h3').filter({ hasText: horseName })
  await expect(betCard).toBeVisible()
})
