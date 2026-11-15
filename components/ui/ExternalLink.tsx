import type { AnchorHTMLAttributes } from "react";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "target" | "rel"> & { href: string };

/**
 * Every link that leaves the site opens in a new tab, so the portfolio stays open behind it.
 * rel="noopener noreferrer" stops the new page from reaching back through window.opener
 * (reverse tabnabbing) and keeps the referrer private. Screen-reader users are told up front.
 */
export function ExternalLink({ children, ...props }: Props) {
  return (
    <a {...props} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
