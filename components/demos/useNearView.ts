"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * True once the element comes within `margin` of the viewport (and stays true). Demos use it to
 * fetch their data only when someone is about to reach them, and to autoplay once.
 */
export function useNearView(ref: RefObject<Element | null>, margin = "600px 0px", threshold = 0): boolean {
  // Without IntersectionObserver there is nothing to wait for.
  const [near, setNear] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: margin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, threshold, near]);
  return near;
}

/** Fetches a JSON file from /public once `enabled` turns true. */
export function useJson<T>(url: string, enabled: boolean): { data: T | null; error: boolean } {
  const [state, setState] = useState<{ data: T | null; error: boolean }>({ data: null, error: false });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<T>;
      })
      .then((data) => alive && setState({ data, error: false }))
      .catch(() => alive && setState({ data: null, error: true }));
    return () => {
      alive = false;
    };
  }, [url, enabled]);
  return state;
}
