import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The first-visit preloader is tested on its own; everywhere else, act like a returning visitor.
test.beforeEach(async ({ page }, info) => {
  if (!info.titlePath.some((t) => t.includes("preloader"))) {
    await page.addInitScript(() => sessionStorage.setItem("sarthxen:preloaded", "1"));
  }
});

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
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Projects" }).click();
  await expect(page).toHaveURL(/#rideshare$/);
  await expect(page.locator("#rideshare")).toBeInViewport();
});

test("a deep link to a section below the pinned track lands on that section", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#carenexus");
  await expect(page.locator("#rideshare [data-pin]")).toHaveClass(/is-pinned/);
  await expect
    .poll(() => page.locator("#carenexus").evaluate((el) => Math.round(el.getBoundingClientRect().top)))
    .toBeLessThan(120);
  await expect(page.locator("#carenexus-heading")).toBeInViewport();
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

test("unknown routes return a styled 404 with a way back", async ({ page }) => {
  const res = await page.goto("/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Missed the rep.");
  await page.getByRole("link", { name: "Back to the portfolio" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test.describe("cursor light", () => {
  test("headings are visible before the mouse has ever moved", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-cursor", "on");
    // light-text paints glyphs with a gradient; if the gradient is invalid the text is transparent.
    for (const sel of ["#grind-heading", "#cooldown a.light-text"]) {
      const bg = await page.locator(sel).evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(bg, sel).toContain("gradient");
    }
    // The name paints its fill as a gradient clipped to the text.
    const fill = await page.locator(".hero-name-line").first().evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(fill).toContain("gradient");
  });

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

  test("the ring stays on the pointer while hovering links (regression: scale multiplied its position)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    const ringCentre = () =>
      page.evaluate(() => {
        const r = document.querySelector(".cursor-ring")!.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
    for (const name of ["Focus", "Experience"]) {
      const box = (await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name }).boundingBox())!;
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y, { steps: 12 });
      await expect(page.locator("html")).toHaveAttribute("data-cursor-hover", "");
      await expect.poll(async () => Math.hypot((await ringCentre()).x - x, (await ringCentre()).y - y)).toBeLessThan(3);
    }
  });

  test("is absent with reduced motion", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.getByTestId("cursor-light")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-cursor", "on");
    await ctx.close();
  });

  test("on a touch phone: the light follows a tap, ripples, and glides along while scrolling", async ({ browser }) => {
    const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => sessionStorage.setItem("sarthxen:preloaded", "1"));
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.getByTestId("cursor-light")).toHaveAttribute("data-mode", "touch");
    await expect(page.locator(".cursor-ring")).toHaveCount(0);
    await page.touchscreen.tap(100, 600);
    await expect(page.locator(".cursor-ripple")).toHaveClass(/is-rippling/);
    await expect
      .poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--mx"))))
      .toBeCloseTo(100, 0);
    await page.evaluate(() => window.scrollBy(0, 600));
    await expect
      .poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--mx"))))
      .toBeCloseTo(195, 0);
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

  test("there is no on-page motion switch", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("switch")).toHaveCount(0);
    await expect(page.getByText(/motion (on|off)/i)).toHaveCount(0);
  });

  test("reduced-motion visitors get no smooth scroll, reveals or cursor light", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
    await expect(page.getByTestId("cursor-light")).toHaveCount(0);
    await expect(page.locator("#overload-heading")).not.toHaveAttribute("data-split-ready", "");
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

test.describe("case studies", () => {
  test("decisions pin and walk sideways on desktop, without page overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const block = page.locator("#rideshare [data-pin]");
    await expect(block).toHaveClass(/is-pinned/);
    const track = block.locator("[data-pin-track]");
    const x = () => track.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    await block.scrollIntoViewIfNeeded();
    const before = await x();
    await page.mouse.wheel(0, 500);
    await expect.poll(x).toBeLessThan(before - 50);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    // While pinned, nothing that comes after the block may slide up underneath it.
    const facts = page.locator("#rideshare ul").last();
    const [blockBox, factsBox] = [await block.boundingBox(), await facts.boundingBox()];
    expect(factsBox!.y).toBeGreaterThanOrEqual(blockBox!.y + blockBox!.height - 1);
  });

  test("on a phone the decisions walk sideways too, one card per screen, without page overflow", async ({ browser }) => {
    const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => sessionStorage.setItem("sarthxen:preloaded", "1"));
    const page = await ctx.newPage();
    await page.goto("/");
    const block = page.locator("#rideshare [data-pin]");
    // Phones build the pins after the first touch or scroll, never during first paint.
    await page.waitForTimeout(1500);
    await expect(block).not.toHaveClass(/is-pinned/);
    await page.evaluate(() => window.scrollBy(0, 200));
    await expect(block).toHaveClass(/is-pinned/);
    const card = block.locator("[data-pin-track] > li").first();
    expect((await card.boundingBox())!.width).toBeCloseTo(390 * 0.82, -1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await ctx.close();
  });

  test("the nav marks the chapter you are reading and the light takes its colour", async ({ page }) => {
    await page.goto("/");
    await page.locator("#carenexus-heading").scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 200);
    await expect(page.locator('nav a[aria-current="location"]')).toHaveText("Projects");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--glow")))
      .toBe("155 107 255");
  });
});

