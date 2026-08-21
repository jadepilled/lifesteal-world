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
      await expect(page.locator('.page-heading')).toHaveCount(0);
      await expect(page.locator('.site-header__status')).toHaveCount(0);
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
    await page.evaluate(() => sessionStorage.setItem('lifesteal.newsletterGateSeen', 'true'));
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
  await expect(page.locator('[data-ascii-logo] [data-ascii-output]')).toContainText('___ ____');
  await expect(page.getByText('LIFESTEAL // HOME')).toHaveCount(0);
  await expect(page.getByText('FOUNDED 2021')).toHaveCount(0);
  await expect(page.getByText('INDEPENDENT AUDIO // NAARM')).toBeVisible();
  await expect(page.locator('[data-rain-canvas]')).toHaveCSS('display', 'none');
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
  const prismOpacity = () =>
    wordmark.evaluate((element) => getComputedStyle(element, '::after').opacity);

  expect(await animationName()).toBe('none');
  await expect(wordmark).toHaveCSS('text-shadow', 'none');
  expect(await prismOpacity()).toBe('0');
  await wordmark.hover();
  expect(await animationName()).toBe('wordmark-prism');
  expect(await prismOpacity()).toBe('1');
  await page.mouse.move(900, 500);
  expect(await animationName()).toBe('none');
  expect(await prismOpacity()).toBe('0');
  await wordmark.hover();
  expect(await animationName()).toBe('wordmark-prism');
});

test('terminal text aligns with its prompt and persisted flag themes clip through the logo', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The command terminal is intentionally desktop-only.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(siteUrl('/'));
  const terminal = page.locator('[data-terminal-input]');
  await terminal.fill('TRANS');
  const geometry = await page.evaluate(() => {
    const prompt = document.querySelector('.ascii-terminal__prompt')?.getBoundingClientRect();
    const value = document.querySelector('.ascii-terminal__value')?.getBoundingClientRect();
    return { promptTop: prompt?.top ?? 0, valueTop: value?.top ?? 0 };
  });
  expect(Math.abs(geometry.promptTop - geometry.valueTop)).toBeLessThanOrEqual(1);
  await terminal.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'transgender');
  await expect
    .poll(() =>
      page
        .locator('[data-ascii-logo] [data-ascii-output]')
        .evaluate((element) => getComputedStyle(element).backgroundImage),
    )
    .toContain('rgb(91, 206, 250)');

  await terminal.fill('ABORIGINAL');
  await terminal.press('Enter');
  await expect
    .poll(() =>
      page
        .locator('[data-ascii-logo] [data-ascii-output]')
        .evaluate((element) => getComputedStyle(element).backgroundImage),
    )
    .toContain('rgb(255, 207, 0)');

  await page.goto(siteUrl('/about/'));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'aboriginal');
  const accent = await page
    .locator('html')
    .evaluate((element) => getComputedStyle(element).getPropertyValue('--accent').trim());
  expect(accent).toBe('#dd0000');
});

test('custom terminal gradients persist without reverting to red between pages', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The command terminal is intentionally desktop-only.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(siteUrl('/'));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'green');

  const stage = page.locator('[data-ascii-stage]');
  const terminal = page.locator('[data-terminal-input]');
  await stage.click({ position: { x: 30, y: 30 } });
  await expect(terminal).toBeFocused();
  await terminal.fill('RED RED BLUE GREEN RED');
  await terminal.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'custom-gradient');
  await expect(stage).toHaveAttribute('data-colour-mode', 'custom-gradient');

  const stored = await page.evaluate(() => ({
    command: localStorage.getItem('lifesteal.theme'),
    accent: localStorage.getItem('lifesteal.accent'),
    gradient: getComputedStyle(document.documentElement)
      .getPropertyValue('--site-logo-background')
      .trim(),
  }));
  expect(stored.command).toBe('RED RED BLUE GREEN RED');
  expect(stored.accent).toBe('#ff304f');
  expect(stored.gradient.match(/#ff304f/g)?.length).toBe(3);

  await page.goto(siteUrl('/about/'));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'custom-gradient');
  const persistedAccent = await page
    .locator('html')
    .evaluate((element) => getComputedStyle(element).getPropertyValue('--accent').trim());
  expect(persistedAccent).toBe('#ff304f');
});

