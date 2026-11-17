import { NextResponse, type NextRequest } from "next/server";
import { isCaseStudyPath } from "@/lib/caseStudySlugs";

/**
 * A real 404 for case studies that do not exist. With Cache Components the /work/[slug] shell is
 * prerendered and streamed, so the page's notFound() arrives after a 200 has already been sent;
 * answering here, before rendering, gets the status right.
 */
export function proxy(request: NextRequest) {
  if (isCaseStudyPath(request.nextUrl.pathname)) return NextResponse.next();
  return NextResponse.rewrite(new URL("/404", request.url), { status: 404 });
}

export const config = {
  matcher: "/work/:path*",
};
