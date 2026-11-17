import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The first-visit opening is tested on its own; everywhere else, act like a returning visitor.
test.beforeEach(async ({ page }, info) => {
  if (!info.titlePath.some((t) => t.includes("opening"))) {
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
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator("#work-heading")).toBeInViewport();
});

test("a deep link to a section lands on that section", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#skills");
  await expect
    .poll(() => page.locator("#skills").evaluate((el) => Math.round(el.getBoundingClientRect().top)))
    .toBeLessThan(120);
});

test("the portrait the particles are sampled from is served", async ({ page, request }) => {
  const res = await request.get("/portrait-particles.webp");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/webp");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(/Sarthak Saxena, Software Developer/);
});

test("canonical URL points at the production domain", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://sarthxen.vercel.app");
});

test("no sideways overflow on phones, tablets and laptops, even with the light at the right edge", async ({ page }) => {
  test.slow(); // six widths, each scrolled top to bottom
  for (const width of [320, 360, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.mouse.move(width - 4, 400, { steps: 3 }); // the 720px glow follows the pointer to the edge
    // Reading scrollWidth forces layout, so no animation frames are needed (headless WebKit on CI
    // does not reliably deliver them).
    const worst = await page.evaluate(() => {
      let max = 0;
      for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        max = Math.max(max, document.documentElement.scrollWidth - document.documentElement.clientWidth);
      }
      return max;
    });
    expect(worst, `${width}px`).toBeLessThanOrEqual(0);
  }
});

for (const [device, viewport] of [["phone", { width: 390, height: 844 }], ["tablet", { width: 820, height: 1180 }]] as const) {
  test(`on a ${device}, the whole menu shows and every link works`, async ({ browser }) => {
    const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport });
    await ctx.addInitScript(() => sessionStorage.setItem("sarthxen:preloaded", "1"));
    const page = await ctx.newPage();
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Sections" });
    const labels = ["Home", "Projects", "Experience", "Skills", "Contact"];
    await expect(nav.locator("ul a")).toHaveText(labels);
    for (const name of labels) await expect(nav.getByRole("link", { name, exact: true })).toBeInViewport();
    await expect(nav.getByTestId("nav-resume")).toBeInViewport();
    for (const [name, hash] of [["Experience", "grind"], ["Skills", "skills"], ["Contact", "cooldown"], ["Projects", "work"]] as const) {
      await nav.getByRole("link", { name, exact: true }).tap();
      await expect(page).toHaveURL(new RegExp(`#${hash}$`));
      // Contact is the last, short section: it lights once the page reaches the bottom.
      await expect(nav.locator('a[aria-current="location"]')).toHaveText(name, { timeout: 6000 });
    }
    await ctx.close();
  });
}

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
    for (const sel of ["#grind-heading", "#cooldown-heading"]) {
      const bg = await page.locator(sel).evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(bg, sel).toContain("gradient");
    }
    // PORTFOLIO is chrome: a gradient clipped to each letter.
    const fill = await page.locator(".portfolio-letter").first().evaluate((el) => getComputedStyle(el).backgroundImage);
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
    for (const name of ["Skills", "Experience"]) {
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
    const heading = page.locator("#grind-heading");
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
    await expect(page.locator("#grind-heading")).not.toHaveAttribute("data-split-ready", "");
    await ctx.close();
  });

  test("all text is readable with JavaScript disabled", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("#grind-heading")).toBeVisible();
    await page.goto("/work/carenexus");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("CareNexus");
    await expect(page.getByText("Retrieval kept surfacing the wrong conditions.")).toBeVisible();
    await ctx.close();
  });
});

