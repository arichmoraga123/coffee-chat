import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

/**
 * API routes use `getServerSession` / route-level auth; cron uses `CRON_SECRET`.
 * Relying on `matcher` alone to skip `/api` was still hitting `/api/cron` on Vercel,
 * so we explicitly allow `/api/*` in `authorized`.
 */
export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const path = req.nextUrl.pathname;
        if (path.startsWith("/api/")) return true;
        if (path === "/login" || path === "/signup") return true;
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