test('home navigation shows the newsletter gate only once per site visit', async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(siteUrl('/'));
  if (isMobile) {
    await page.locator(`nav a[href="${siteUrl('/artists/')}"]`).click();
  } else {
    const terminal = page.locator('[data-terminal-input]');
    await terminal.fill('artists');
    await terminal.press('Enter');
  }
  await expect(page).toHaveURL(/\/artists\/(?:#.*)?$/);
  await expect(page.getByRole('dialog', { name: 'ACCESS GRANTED' })).toBeVisible();
  await page.getByRole('button', { name: 'CONTINUE WITHOUT SIGNING UP' }).click();
  await expect(page).toHaveURL(/\/artists\/(?:#.*)?$/);

  await page.goto(siteUrl('/'));
  await page.locator(`nav a[href="${siteUrl('/releases/')}"]`).click();
  await expect(page).toHaveURL(/\/releases\/(?:#.*)?$/);
  await expect(page.locator('[data-newsletter-gate]')).not.toBeVisible();
});

test('RESET restores green and SNAKE runs inside the terminal panel', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The command terminal is intentionally desktop-only.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(siteUrl('/'));
  const terminal = page.locator('[data-terminal-input]');

  await terminal.fill('PURPLE');
  await terminal.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'purple');
  await terminal.fill('RESET');
  await terminal.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'green');
  expect(await page.evaluate(() => localStorage.getItem('lifesteal.theme'))).toBeNull();

  await terminal.fill('SNAKE');
  await terminal.press('Enter');
  const game = page.locator('[data-snake]');
  await expect(game).toBeVisible();
  await expect(page.locator('[data-ascii-stage]')).toHaveAttribute('data-snake-active', 'true');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(150);
  await expect(page.locator('[data-snake-score]')).toContainText('SCORE');
  await page.keyboard.press('Escape');
  await expect(game).toBeHidden();
  await expect(terminal).toBeFocused();
});

test('client navigation keeps the shared shell and reinitializes the landing terminal', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(siteUrl('/'));
  await page.evaluate(() => sessionStorage.setItem('lifesteal.newsletterGateSeen', 'true'));
  await expect(page.locator('meta[name="astro-view-transitions-enabled"]')).toHaveCount(1);
  await page.locator(`nav a[href="${siteUrl('/store/')}"]`).click();
  await expect(page).toHaveURL(/\/store\/$/);
  await expect(page.locator('.wordmark')).toBeVisible();
  await page.locator('.wordmark').click();
  await expect(page).toHaveURL(new RegExp(`${sitePath}/?$`));
  await expect(page.locator('[data-ascii-logo] [data-ascii-output]')).toContainText('___ ____');
  await expect(page.locator('.site-header')).toBeVisible();
});

test('newsletter signup posts an identifiable home-gate record before continuing', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let submitted: Record<string, string> = {};
  await page.route('https://lifesteal-signal-api.jade-431.workers.dev/subscribe', async (route) => {
    submitted = route.request().postDataJSON() as Record<string, string>;
    await route.fulfill({ status: 201, contentType: 'application/json', body: '{"ok":true}' });
  });
  await page.goto(siteUrl('/'));
  await page.locator(`nav a[href="${siteUrl('/radio/')}"]`).click();
  await expect(page).toHaveURL(/\/radio\/$/);
  await expect(page.getByRole('dialog', { name: 'ACCESS GRANTED' })).toBeVisible();
  await page.getByLabel('EMAIL ADDRESS').fill('listener@example.com');
  await page.getByRole('button', { name: 'JOIN MAILING LIST' }).click();
  await expect(page.getByText('SIGNAL RECEIVED // SUBSCRIBED')).toBeVisible();
  expect(submitted).toMatchObject({
    email: 'listener@example.com',
    source: 'homepage_gate',
  });
  await expect(page).toHaveURL(/\/radio\/$/);
});

