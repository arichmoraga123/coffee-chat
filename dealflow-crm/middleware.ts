export { default } from "next-auth/middleware";

/**
 * Never run NextAuth middleware on `/api/*`: handlers use getServerSession / cron uses
 * `Authorization: Bearer` + CRON_SECRET. If this matcher matched `/api`, unauthenticated
 * requests would 307 to sign-in before the route runs.
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)",
  ],
};