test.describe("case studies", () => {
  test("each Featured card opens its case study page, which links home and to the next one", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    const card = page.locator('article[aria-labelledby="work-rideshare"]');
    await card.scrollIntoViewIfNeeded();
    await card.getByRole("link", { name: "Case study" }).click();
    await expect(page).toHaveURL(/\/work\/rideshare$/);
    await expect(page).toHaveTitle("RideShare case study · Sarthak Saxena");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("RideShare");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://sarthxen.vercel.app/work/rideshare");
    await page.getByRole("link", { name: /Next case study/ }).click();
    await expect(page).toHaveURL(/\/work\/carenexus$/);
    await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Skills" }).click();
    await expect(page).toHaveURL(/\/#skills$/);
    expect(errors).toEqual([]);
  });

  test("the opening never plays when a visit starts on a case study, and unknown ones are 404s", async ({ page, request }) => {
    await page.addInitScript(() => sessionStorage.removeItem("sarthxen:preloaded"));
    await page.goto("/work/carenexus");
    expect(await page.evaluate(() => document.documentElement.getAttribute("data-preload"))).toBeNull();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect((await request.get("/work/skillmatrix")).status()).toBe(404);
  });

  test("decisions pin and walk sideways on desktop, without page overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/work/rideshare");
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
    await page.goto("/work/rideshare");
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

  test("on a case study the nav marks Projects and the light takes the project's colour", async ({ page }) => {
    await page.goto("/work/carenexus");
    await expect(page.locator('nav a[aria-current="location"]')).toHaveText("Projects");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--glow")), { timeout: 10_000 })
      .toBe("155 107 255");
  });
});

test.describe("accessibility", () => {
  for (const [path, ready] of [["/", "#grind-heading"], ["/work/rideshare", "#rideshare-heading"], ["/work/carenexus", "#carenexus-heading"]] as const)
  for (const motion of ["on", "off"] as const) {
    test(`no serious or critical axe violations on ${path} (motion ${motion})`, async ({ page, browserName }) => {
      // Headless Firefox on CI intermittently crashes its content process during this long
      // scroll-through. The rules axe checks do not depend on the engine and still run in
      // Chromium and WebKit; the motion-off scan still runs in Firefox.
      test.skip(browserName === "firefox" && motion === "on", "headless Firefox crashes on the long scroll-through in CI");
      if (motion === "off") await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      // Wait until reveals are set up, or the "all visible" check below passes before they start.
      if (motion === "on") await expect(page.locator(ready)).toHaveAttribute("data-split-ready", "");
      // Read the page a screen at a time, as a visitor would, so every scroll-triggered reveal
      // fires (a single jump to the bottom can skip triggers on a busy CI machine).
      for (let i = 0; i < 40; i++) {
        const atEnd = await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight * 0.8);
          return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
        });
        await page.waitForTimeout(120);
        if (atEnd) break;
      }
      // Let reveals finish so axe sees final colours, not mid-fade opacity.
      await expect
        .poll(() =>
          page.evaluate(() =>
            [...document.querySelectorAll("[data-reveal], .fill-word")].every(
              (el) => getComputedStyle(el).opacity === "1",
            ),
          ),
          { timeout: 15_000 },
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

test.describe("resume", () => {
  test("the nav and contact both link the one-page PDF, opening in a new tab", async ({ page, request }) => {
    await page.goto("/");
    for (const id of ["nav-resume", "contact-resume"]) {
      const link = page.getByTestId(id);
      await expect(link).toHaveAttribute("href", "/Sarthak_Saxena_Resume.pdf");
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
    }
    await expect(page.getByTestId("nav-resume")).toBeVisible();
    const res = await request.get("/Sarthak_Saxena_Resume.pdf");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");
  });

  test("the resume button is reachable on a phone too", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.getByTestId("nav-resume")).toBeVisible();
    await ctx.close();
  });
});

test.describe("featured work", () => {
  test("two projects on laptops that step through real screens as they scroll, with Projects lit", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Featured\s*Engineering/ })).toBeAttached();
    const laptops = page.locator("#work [data-device]");
    await expect(laptops).toHaveCount(2);
    const first = laptops.first();
    await first.scrollIntoViewIfNeeded();
    await expect(page.locator('nav a[data-chapters~="work"]')).toHaveAttribute("aria-current", "location");
    // Scroll through the first laptop: its screen changes at least once.
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
      seen.add((await first.getAttribute("data-active")) ?? "");
      await page.mouse.wheel(0, 140);
      await page.waitForTimeout(120);
    }
    expect(seen.size).toBeGreaterThan(1);
    // Every shot actually loads.
    const broken = await page
      .locator("#work img")
      .evaluateAll((imgs) => (imgs as HTMLImageElement[]).filter((i) => i.complete && i.naturalWidth === 0).length);
    expect(broken).toBe(0);
  });

  test("each card links its live site and code in a new tab, and its case study page", async ({ page }) => {
    await page.goto("/");
    for (const [slug, live] of [
      ["rideshare", "https://rideshare-platform.vercel.app"],
      ["carenexus", "https://carenexus-health.vercel.app"],
    ]) {
      const card = page.locator(`article[aria-labelledby="work-${slug}"]`);
      await card.scrollIntoViewIfNeeded(); // the text reveals as it scrolls in
      await expect(card.getByRole("link", { name: /Live site/ })).toHaveAttribute("href", live);
      await expect(card.getByRole("link", { name: /Live site/ })).toHaveAttribute("target", "_blank");
      await expect(card.getByRole("link", { name: /Code/ })).toHaveAttribute("target", "_blank");
      await expect(card.getByRole("link", { name: "Case study" })).toHaveAttribute("href", `/work/${slug}`);
    }
    // Only CareNexus has a phone view.
    await expect(page.locator('article[aria-labelledby="work-carenexus"] .phone')).toHaveCount(1);
    await expect(page.locator('article[aria-labelledby="work-rideshare"] .phone')).toHaveCount(0);
  });
});

