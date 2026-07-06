import { test, expect } from '@playwright/test'

const OWNER = { email: 'e2e-owner-fixed@test.com', password: 'Passw0rd!123' }
const RACE_ID = '14ea7401-47d2-4304-a197-3fa6baf14008'

async function login(page, { email, password }) {
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
}

test('owner can register a horse into a race', async ({ page }) => {
  await login(page, OWNER)
  await expect(page).toHaveURL(/\/owner\/dashboard/)

  await page.goto(`/owner/races/${RACE_ID}/register`)

  await page.getByText('Top Picks by Win Record').waitFor()
  await page.getByText('E2E Thunder').click()

  await page.locator('input[type="number"]').fill('3')

  await page.getByText('No Jockey Assigned').click()
  await page.getByPlaceholder('Search jockeys...').fill('E2E Jockey')
  const jockeyCard = page.locator('div.snap-start').filter({ hasText: 'E2E Jockey' })
  await jockeyCard.getByRole('button', { name: 'Select' }).click()

  await page.getByText(/agree to the/i).click()

  await page.getByRole('button', { name: 'Confirm Entry' }).click()

  await expect(page).toHaveURL(/\/owner\/races$/)
})
