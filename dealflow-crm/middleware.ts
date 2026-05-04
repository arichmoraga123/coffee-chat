export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/((?!api/auth|api/signup|api/cron|login|signup|_next/static|_next/image|favicon.ico).*)",
  ],
};