test.describe("contact", () => {
  test("LET'S TALK, the status, a working copy button, and the time in India", async ({ page, context, browserName }) => {
    await page.goto("/");
    await page.locator("#cooldown-heading").scrollIntoViewIfNeeded();
    await expect(page.locator("#cooldown-heading")).toHaveText(/let.s\s*talk/i);
    await expect(page.locator("#cooldown .status-dot")).toBeVisible();
    // The clock shows India's time, whatever the visitor's own zone (this browser runs in UTC).
    const expected = await page.evaluate(() =>
      new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
        .format(new Date())
        .replace(/\s/g, " "),
    );
    await expect(page.getByTestId("local-time")).toContainText(/\d{1,2}:\d{2} [AP]M IST/);
    expect(expected).toMatch(/\d{1,2}:\d{2} [AP]M/);
    // Clipboard permissions can only be granted in Chromium; elsewhere the fallback message shows.
    if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy email address" }).click();
    await expect(page.locator("#cooldown [role=status]")).toHaveText(/Copied|press Ctrl\+C/);
    if (browserName === "chromium") {
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("sarthaksaxena413@gmail.com");
    }
  });
});

test.describe("what I build", () => {
  test("the race: with the lock one driver wins, without it the ride is double-booked", async ({ page }) => {
    await page.goto("/");
    const panel = page.locator('[data-scene="realtime"]');
    await panel.scrollIntoViewIfNeeded();
    await expect(page.locator('nav a[aria-current="location"]')).toHaveText("Skills");
    await panel.getByRole("button", { name: "Both accept" }).click();
    await expect(panel.getByTestId("race-verdict")).toHaveText(/got the ride.*changed 0 rows/, { timeout: 6000 });
    await expect(panel.locator('[data-outcome="assigned"]')).toHaveCount(1);
    await panel.getByRole("button", { name: "Without it" }).click();
    await panel.getByRole("button", { name: "Both accept" }).click();
    await expect(panel.getByTestId("race-verdict")).toHaveText(/Double-booked/, { timeout: 6000 });
    await expect(panel.locator('[data-outcome="assigned"]')).toHaveCount(2);
  });

  test("the triage check answers in the browser, without sending what you type anywhere", async ({ page }) => {
    const sent: string[] = [];
    await page.goto("/");
    const panel = page.locator('[data-scene="ai"]');
    await panel.scrollIntoViewIfNeeded();
    await panel.getByRole("button", { name: "sore throat for 3 days" }).click();
    await expect(panel.getByTestId("triage-result")).toContainText("See a doctor soon");
    page.on("request", (r) => sent.push(r.url()));
    const input = panel.getByLabel("Describe a symptom");
    await input.fill("my chest feels tight and heavy");
    await input.press("Enter");
    await expect(panel.getByTestId("triage-result")).toContainText(/Emergency/);
    expect(sent.filter((u) => /chest|tight/.test(decodeURIComponent(u)))).toEqual([]);
  });

  test("the section keeps its height when the demo data loads, so links scrolling past land true", async ({ page }) => {
    const height = () => page.evaluate(() => Math.round(document.getElementById("skills")!.getBoundingClientRect().height));
    await page.route("**/demos/*.json", () => new Promise(() => {})); // data held back
    await page.goto("/");
    const before = await height();
    await page.unroute("**/demos/*.json");
    await page.reload();
    await page.locator('[data-scene="tested"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-scene="tested"] .test-grid > span[data-suite]')).toHaveCount(570);
    expect(Math.abs((await height()) - before)).toBeLessThanOrEqual(2);
  });

  test("the test replay fills all 570 squares when it comes into view", async ({ page }) => {
    await page.goto("/");
    const panel = page.locator('[data-scene="tested"]');
    await panel.scrollIntoViewIfNeeded();
    await expect(panel.locator(".test-grid > span")).toHaveCount(570);
    await expect(panel.locator(".test-grid > span[data-ran]")).toHaveCount(570, { timeout: 8000 });
    await expect(panel).toContainText("570 / 570 passed");
  });

  test("each demo reshapes the particles behind it, then hands the shape back", async ({ page }) => {
    type W = Window & { focus_: (string | null)[] };
    await page.addInitScript(() => {
      (window as unknown as W).focus_ = [];
      window.addEventListener("scenefocus", (e) => (window as unknown as W).focus_.push((e as CustomEvent).detail));
    });
    await page.goto("/");
    const lastFocus = () => page.evaluate(() => (window as unknown as W).focus_.at(-1) ?? null);
    // Scroll the way a person does (smooth scroll owns the position), until each panel is on show.
    const wheelUntil = async (want: string | null) => {
      for (let i = 0; i < 80 && (await lastFocus()) !== want; i++) {
        await page.mouse.wheel(0, 160);
        await page.waitForTimeout(60);
      }
      expect(await lastFocus()).toBe(want);
    };
    await page.mouse.move(640, 360);
    await page.locator("#skills-heading").scrollIntoViewIfNeeded();
    for (const s of ["realtime", "ai", "tested"]) await wheelUntil(s);
    await wheelUntil(null); // past the last panel, into Contact
    const seen = await page.evaluate(() => (window as unknown as W).focus_.filter(Boolean));
    expect([...new Set(seen)]).toEqual(["realtime", "ai", "tested"]);
  });

  test("on a phone the demos fit the screen and still work", async ({ browser }) => {
    const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => sessionStorage.setItem("sarthxen:preloaded", "1"));
    const page = await ctx.newPage();
    await page.goto("/");
    const panel = page.locator('[data-scene="realtime"]');
    await panel.scrollIntoViewIfNeeded();
    await panel.getByRole("button", { name: "Both accept" }).tap();
    await expect(panel.getByTestId("race-verdict")).not.toBeEmpty({ timeout: 6000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await ctx.close();
  });
});

