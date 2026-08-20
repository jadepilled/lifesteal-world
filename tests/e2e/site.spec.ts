import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = ['/', '/artists/', '/releases/', '/radio/', '/store/', '/about/'];
const sitePath = process.env.GITHUB_PAGES === 'true' ? '/lifesteal-world' : '';
const siteUrl = (path: string) => `${sitePath}${path}`;

test.describe('site shell', () => {
  for (const route of routes) {
    test(`${route} renders the shared shell without serious accessibility violations`, async ({
      page,
    }) => {
      await page.goto(siteUrl(route));
      await expect(page.locator('.wordmark')).toHaveText('lifesteal');
      await expect(page.locator('footer')).toContainText('LIFESTEAL acknowledges');
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.filter((violation) =>
          ['serious', 'critical'].includes(violation.impact ?? ''),
        ),
      ).toEqual([]);
    });
  }

  test('navigation reaches every primary page', async ({ page }) => {
    await page.goto(siteUrl('/'));
    for (const label of ['artists', 'releases', 'radio', 'store', 'about']) {
      await page.locator(`nav a[href="${siteUrl(`/${label}/`)}"]`).click();
      await expect(page).toHaveURL(new RegExp(`/${label}/$`));
      await page.goto(siteUrl('/'));
    }
  });
});

test('landing presents the ASCII signal and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(siteUrl('/'));
  await expect(page.getByRole('heading', { name: 'LIFESTEAL' })).toBeVisible();
  await expect(page.locator('[data-ascii-logo]')).toBeVisible();
  await expect(page.locator('[data-drip-canvas]')).toHaveCSS('display', 'none');
});

test('artist browser is keyboard-operable and deep-linkable', async ({ page }) => {
  await page.goto(siteUrl('/artists/#hazelmere'));
  await expect(page.getByRole('heading', { name: 'HAZELMERE' })).toBeVisible();
  await page.getByRole('button', { name: 'Next artist' }).click();
  await expect(page.getByRole('heading', { name: 'starstrike' })).toBeVisible();
  await expect(page).toHaveURL(/#starstrike$/);
  await page.locator('[data-artist-browser]').press('ArrowLeft');
  await expect(page.getByRole('heading', { name: 'HAZELMERE' })).toBeVisible();
});

test('release and store records are canonical and intentionally pending', async ({ page }) => {
  await page.goto(siteUrl('/releases/'));
  const releaseIds = await page
    .locator('[data-release-id]')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute('data-release-id')));
  expect(new Set(releaseIds).size).toBe(releaseIds.length);
  await page.goto(siteUrl('/store/'));
  await expect(page.getByText('PRE-SAVE LINK INITIALISING')).toHaveCount(2);
});

test('radio has an explicit safe offline state', async ({ page }) => {
  await page.goto(siteUrl('/radio/'));
  await expect(page.getByRole('button', { name: 'TRANSMISSION SERVER PENDING' })).toBeDisabled();
  await expect(page.locator('[data-radio-notice]')).toContainText('SIGNAL OFFLINE');
});

test('about exposes the direct contact channel', async ({ page }) => {
  await page.goto(siteUrl('/about/'));
  await expect(page.getByRole('link', { name: 'hello@lifesteal.world' })).toHaveAttribute(
    'href',
    'mailto:hello@lifesteal.world',
  );
});