test.describe("accessibility", () => {
  for (const motion of ["on", "off"] as const) {
    test(`no serious or critical axe violations (motion ${motion})`, async ({ page }) => {
      if (motion === "off") await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      // Wait until reveals are set up, or the "all visible" check below passes before they start.
      if (motion === "on") await expect(page.locator("#grind-heading")).toHaveAttribute("data-split-ready", "");
      // Let reveals finish so axe sees final colours, not mid-fade opacity.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect
        .poll(() =>
          page.evaluate(() =>
            [...document.querySelectorAll("[data-reveal], .fill-word")].every(
              (el) => getComputedStyle(el).opacity === "1",
            ),
          ),
        )
        .toBe(true);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target}`)).toEqual([]);
    });
  }

  test("keyboard: skip link is first and moves focus to main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
  });
});

test.describe("hero name", () => {
  const progress = (page: import("@playwright/test").Page) =>
    page.locator("#warmup-title").evaluate((el) => Number(getComputedStyle(el).getPropertyValue("--name-p")));

  test("loads 00 → 100 like the intro, then the counter fades and the name stays solid", async ({ page }) => {
    await page.goto("/");
    const count = page.getByTestId("name-count");
    await expect.poll(() => progress(page)).toBeGreaterThan(5);
    const mid = await progress(page);
    expect(mid).toBeLessThan(100);
    expect(await count.evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.5);
    await expect.poll(() => progress(page), { timeout: 5000 }).toBe(100);
    await expect.poll(() => count.evaluate((el) => getComputedStyle(el).opacity), { timeout: 3000 }).toBe("0");
    // Fully loaded: the outline layer is masked away across the whole word.
    const mask = await page
      .locator('.hero-name-line[data-line="1"]')
      .evaluate((el) => getComputedStyle(el, "::before").maskImage || getComputedStyle(el, "::before").webkitMaskImage);
    expect(mask).toMatch(/100%/);
  });

  test("no torch: moving the mouse over the name changes nothing", async ({ page }) => {
    await page.goto("/");
    await expect.poll(() => progress(page), { timeout: 5000 }).toBe(100);
    const line = page.locator('.hero-name-line[data-line="0"]');
    const before = await line.evaluate((el) => getComputedStyle(el).backgroundImage);
    const box = (await line.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
    await page.waitForTimeout(300);
    expect(await line.evaluate((el) => getComputedStyle(el).backgroundImage)).toBe(before);
  });

  test("reduced motion gets the solid name straight away, without a counter", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    expect(await progress(page)).toBe(100);
    expect(await page.getByTestId("name-count").evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
    await ctx.close();
  });
});

test.describe("particle hero", () => {
  test("loads after the page and stays behind every chapter as it morphs", async ({ page }) => {
    await page.goto("/");
    // Text first: the heading is in the HTML before any 3D code downloads.
    await expect(page.getByRole("heading", { level: 1 })).toBeAttached();
    const webgl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl"));
    const layer = page.getByTestId("scene-layer");
    if (!webgl) {
      await expect(layer).toHaveCount(0);
      return;
    }
    await expect(layer).toBeAttached({ timeout: 10_000 });
    const canvas = page.getByTestId("particle-canvas");
    await expect(canvas).toHaveAttribute("data-frameloop", "always");
    await page.locator("#carenexus-heading").scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 200);
    await expect(page.locator("html")).toHaveAttribute("data-chapter", "carenexus");
    await expect(canvas).toBeAttached();
    // The fixed layer never blocks clicks on the page.
    expect(await layer.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  });

  test("phones load the 3D scene after the first scroll, never before", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => sessionStorage.setItem("sarthxen:preloaded", "1"));
    const page = await ctx.newPage();
    const three: string[] = [];
    page.on("response", async (r) => {
      if (r.url().endsWith(".js") && (await r.text().catch(() => "")).includes("WebGLRenderer")) three.push(r.url());
    });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2500); // past load + idle: a desktop would have started by now
    expect(three).toEqual([]);
    await page.evaluate(() => window.scrollBy(0, 400));
    const webgl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl"));
    test.skip(!webgl, "no WebGL in this browser");
    await expect(page.getByTestId("scene-layer")).toHaveAttribute("data-tier", "low", { timeout: 10_000 });
    await expect.poll(() => three.length).toBeGreaterThan(0);
    await ctx.close();
  });

  test("draws a single still frame for reduced-motion visitors", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const webgl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl"));
    test.skip(!webgl, "no WebGL in this browser");
    await expect(page.getByTestId("particle-canvas")).toHaveAttribute("data-frameloop", "demand", { timeout: 10_000 });
  });

  test("three.js is not in the first JavaScript the page loads", async ({ page }) => {
    const early: string[] = [];
    page.on("response", async (r) => {
      if (r.url().endsWith(".js")) early.push(await r.text().catch(() => ""));
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const firstBatch = early.join("\n");
    expect(firstBatch).not.toContain("WebGLRenderer");
  });
});

test.describe("preloader", () => {
  test("plays on the first visit, gets out of the way, and is skipped on reload", async ({ page }) => {
    await page.goto("/");
    const pre = page.getByTestId("preloader");
    await expect(pre).toBeVisible();
    await expect(page.locator("html")).not.toHaveAttribute("data-preload", /.+/, { timeout: 5000 });
    await expect(pre).toBeHidden();
    // The page underneath is usable as soon as it lifts.
    await page.getByRole("link", { name: "See the work" }).click();
    await page.reload();
    await expect(page.locator("html")).not.toHaveAttribute("data-preload", /.+/);
    await expect(pre).toBeHidden();
  });

  test("never shows with motion off or without JavaScript", async ({ browser }) => {
    for (const opts of [{ reducedMotion: "reduce" as const }, { javaScriptEnabled: false }]) {
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      await page.goto("/");
      await expect(page.getByTestId("preloader")).toBeHidden();
      await ctx.close();
    }
  });
});

test.describe("manifesto and magnetic buttons", () => {
  test("the grind intro fills word by word as you scroll", async ({ page }) => {
    await page.goto("/");
    const p = page.locator("#grind [data-fill]");
    await expect(p.locator(".fill-word").first()).toBeAttached();
    const firstOpacity = () => p.locator(".fill-word").first().evaluate((el) => +getComputedStyle(el).opacity);
    expect(await firstOpacity()).toBeLessThanOrEqual(0.55); // dimmed, but still WCAG-readable
    await p.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 600);
    await expect.poll(firstOpacity).toBeGreaterThan(0.8);
  });

  test("CTA leans toward a nearby mouse and springs back", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: "See the work" });
    const box = (await cta.boundingBox())!;
    const tx = () => cta.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    await page.mouse.move(box.x + box.width + 20, box.y + box.height / 2, { steps: 5 });
    await expect.poll(tx).toBeGreaterThan(5);
    await page.mouse.move(10, 10, { steps: 5 });
    await expect.poll(tx).toBeLessThan(1);
  });
});

test.describe("sharing and search", () => {
  test("Open Graph image, sitemap and robots are served", async ({ request, page }) => {
    const og = await request.get("/opengraph-image");
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"]).toContain("image/png");
    expect((await og.body()).length).toBeGreaterThan(10_000);

    await page.goto("/");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https:\/\/sarthxen\.vercel\.app\/opengraph-image/);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("<loc>https://sarthxen.vercel.app</loc>");
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(ld["@graph"].map((n: { "@type": string }) => n["@type"])).toEqual(
      expect.arrayContaining(["Person", "WebSite", "ProfilePage", "SoftwareApplication"]),
    );
    expect((await request.get("/apple-icon")).headers()["content-type"]).toContain("image/png");
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.short_name).toBe("sarthxen");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap: https://sarthxen.vercel.app/sitemap.xml");
  });
});