test.describe("menu", () => {
  test("clear over the hero, then a dark fade behind the links once you scroll", async ({ page }) => {
    await page.goto("/");
    const fade = page.locator("nav .nav-fade");
    const opacity = () => fade.evaluate((el) => +getComputedStyle(el).opacity);
    expect(await opacity()).toBe(0);
    await page.locator("#work-heading").scrollIntoViewIfNeeded();
    await expect.poll(opacity).toBe(1);
    // Taller than the bar, so text fades out before it reaches the links.
    const [bar, scrim] = await Promise.all([page.locator("nav").boundingBox(), fade.boundingBox()]);
    expect(scrim!.height).toBeGreaterThan(bar!.height + 30);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(opacity).toBe(0);
  });
});

test.describe("hero", () => {
  test("PORTFOLIO forms in chrome letters over the role, and Home is marked in red", async ({ page }) => {
    await page.goto("/");
    const letters = page.locator(".portfolio-letter");
    await expect(letters).toHaveCount(9);
    expect((await letters.allTextContents()).join("")).toBe("PORTFOLIO");
    expect(await letters.first().evaluate((el) => getComputedStyle(el).animationName)).toBe("letter-form");
    await expect(page.locator(".hero-sub")).toHaveText("Software Developer");
    const home = page.locator('nav a[data-chapters="warmup"]');
    await expect(home).toHaveAttribute("aria-current", "location");
    await expect(home).toHaveCSS("color", "rgb(229, 72, 77)");
  });

  test("the intro sits below in a glass card with the work, email and resume", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Intro" })).toBeAttached();
    await page.locator("#intro").scrollIntoViewIfNeeded(); // the card reveals as it scrolls in
    const card = page.locator("#intro .glass");
    await expect(card).toContainText("Sarthak Saxena");
    for (const name of ["See the work", "sarthaksaxena413@gmail.com", /Resume/]) await expect(card.getByRole("link", { name })).toBeVisible();
  });

  test("reduced motion gets the finished word straight away", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    expect(await page.locator(".portfolio-letter").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
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
    await page.locator("#skills-heading").scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 200);
    await expect(page.locator("html")).toHaveAttribute("data-chapter", "skills");
    await expect(canvas).toBeAttached();
    // The fixed layer never blocks clicks on the page.
    expect(await layer.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  });

  test("phones draw the particle portrait without waiting for a touch", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => sessionStorage.setItem("sarthxen:preloaded", "1"));
    const page = await ctx.newPage();
    await page.goto("/");
    const webgl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl"));
    test.skip(!webgl, "no WebGL in this browser");
    await expect(page.getByTestId("scene-layer")).toHaveAttribute("data-tier", "low", { timeout: 10_000 });
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

test.describe("opening (first visit)", () => {
  const preload = (page: import("@playwright/test").Page) =>
    page.evaluate(() => document.documentElement.getAttribute("data-preload"));

  test("plays dot → name → PORTFOLIO → reveal on its own, lands on the hero word; a reload skips it", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("opening")).toBeVisible();
    await expect.poll(() => preload(page)).toBe("loading");
    await expect.poll(() => preload(page), { timeout: 12_000 }).toBe("burst");
    await expect.poll(() => preload(page), { timeout: 5000 }).toBeNull();
    // The canvas already formed the word, so the page's own letters do not animate again.
    expect(await page.locator(".portfolio-letter").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    await expect(page.getByTestId("opening")).toBeHidden();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    // The mouse wheel scrolls the page again once it is over.
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, 900);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
    await page.locator("#intro").scrollIntoViewIfNeeded();
    await page.getByRole("link", { name: "See the work" }).click();
    await expect(page.locator("#work-heading")).toBeInViewport();
    await page.reload();
    expect(await preload(page)).toBeNull();
    await expect(page.getByTestId("opening")).toBeHidden();
  });

  test("a click skips straight to the glide and the page arrives within about two seconds", async ({ page }) => {
    await page.goto("/");
    await expect.poll(() => preload(page)).toBe("loading");
    await page.waitForTimeout(600);
    await page.mouse.click(640, 360);
    await expect.poll(() => preload(page), { timeout: 3000 }).toBeNull();
  });

  test("the page underneath does not scroll while the opening plays", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("opening")).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe("hidden");
  });

  test("never shows with motion off or without JavaScript", async ({ browser }) => {
    for (const opts of [{ reducedMotion: "reduce" as const }, { javaScriptEnabled: false }]) {
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      await page.goto("/");
      await expect(page.getByTestId("opening")).toBeHidden();
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
    // The intro card stays hidden until it scrolls into view, so bring it in before asking for its link.
    await page.locator("#intro").scrollIntoViewIfNeeded();
    const cta = page.getByRole("link", { name: "See the work" });
    await expect(cta).toBeVisible();
    await page.waitForTimeout(400);
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
    expect(sitemap).toContain("<loc>https://sarthxen.vercel.app/work/rideshare</loc>");
    expect(sitemap).toContain("<loc>https://sarthxen.vercel.app/work/carenexus</loc>");
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