test('artist browser is keyboard-operable and deep-linkable', async ({ page }) => {
  await page.goto(siteUrl('/artists/#hazelmere'));
  await expect(page.getByRole('heading', { name: 'HAZELMERE' })).toHaveText('HAZELMERE');
  await expect(page.locator('#hazelmere ascii-title')).toBeVisible();
  await page.getByRole('button', { name: 'Show starstrike' }).click();
  await expect(page.getByRole('heading', { name: 'starstrike' })).toHaveText('starstrike');
  await expect(page.locator('#starstrike ascii-title')).toBeVisible();
  await expect(page).toHaveURL(/#starstrike$/);
  await page.locator('[data-gallery]').press('ArrowLeft');
  await expect(page.getByRole('heading', { name: 'HAZELMERE' })).toHaveText('HAZELMERE');
  await expect(page.locator('[data-gallery-position]')).toHaveText('01 / 02');
});

test('mobile artist details are split into compact Info and Links disclosures', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'This disclosure layout is mobile-specific.');
  await page.goto(siteUrl('/artists/#hazelmere'));
  const article = page.locator('#hazelmere');
  const infoButton = article.getByRole('button', { name: 'INFO' });
  const linksButton = article.getByRole('button', { name: 'LINKS' });
  const infoPanel = article.locator('[data-artist-panel="info"]');
  const linksPanel = article.locator('[data-artist-panel="links"]');

  await expect(infoButton).toHaveAttribute('aria-expanded', 'false');
  await expect(linksButton).toHaveAttribute('aria-expanded', 'false');
  await expect(infoPanel).toBeHidden();
  await expect(linksPanel).toBeHidden();

  await infoButton.click();
  await expect(infoButton).toHaveAttribute('aria-expanded', 'true');
  await expect(infoPanel).toBeVisible();
  await expect(linksPanel).toBeHidden();

  await linksButton.click();
  await expect(infoButton).toHaveAttribute('aria-expanded', 'false');
  await expect(linksButton).toHaveAttribute('aria-expanded', 'true');
  await expect(infoPanel).toBeHidden();
  await expect(linksPanel).toBeVisible();
});

test('mobile shell stays compact and collapses the footer', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This is the compact mobile shell contract.');
  await page.setViewportSize({ width: 440, height: 956 });
  for (const route of ['/', '/artists/', '/releases/', '/radio/', '/about/']) {
    await page.goto(siteUrl(route));
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      headerHeight: document.querySelector('header')?.getBoundingClientRect().height ?? 0,
    }));
    expect(
      dimensions.scrollWidth,
      `${route} should have no horizontal overflow`,
    ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    expect(
      dimensions.headerHeight,
      `${route} should use the thin mobile header`,
    ).toBeLessThanOrEqual(50);
    const footerDetails = page.locator('.site-footer__details');
    await expect(footerDetails).not.toHaveAttribute('open', '');
    await footerDetails.evaluate((element: HTMLDetailsElement) => {
      element.open = true;
    });
    await expect(footerDetails).toHaveAttribute('open', '');
  }
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
  await expect(page.locator('[data-gallery-position]')).toHaveText('02 / 11');
  await page.getByRole('button', { name: 'Show NEVERGUESSED' }).click();
  await expect(page.getByText('28 JULY 2026')).toBeVisible();
  await page.getByRole('button', { name: 'Show internet depression club!!! >__<' }).click();
  const internetDepressionClub = page.locator('#starstrike-internet-depression-club');
  await expect(internetDepressionClub.locator('a[href*="open.spotify.com"]')).toHaveCount(3);
  await expect(internetDepressionClub.locator('a[href*="soundcloud.com"]')).toHaveCount(1);
  await expect(page.locator('[data-release-id]')).toHaveCount(11);
  await page.goto(siteUrl('/store/'));
  await expect(page.locator('.page-heading')).toHaveCount(0);
  await expect(page.getByText('PRE-SAVE LINK INITIALISING')).toHaveCount(2);
});

test('release cards replace timestamped fallbacks with live Worker metrics', async ({ page }) => {
  await page.route('https://lifesteal-signal-api.jade-431.workers.dev/metrics', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        metrics: [
          {
            canonicalId: 'hazelmere-life-is-beautiful',
            platform: 'soundcloud',
            kind: 'plays',
            value: 4321,
            asOf: '2026-08-21T04:30:00.000Z',
          },
        ],
      }),
    });
  });
  await page.goto(siteUrl('/releases/'));
  const release = page.locator('[data-release-id="hazelmere-life-is-beautiful"]');
  await expect(release.locator('[data-metric-value]')).toHaveText('4,321');
  await expect(release.locator('[data-metric-date]')).toContainText('21/08/2026');
});

test('desktop routes keep the complete shell inside one viewport', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop viewport behavior is covered by the desktop browser projects.');
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
