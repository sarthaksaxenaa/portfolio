"use client";

import { useMotion } from "./MotionProvider";

export function MotionToggle() {
  const { enabled, toggle } = useMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Motion"
      onClick={toggle}
      className="font-mono text-xs uppercase tracking-[0.08em] text-muted transition-colors hover:text-text"
    >
      Motion <span aria-hidden="true">{enabled ? "on" : "off"}</span>
    </button>
  );
}
