import { test, expect } from '@playwright/test'
import { login, createRace, createHorse, registerHorseToRace, registerFreshSpectator, registerFreshOwner, registerFreshJockey, fundAccountBalance } from './helpers'

const ADMIN = { email: 'e2e-admin-fixed@test.com', password: 'Passw0rd!123' }

test('referee can submit a report while a race is Live and admin can approve it', async ({ page }) => {
  test.setTimeout(300_000)
  test.skip(!process.env.E2E_DATABASE_URL, 'requires E2E_DATABASE_URL to fund the fresh owner accounts')

  const unique = Date.now()
  const raceName = `E2E Referee Race ${unique}`
  const horseNames = [`E2E Ref Horse A ${unique}`, `E2E Ref Horse B ${unique}`, `E2E Ref Horse C ${unique}`]

  const owners = []
  const jockeys = []
  for (let i = 0; i < 3; i++) {
    const owner = await registerFreshOwner(page, ADMIN, `ref-owner-${i}-${unique}`)
    await fundAccountBalance(owner.email, 50_000)
    owners.push(owner)

    jockeys.push(await registerFreshJockey(page, ADMIN, `ref-jockey-${i}-${unique}`))
  }

  const refereeAccount = await registerFreshSpectator(page, 'referee')
  await login(page, refereeAccount)
  await page.goto('/upgrade')
  await page.getByText('Referee', { exact: true }).click()
  await page.locator('label:text-is("Full Name") + input, input[placeholder="Enter your full name"]').fill('E2E Referee')
  await page.locator('input[placeholder="+84 912 345 678"]').fill('0900000001')
  await page.getByRole('button', { name: 'Submit Request' }).click()
  await expect(page.getByText('Request Submitted!')).toBeVisible()

  await login(page, ADMIN)
  await page.goto('/admin/accounts')
  await page.getByRole('button', { name: 'Upgrade Requests' }).click()
  const upgradeRow = page.locator('div[class*="rounded-2xl border border-gray-100"]').filter({ hasText: refereeAccount.email })
  await upgradeRow.waitFor()
  await upgradeRow.getByRole('button', { name: 'Approve' }).click()

  await createRace(page, { raceName, racecourseName: 'E2E Test Track', raceNumber: 95, startTimeMinutesFromNow: 300 })

  for (let i = 0; i < horseNames.length; i++) {
    const horseName = horseNames[i]
    await login(page, owners[i])
    await createHorse(page, horseName)
    await login(page, owners[i])
    await registerHorseToRace(page, { raceName, horseName, jockeySearchText: jockeys[i].fullName, gateNumber: String(i + 1) })
  }

  await login(page, ADMIN)
  await page.goto('/admin/registrations')
  const raceRow = page.locator('tr').filter({ hasText: raceName })
  await raceRow.waitFor()
  await raceRow.getByRole('button', { name: 'View Registrations' }).click()
  for (const horseName of horseNames) {
    const regRow = page.locator('tr').filter({ hasText: horseName })
    await regRow.waitFor()
    await expect(regRow.getByText('Pending')).toBeVisible()
    await regRow.getByRole('button', { name: 'Accept' }).click()
    await expect(regRow.getByText(/Approved|Confirmed/)).toBeVisible({ timeout: 10_000 })
  }

  await page.goto('/admin/referees')
  const assignRow = page.locator('tr').filter({ hasText: raceName })
  await assignRow.waitFor()
  await assignRow.locator('select').selectOption({ label: 'E2E Referee' })
  await assignRow.getByRole('button', { name: 'Assign' }).click()

  await page.goto('/admin/races')
  const adminRaceRow = page.locator('tr').filter({ hasText: raceName })
  for (let i = 0; i < 3; i++) {
    await adminRaceRow.getByRole('button', { name: 'Advance' }).click()
    await page.waitForTimeout(1000)
  }
  await expect(adminRaceRow.getByText('Live')).toBeVisible({ timeout: 15_000 })

  await login(page, refereeAccount)
  await page.goto('/referee/races')
  const refereeRaceCard = page.locator('div[class*="bg-[#0e1a0c]"]').filter({ hasText: raceName })
  await refereeRaceCard.getByRole('button', { name: 'View & Report' }).click()

  await page.locator('form').getByRole('combobox').selectOption({ label: new RegExp(horseNames[0]) })
  await page.getByPlaceholder(/Detail the specific nature/).fill('E2E test incident: horse drifted out of lane during the back stretch.')
  await page.getByRole('button', { name: 'Submit Official Report' }).click()
  await expect(page.getByText('Report submitted successfully')).toBeVisible()

  await login(page, ADMIN)
  await page.goto('/admin/referee-reports')
  const reportRow = page.locator('tr').filter({ hasText: horseNames[0] })
  await reportRow.waitFor()
  await reportRow.getByRole('button', { name: 'Approve' }).click()
  await expect(reportRow.getByText('Approved')).toBeVisible()
})
