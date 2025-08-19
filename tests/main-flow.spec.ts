import {test, expect, Route} from '@playwright/test';
const serviceURL = 'http://localhost:3000';

test('main flow', async ({ page }) => {
  await page.goto(serviceURL);
  await page.getByTestId('id-small-loan-calculator-field-apply').click();
  await page.getByTestId('login-popup-username-input').click();
  await page.getByTestId('login-popup-username-input').fill('usern');
  await page.getByTestId('login-popup-username-input').press('Tab');
  await page.getByTestId('login-popup-password-input').fill('pwd');
  await page.getByTestId('login-popup-continue-button').click();
  await page.getByTestId('final-page-continue-button').click();
  await page.getByTestId('final-page-success-ok-button').click();
});

test('redirect flow', async ({ page, request }) => {
  await page.goto(serviceURL);
  await page.getByTestId('id-image-element-button-image-1').click();
  await expect( page.getByTestId('id-small-loan-calculator-field-apply') ).toBeInViewport()
  await page.getByTestId('id-image-element-button-image-2').click();
  await expect( page.getByTestId('id-small-loan-calculator-field-apply') ).toBeInViewport()
})

test('Error message case', async ({ page, request }) => {
  await page.route('**/api/loan-calc?amount=*&period=*', async (route: Route) => {
    const request = route.request();
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 400,
      })
    } else {
      await route.continue()
    }
  })
  await page.goto(serviceURL);
  const errorElement = await page.getByTestId('id-small-loan-calculator-field-error');
  await expect(errorElement).toHaveText('Oops, something went wrong');
})

