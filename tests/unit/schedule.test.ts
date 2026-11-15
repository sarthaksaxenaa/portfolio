import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onFirstInteraction, startDeferred } from "@/lib/schedule";

function setPhone(phone: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: phone && q.includes("coarse"), media: q }));
  Object.defineProperty(window, "innerWidth", { configurable: true, value: phone ? 390 : 1440 });
}

beforeEach(() => {
  vi.stubGlobal("requestIdleCallback", (cb: () => void) => {
    cb();
    return 1;
  });
  Object.defineProperty(document, "readyState", { configurable: true, get: () => "complete" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("onFirstInteraction", () => {
  it("waits for the first touch or scroll, then fires once", () => {
    const cb = vi.fn();
    const stop = onFirstInteraction(cb);
    expect(cb).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("touchstart"));
    window.dispatchEvent(new Event("pointerdown"));
    expect(cb).toHaveBeenCalledTimes(1);
    stop();
  });

  it("never fires once cancelled", () => {
    const cb = vi.fn();
    onFirstInteraction(cb)();
    window.dispatchEvent(new Event("scroll"));
    expect(cb).not.toHaveBeenCalled();
  });
});

describe("startDeferred", () => {
  it("starts at idle on a desktop without any interaction", () => {
    setPhone(false);
    const cb = vi.fn();
    startDeferred(cb);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("waits for the first interaction on a phone", () => {
    setPhone(true);
    const cb = vi.fn();
    const stop = startDeferred(cb);
    expect(cb).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("touchstart"));
    expect(cb).toHaveBeenCalledTimes(1);
    stop();
  });

  it("starts at once on a phone when eager (deep links)", () => {
    setPhone(true);
    const cb = vi.fn();
    startDeferred(cb, { eager: true });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("drops a desktop start that was cancelled before idle", () => {
    setPhone(false);
    let pending: (() => void) | undefined;
    vi.stubGlobal("requestIdleCallback", (fn: () => void) => {
      pending = fn;
      return 1;
    });
    const cb = vi.fn();
    startDeferred(cb)();
    pending?.();
    expect(cb).not.toHaveBeenCalled();
  });
});
