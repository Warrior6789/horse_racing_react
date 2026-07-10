import { expect } from '@playwright/test'

export async function login(page, { email, password }) {
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
}

export async function registerFreshSpectator(page, label = 'spectator') {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`
  const email = `e2e-${label}-${unique}@test.com`
  const password = 'Passw0rd!123'

  await page.goto('/register')
  await page.locator('#fullName').fill(`E2E ${label}`)
  await page.locator('#email').fill(email)
  await page.locator('#phone').fill('0900000000')
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Create Account' }).click()
  await expect(page).toHaveURL(/\/login\?registered=1/)

  return { email, password }
}

export async function createHorse(page, horseName) {
  await page.goto('/owner/horses/new')
  await page.locator('label:text-is("Horse Name *") + input').fill(horseName)
  await page.getByRole('button', { name: 'Save Horse' }).click()
  await expect(page).toHaveURL(/\/owner\/horses$/)
}

export async function createRace(page, { raceName, racecourseName, raceNumber, startTimeMinutesFromNow = 120 }) {
  await page.goto('/admin/races')
  await page.getByRole('button', { name: 'Create Race' }).click()

  await page.locator('label:text-is("Race Name *") + input').fill(raceName)
  await page.locator('label:text-is("Racecourse *") + select').selectOption({ label: racecourseName })
  await page.locator('label:text-is("Race #") + input').fill(String(raceNumber))

  const startTime = new Date(Date.now() + startTimeMinutesFromNow * 60_000)
  const pad = (n) => String(n).padStart(2, '0')
  const localValue = `${startTime.getFullYear()}-${pad(startTime.getMonth() + 1)}-${pad(startTime.getDate())}T${pad(startTime.getHours())}:${pad(startTime.getMinutes())}`
  await page.locator('label:text-is("Start Time") + input').fill(localValue)

  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Create Race', { exact: true })).not.toBeVisible()

  const row = page.locator('tr').filter({ hasText: raceName })
  await row.waitFor()
  return row
}

export async function registerHorseToRace(page, { raceName, horseName, jockeySearchText = 'E2E Jockey', gateNumber = '1' }) {
  await page.goto('/owner/races')
  const raceCard = page.locator('div[class*="hover:border-gray-600"]').filter({ hasText: raceName })
  await raceCard.waitFor()
  await raceCard.getByRole('button', { name: 'Register', exact: true }).click()

  const viewMore = page.getByText(/View More/)
  if (await viewMore.isVisible().catch(() => false)) {
    await viewMore.click()
    const horseCard = page.locator('div.snap-start').filter({ hasText: horseName })
    await horseCard.getByRole('button', { name: /Select|Unavailable/ }).click()
  } else {
    await page.locator('div').filter({ hasText: horseName }).last().click()
  }

  await page.locator('input[placeholder="e.g. 3"]').fill(gateNumber)

  await page.getByText(/No Jockey Assigned|Change Jockey/i).first().click()
  await page.getByPlaceholder('Search jockeys...').fill(jockeySearchText)
  const jockeyCard = page.locator('div.snap-start').filter({ hasText: jockeySearchText })
  await jockeyCard.getByRole('button', { name: 'Select' }).click()

  await page.getByText(/agree to the/i).click()
  await page.getByRole('button', { name: 'Confirm Entry' }).click()
  await expect(page).toHaveURL(/\/owner\/races$/)
}

export async function adminAcceptRegistration(page, { raceName, horseName }) {
  await page.goto('/admin/registrations')
  const raceRow = page.locator('tr').filter({ hasText: raceName })
  await raceRow.waitFor()
  await raceRow.getByRole('button', { name: 'View Registrations' }).click()

  const regRow = page.locator('tr').filter({ hasText: horseName })
  await regRow.waitFor()
  await regRow.getByRole('button', { name: 'Accept' }).click()
}
