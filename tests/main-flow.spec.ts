import {test, expect, Route, Page} from '@playwright/test';

const serviceURL = 'http://localhost:3000';

async function performLoginAndApply(page: Page) {
  await page.getByTestId('id-small-loan-calculator-field-apply').click();
  await page.getByTestId('login-popup-username-input').fill('usern');
  await page.getByTestId('login-popup-password-input').fill('pwd');
  await page.getByTestId('login-popup-continue-button').click();
  await page.getByTestId('final-page-continue-button').click();
}

async function openPageAndWaitForAPI(page: Page, apiPattern: string) {
  const responsePromise = page.waitForResponse(apiPattern);
  await page.goto(serviceURL);
  await responsePromise;
}


test('main flow', async ({page}) => {
  await page.goto(serviceURL);
  await performLoginAndApply(page);
  await page.getByTestId('final-page-success-ok-button').click();
});

test('redirect flow', async ({page, request}) => {
  await page.goto(serviceURL);
  await page.getByTestId('id-image-element-button-image-1').click();
  await expect(page.getByTestId('id-small-loan-calculator-field-apply')).toBeInViewport()
  await page.getByTestId('id-image-element-button-image-2').click();
  await expect(page.getByTestId('id-small-loan-calculator-field-apply')).toBeInViewport()
})

test('Error message case', async ({page, request}) => {
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

test('Monthly payment display for 500€ over 12 months', async ({ page }) => {
  const apiPattern = '**/api/loan-calc?amount=*&period=*';
  await page.route(apiPattern, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ paymentAmountMonthly: 42.8 }),
    });
  });

  await openPageAndWaitForAPI(page, apiPattern);
  await performLoginAndApply(page);

  const monthlyPayment = page.getByTestId('final-page-monthly-payment');
  await expect(monthlyPayment).toBeVisible();
  await expect(monthlyPayment).toContainText('42.8 €');
});

test('Handle server error gracefully', async ({ page }) => {
  const apiPattern = '**/api/loan-calc?amount=*&period=*';
  await page.route(apiPattern, async (route: Route) => {
    await route.fulfill({ status: 500 });
  });

  await openPageAndWaitForAPI(page, apiPattern);

  const errorMsg = page.getByTestId('id-small-loan-calculator-field-error');
  await expect(errorMsg).toHaveText('Oops, something went wrong');
});

test('Main flow completes successfully with empty response', async ({ page }) => {
  const apiPattern = '**/api/loan-calc?amount=*&period=*';
  await page.route(apiPattern, async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '' });
  });

  await openPageAndWaitForAPI(page, apiPattern);
  await performLoginAndApply(page);

  const popup = page.locator('.popup-overlay');
  await expect(popup).toBeVisible();
  await expect(popup).toContainText('Success!');
});

test('Main flow completes with unexpected response key', async ({ page }) => {
  const apiPattern = '**/api/loan-calc?amount=*&period=*';
  await page.route(apiPattern, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ wrongKey: 456.78 }),
    });
  });

  await openPageAndWaitForAPI(page, apiPattern);
  await performLoginAndApply(page);

  const popup = page.locator('.popup-overlay');
  await expect(popup).toBeVisible();
  await expect(popup).toContainText('Success!');
});