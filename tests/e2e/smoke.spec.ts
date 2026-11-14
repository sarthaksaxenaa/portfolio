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

test("every stylesheet and script on the page loads", async ({ page }) => {
  const failed: string[] = [];
  page.on("response", (r) => {
    if (/\.(css|js|woff2|webp)(\?|$)/.test(r.url()) && r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });
  await page.goto("/", { waitUntil: "networkidle" });
  expect(failed).toEqual([]);
  // Tailwind applied: the page background is the token, not the browser default.
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe("rgb(5, 5, 6)");
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

test.describe("cursor light", () => {
  test("follows a mouse and lights the page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-cursor", "on");
    await page.mouse.move(400, 300);
    await page.mouse.move(420, 320, { steps: 4 });
    await expect(page.locator("html")).toHaveAttribute("data-cursor-visible", "true");
    await expect
      .poll(async () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--mx"))))
      .toBeCloseTo(420, 0);
  });

  test("is absent with reduced motion", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.getByTestId("cursor-light")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-cursor", "on");
    await ctx.close();
  });

  test("is absent on a touch phone", async ({ browser }) => {
    const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.getByTestId("cursor-light")).toHaveCount(0);
    await ctx.close();
  });
});

test.describe("motion", () => {
  test("smooth scroll is on by default and headings reveal when scrolled to", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
    await expect(page.locator("html")).toHaveClass(/lenis/);
    const heading = page.locator("#overload-heading");
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toHaveAttribute("data-split-ready", "");
    await expect(heading).toBeVisible();
  });

  test("MOTION OFF persists across reloads and disables smooth scroll and the cursor light", async ({ page }) => {
    await page.goto("/");
    const sw = page.getByRole("switch", { name: "Motion" });
    await sw.click();
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
    await expect(page.getByTestId("cursor-light")).toHaveCount(0);
    await expect(page.locator("#overload-heading")).not.toHaveAttribute("data-split-ready", "");
  });

  test("reduced-motion visitors start with motion off", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    await expect(page.getByRole("switch", { name: "Motion" })).toHaveAttribute("aria-checked", "false");
    await ctx.close();
  });

  test("all text is readable with JavaScript disabled", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("#carenexus-heading")).toBeVisible();
    await ctx.close();
  });
});
