import { expect, test } from '@playwright/test';

for (const [path, title] of [['/', 'Kampe & resultater'], ['/kampe/', 'Kampe & resultater'], ['/stilling/', 'Stillingen'], ['/spillere/', 'Aalborgs spillere']]) {
  test(`${path} exports a shared shell and readable sports content`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
    await expect(page.getByText('Eksempelvisning med lokale testdata.', { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    if (path === "/") await page.screenshot({ path: testInfo.outputPath("page.png") });
  });
}

test('navigation marks the active route and closes the mobile disclosure', async ({ page }, testInfo) => {
  await page.goto('/kampe/');
  const navigation = page.getByRole('navigation', { name: 'Hovednavigation' });
  if (testInfo.project.name === 'mobile') {
    await expect(navigation).toBeHidden();
    await page.getByRole('button', { name: 'Åbn menu' }).click();
    await expect(navigation).toBeVisible();
  }
  await navigation.getByRole('link', { name: 'Stilling', exact: true }).click();
  await expect(page).toHaveURL(/\/stilling\/$/);
  await expect(page.getByRole('heading', { name: 'Stillingen', exact: true })).toBeVisible();
  if (testInfo.project.name === 'mobile') {
    await expect(navigation).toBeHidden();
    await page.getByRole('button', { name: 'Åbn menu' }).click();
  }
  await expect(navigation.getByRole('link', { name: 'Stilling', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('skip link and mobile disclosure work with the keyboard', async ({ page }, testInfo) => {
  await page.goto('/kampe/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Spring til indhold' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  if (testInfo.project.name === 'mobile') {
    const toggle = page.getByRole('button', { name: /menu$/ });
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('navigation', { name: 'Hovednavigation' }).getByRole('link', { name: 'Kampe', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  }
});
