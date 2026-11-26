import { expect, test } from '@playwright/test'

const ME = {
  user: { id: 'u1', email: 'ann@example.com', fullName: 'Ann Lee', systemRole: 'USER' },
  next: 'home',
}

test('Log out opens a plain Sign in and Back does not show the protected page', async ({
  page,
}) => {
  let signedIn = true
  await page.route('http://api.e2e/auth/me', (route) =>
    signedIn ? route.fulfill({ json: ME }) : route.fulfill({ status: 401, json: {} }),
  )
  await page.route('http://api.e2e/auth/logout', (route) => {
    signedIn = false
    return route.fulfill({ status: 204 })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Ann Lee' }).click()
  await page.getByRole('menuitem', { name: 'Profile' }).click()
  await expect(page.getByRole('heading', { name: 'Profile and account settings' })).toBeVisible()

  await page.getByRole('button', { name: 'Ann Lee' }).click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/signin$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/\/signin$/)
  await expect(page.getByRole('heading', { name: 'Home' })).toBeHidden()
})
