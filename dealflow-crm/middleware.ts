export { default } from "next-auth/middleware";

/**
 * Run auth middleware on UI routes only — not `/api/*` (route handlers use
 * getServerSession; cron uses Bearer CRON_SECRET). Listing `api/cron` alone
 * was unreliable on some hosts; excluding all `api` matches Next's pattern.
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)",
  ],
};
