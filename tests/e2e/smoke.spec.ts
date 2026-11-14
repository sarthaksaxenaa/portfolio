import { expect, test } from "@playwright/test";

test("home loads with the right title, heading and no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  await expect(page).toHaveTitle(/Sarthak Saxena/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Sarthak\s*Saxena/);
  expect(errors).toEqual([]);
});

test("nav links scroll to their chapters", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Chapters" }).getByRole("link", { name: /CareNexus|Set 2/ }).click();
  await expect(page).toHaveURL(/#carenexus$/);
  await expect(page.locator("#carenexus")).toBeInViewport();
});

test("portrait image loads", async ({ page }) => {
  await page.goto("/");
  const img = page.getByRole("img", { name: /portrait of Sarthak Saxena/ });
  await expect(img).toBeVisible();
  expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
});

test("canonical URL points at the production domain", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://sarthxen.vercel.app");
});

test("no horizontal overflow on a 360px phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("unknown routes return 404", async ({ page }) => {
  const res = await page.goto("/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
});
