import { expect, test } from "@playwright/test";

for (const [path, title] of [
  ["/", "Lille bane. Stort Aalborg."],
  ["/kampe/", "Kampe & resultater"],
  ["/nyheder/", "Nyheder"],
  ["/stilling/", "Stillingen"],
  ["/spillere/", "Aalborgs spillere"],
]) {
  test(`${path} exports a shared shell and readable sports content`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("banner")).toHaveCount(1);
    const logo = page.getByRole("banner").locator("img");
    await expect(logo).toBeVisible();
    await expect(logo).toHaveJSProperty("naturalWidth", 320);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    await expect(
      page.getByRole("heading", { level: 1, name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Eksempelvisning med lokale testdata.", { exact: false }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    if (path === "/") {
      await page.screenshot({
        path: testInfo.outputPath("hero.png"),
        animations: "disabled",
      });
      await page.screenshot({
        path: testInfo.outputPath("page.png"),
        fullPage: true,
        animations: "disabled",
      });
    }
  });
}

test("primary and sports navigation expose the active section and close the mobile menu", async ({
  page,
}, testInfo) => {
  await page.goto("/nyheder/");
  const navigation = page.getByRole("navigation", { name: "Hovednavigation" });
  if (testInfo.project.name === "mobile") {
    await expect(navigation).toBeHidden();
    await page.getByRole("button", { name: "Åbn menu" }).click();
    await expect(navigation).toBeVisible();
  }
  await navigation.getByRole("link", { name: "På banen", exact: true }).click();
  await expect(page).toHaveURL(/\/kampe\/$/);
  if (testInfo.project.name === "mobile") await expect(navigation).toBeHidden();
  const sportsNavigation = page.getByRole("navigation", {
    name: "På banen",
    exact: true,
  });
  await sportsNavigation
    .getByRole("link", { name: "Stilling", exact: true })
    .click();
  await expect(page).toHaveURL(/\/stilling\/$/);
  await expect(
    page.getByRole("heading", { name: "Stillingen", exact: true }),
  ).toBeVisible();
  await expect(
    sportsNavigation.getByRole("link", { name: "Stilling", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Åbn menu" }).click();
  await expect(
    navigation.getByRole("link", { name: "På banen", exact: true }),
  ).toHaveAttribute("aria-current", "true");
});

test("skip link and mobile disclosure work with the keyboard", async ({
  page,
}, testInfo) => {
  await page.goto("/kampe/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Spring til indhold" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  if (testInfo.project.name === "mobile") {
    const toggle = page.getByRole("button", { name: /menu$/ });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Tab");
    await expect(
      page
        .getByRole("navigation", { name: "Hovednavigation" })
        .getByRole("link", { name: "På banen", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  }
});

test("homepage links to published news and the contact route", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Tæt på Aalborg.", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Læs historien", exact: false }).click();
  await expect(page).toHaveURL(/\/nyheder\/spillet-og-historien\/$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Spillet er kun halvdelen af historien",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Dette er en lokal, fiktiv artikel", { exact: false }),
  ).toBeVisible();
  await page.goto("/#kontakt");
  await expect(
    page.getByRole("heading", { name: "Vil du være en del af klubben?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "klub@example.com", exact: false }),
  ).toHaveAttribute("href", "mailto:klub@example.com");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("header centres the crest above the hero and opens a full mobile navigation", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  const crest = await header.locator("img").boundingBox();
  const hero = await page
    .getByRole("region", { name: "Lille bane. Stort Aalborg." })
    .boundingBox();
  expect(crest).not.toBeNull();
  expect(hero?.y).toBe(0);
  expect(
    Math.abs(crest!.x + crest!.width / 2 - page.viewportSize()!.width / 2),
  ).toBeLessThan(1);
  const navigation = page.getByRole("navigation", { name: "Hovednavigation" });
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Åbn menu" }).click();
    await expect(navigation).toBeVisible();
    const menu = await header.boundingBox();
    expect(menu!.height).toBeGreaterThanOrEqual(page.viewportSize()!.height);
    await page.screenshot({
      path: testInfo.outputPath("menu.png"),
      animations: "disabled",
    });
    await navigation
      .getByRole("link", { name: "Klubben", exact: true })
      .click();
    await expect(page).toHaveURL(/\/#klubben$/);
    await expect(navigation).toBeHidden();
    await expect(
      page.getByRole("heading", {
        name: "Et hold på banen. En klub omkring det.",
      }),
    ).toBeVisible();
  } else {
    const strip = await navigation.boundingBox();
    expect(strip!.x + strip!.width).toBeLessThan(crest!.x);
    for (const width of [768, 900]) {
      await page.setViewportSize({ width, height: 800 });
      const narrowStrip = await navigation.boundingBox();
      const narrowCrest = await header.locator("img").boundingBox();
      expect(narrowStrip!.x + narrowStrip!.width).toBeLessThan(narrowCrest!.x);
    }
  }
  await header
    .getByRole("link", { name: "Kontakt klubben", exact: true })
    .click();
  await expect(page).toHaveURL(/\/#kontakt$/);
  await expect(
    page.getByRole("heading", { name: "Vil du være en del af klubben?" }),
  ).toBeVisible();
});
