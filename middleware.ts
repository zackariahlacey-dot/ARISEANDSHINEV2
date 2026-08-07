import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Paths that continue to function while the customer-facing site is
 * shut down. Everything else is rewritten to /closed so visitors see
 * the "We no longer offer our services" notice.
 */
const ALLOWED_PREFIXES = ["/admin", "/protected", "/auth", "/api", "/closed", "/dashboard"];

function isAllowed(pathname: string): boolean {
  if (pathname === "/closed") return true;
  return ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isAllowed(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/closed";
    url.search = "";
    return NextResponse.rewrite(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
