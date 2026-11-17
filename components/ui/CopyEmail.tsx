"use client";

import { useEffect, useRef, useState } from "react";

type State = "idle" | "copied" | "manual";

/** Copies the address, and says what happened. Browsers can refuse the clipboard (permissions,
 *  insecure contexts, some in-app browsers), so that case tells you how to copy it yourself. */
export function CopyEmail({ email, selectId }: { email: string; selectId?: string }) {
  const [state, setState] = useState<State>("idle");
  const reset = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(reset.current), []);

  const copy = async () => {
    clearTimeout(reset.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(email);
      setState("copied");
    } catch {
      // Select the address on the page, so one Ctrl+C (or a long-press) copies it.
      const node = selectId ? document.getElementById(selectId) : null;
      const selection = window.getSelection();
      if (node && selection) {
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      setState("manual");
    }
    reset.current = setTimeout(() => setState("idle"), 4000);
  };

  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        onClick={copy}
        aria-label="Copy email address"
        data-magnetic
        className="rounded-full border border-hairline px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-text transition-colors hover:border-text"
      >
        {state === "copied" ? "Copied ✓" : "Copy"}
      </button>
      <span role="status" className="font-mono text-xs text-muted">
        {state === "copied" ? "Copied to your clipboard" : state === "manual" ? "Your browser blocked it: the address is selected, press Ctrl+C" : ""}
      </span>
    </span>
  );
}
