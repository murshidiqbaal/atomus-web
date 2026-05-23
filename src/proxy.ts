import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16 renamed Middleware to Proxy. This file runs on the edge before
// the request reaches a route. We use it as a coarse-grained gate that
// redirects unauthenticated requests for protected pages to /login.
//
// Note: the project uses Supabase's default client-side session (localStorage),
// so server-side role enforcement happens in ClientLayout. The proxy here only
// checks for the presence of a Supabase auth cookie — fine-grained per-role
// routing is the client's job. If you later migrate to @supabase/ssr (cookie
// sessions), this proxy can be expanded to do full server-side role gating.

const PUBLIC_PREFIXES = ["/login", "/api", "/_next", "/favicon", "/img", "/css", "/js"];

const PUBLIC_FILES = new Set([
  "/",
  "/index.html",
  "/about.html",
  "/contact.html",
  "/courses.html",
  "/courses-old.html",
  "/downloads.html",
  "/gallery.html",
  "/services.html",
  "/default.php",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_FILES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function hasSupabaseSession(req: NextRequest): boolean {
  // Supabase JS sets cookies named `sb-<project-ref>-auth-token` (and `.0`/`.1`
  // chunked variants). Detect any of them as a hint that a session may exist.
  return req.cookies.getAll().some((c) => /^sb-.*-auth-token(?:\.\d+)?$/.test(c.name));
}

export function proxy(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets and Next.js internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
