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
      await expect(page.locator('.terminal-path')).toHaveCount(0);
      await expect(page.locator('.page-heading p')).toHaveCount(0);
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
      await expect(page).toHaveURL(new RegExp(`/${label}/(?:#.*)?$`));
      await page.goto(siteUrl('/'));
    }
  });
});

test('landing presents the ASCII signal and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(siteUrl('/'));
  await expect(page.getByRole('heading', { name: 'LIFESTEAL' })).toBeVisible();
  await expect(page.locator('[data-ascii-logo]')).toBeVisible();
  await expect(page.locator('[data-ascii-output]')).toContainText('___ ____');
  await expect(page.getByText('LIFESTEAL // HOME')).toBeVisible();
  await expect(page.getByText('FOUNDED 2021')).toBeVisible();
  await expect(page.getByText('INDEPENDENT AUDIO // NAARM')).toBeVisible();
  await expect(page.locator('[data-drip-canvas]')).toHaveCSS('display', 'none');
  await expect(page.locator('.site-footer__rule')).toHaveCount(0);
  await expect(page.getByText('EOF', { exact: true })).toHaveCount(0);
});

test('landing types for five seconds, then exposes a silent colour terminal', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The colour terminal is intentionally desktop-only.');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(siteUrl('/'));
  const logo = page.locator('[data-ascii-logo]');
  const terminal = page.locator('[data-terminal-input]');
  await page.waitForTimeout(900);
  await expect(logo).toHaveAttribute('data-typing', 'true');
  await expect(terminal).not.toBeVisible();
  await expect(logo).toHaveAttribute('data-typing', 'false', { timeout: 6_000 });
  await expect(terminal).toBeVisible();

  for (const [command, mode] of [
    ['RED', 'red'],
    ['GAY', 'gay'],
    ['LESBIAN', 'lesbian'],
    ['PANSEXUAL', 'pansexual'],
    ['BISEXUAL', 'bisexual'],
    ['TRANSGENDER', 'transgender'],
    ['INTERSEX', 'intersex'],
    ['LGBT', 'rainbow'],
    ['INDIGENOUS', 'aboriginal'],
  ]) {
    await terminal.fill(command);
    await terminal.press('Enter');
    await expect(page.locator('[data-ascii-stage]')).toHaveAttribute('data-colour-mode', mode);
    await expect(terminal).toHaveValue('');
  }
});

test('header prism plays only when the wordmark is hovered', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(siteUrl('/about/'));
  const wordmark = page.locator('.wordmark');
  const animationName = () =>
    wordmark.evaluate((element) => getComputedStyle(element, '::after').animationName);

  expect(await animationName()).toBe('none');
  await wordmark.hover();
  expect(await animationName()).toBe('wordmark-prism');
  await page.mouse.move(900, 500);
  expect(await animationName()).toBe('none');
  await wordmark.hover();
  expect(await animationName()).toBe('wordmark-prism');
});

test('artist browser is keyboard-operable and deep-linkable', async ({ page }) => {
  await page.goto(siteUrl('/artists/#hazelmere'));
  await expect(page.getByRole('heading', { name: 'HAZELMERE' })).toBeVisible();
  await page.getByRole('button', { name: 'Show starstrike' }).click();
  await expect(page.getByRole('heading', { name: 'starstrike' })).toBeVisible();
  await expect(page).toHaveURL(/#starstrike$/);
  await page.locator('[data-gallery]').press('ArrowLeft');
  await expect(page.getByRole('heading', { name: 'HAZELMERE' })).toBeVisible();
  await expect(page.locator('[data-gallery-position]')).toHaveText('01 / 02');
});

test('release and store records are canonical and intentionally pending', async ({ page }) => {
  await page.goto(siteUrl('/releases/'));
  const releaseIds = await page
    .locator('[data-release-id]')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute('data-release-id')));
  expect(new Set(releaseIds).size).toBe(releaseIds.length);
  await expect(page.getByText('02 OCT 2026')).toBeVisible();
  await page.getByRole('button', { name: 'Show AUDIOCLUB' }).click();
  await expect(page.getByText('25 SEPT 2026')).toBeVisible();
  await expect(page.locator('[data-gallery-position]')).toHaveText('02 / 02');
  await page.goto(siteUrl('/store/'));
  await expect(page.locator('.page-heading')).toHaveCount(0);
  await expect(page.getByText('PRE-SAVE LINK INITIALISING')).toHaveCount(2);
});

test('desktop routes keep the complete shell inside one viewport', async ({ page }) => {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(siteUrl(route));
      await page.waitForLoadState('networkidle');
      const dimensions = await page.evaluate(() => ({
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
        footerBottom: document.querySelector('footer')?.getBoundingClientRect().bottom ?? 0,
      }));
      expect(
        dimensions.scrollHeight,
        `${route} should not scroll at ${viewport.width}×${viewport.height}`,
      ).toBeLessThanOrEqual(dimensions.clientHeight + 1);
      expect(
        dimensions.footerBottom,
        `${route} footer should remain visible at ${viewport.width}×${viewport.height}`,
      ).toBeLessThanOrEqual(dimensions.clientHeight + 1);
    }
  }
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
