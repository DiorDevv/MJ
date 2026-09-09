import { expect, test } from '@playwright/test'

/**
 * One end-to-end path through the real stack: register → quick-add a task →
 * complete it → the app reflects it. If this passes, the frontend, nginx, the
 * API and Postgres are all wired together and working.
 *
 * A fresh browser has no language preference, so the app renders in English
 * (i18next language detector) — the locators below use the English strings.
 */
test('register, add a task, complete it, see it reflected', async ({ page }) => {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1e4)}`
  const username = `e2e_${stamp}`
  const password = 'Passw0rd123'

  await page.goto('/register')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Sign up' }).click()

  await expect(page).toHaveURL(/\/app\/today/, { timeout: 15_000 })

  const title = `E2E task ${stamp}`
  const quickAdd = page.getByPlaceholder(/Quick add/)
  await quickAdd.fill(title)
  await quickAdd.press('Enter')

  // A task due today whose time has already passed shows in both the "overdue"
  // and "today" sections, so scope to the first matching row.
  const row = page.getByRole('row', { name: new RegExp(title) }).first()
  await expect(row).toBeVisible({ timeout: 10_000 })

  await row.getByRole('checkbox', { name: 'Mark as complete' }).click()
  await expect(row.getByRole('checkbox', { name: 'Reopen' })).toBeVisible()

  // Daily hero ring now reads 1 of 1.
  await expect(page.getByText('1 of 1')).toBeVisible()

  // Stats page loads and renders its dashboard cards.
  await page.goto('/app/stats')
  await expect(page.getByRole('heading', { name: 'Streak' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'Completion trend' })).toBeVisible()
})
