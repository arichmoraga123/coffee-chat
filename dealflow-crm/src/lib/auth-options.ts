import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const msId = process.env.MICROSOFT_CLIENT_ID?.trim();
const msSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim();
const msTenant = process.env.MICROSOFT_TENANT_ID?.trim() || "common";

function profileEmail(profile: unknown): string {
  if (!profile || typeof profile !== "object") return "";
  const p = profile as { email?: string; preferred_username?: string };
  return String(p.email ?? p.preferred_username ?? "").trim();
}

export const authOptions: NextAuthOptions = {
  secret: env.nextAuthSecret,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        if (!user.accountActive) return null;

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    ...(msId && msSecret
      ? [
          AzureADProvider({
            clientId: msId,
            clientSecret: msSecret,
            tenantId: msTenant,
            authorization: {
              params: {
                scope: "openid profile email offline_access Calendars.ReadWrite",
              },
            },
          }),
        ]
      : []),
    ...(googleId && googleSecret
      ? [
          GoogleProvider({
            clientId: googleId,
            clientSecret: googleSecret,
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
                scope:
                  "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar",
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google" || account?.provider === "azure-ad") {
        const email = profileEmail(profile);
        if (!email) return false;
        const exists = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (!exists) {
          return account?.provider === "google"
            ? "/login?error=GoogleRequiresRegisteredEmail"
            : "/login?error=MicrosoftRequiresRegisteredEmail";
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile, trigger }) {
      if (account?.provider === "google") {
        const email = profileEmail(profile);
        if (!email) return token;
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, role: true },
        });
        if (!dbUser) return token;
        token.sub = dbUser.id;
        token.role = dbUser.role;

        if (account.access_token) {
          const expSec = (account as { expires_in?: number }).expires_in ?? 3600;
          const expiresAt = new Date(Date.now() + expSec * 1000);
          const rt = (account as { refresh_token?: string }).refresh_token ?? "";
          await prisma.calendarIntegration.upsert({
            where: {
              userId_provider: { userId: dbUser.id, provider: "google" },
            },
            create: {
              userId: dbUser.id,
              provider: "google",
              accessToken: account.access_token,
              refreshToken: rt,
              expiresAt,
              calendarId: "primary",
              syncEnabled: true,
              lastSynced: new Date(),
            },
            update: {
              accessToken: account.access_token,
              ...(rt ? { refreshToken: rt } : {}),
              expiresAt,
              lastSynced: new Date(),
            },
          });
        }
        return token;
      }

      if (account?.provider === "azure-ad") {
        const email = profileEmail(profile);
        if (!email) return token;
        const dbUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, role: true },
        });
        if (!dbUser) return token;
        token.sub = dbUser.id;
        token.role = dbUser.role;

        if (account.access_token) {
          const acc = account as {
            expires_at?: number;
            refresh_token?: string;
          };
          const expiresAt =
            acc.expires_at != null
              ? new Date(acc.expires_at * 1000)
              : new Date(Date.now() + 3600_000);
          const rt = acc.refresh_token ?? "";
          await prisma.calendarIntegration.upsert({
            where: {
              userId_provider: { userId: dbUser.id, provider: "outlook" },
            },
            create: {
              userId: dbUser.id,
              provider: "outlook",
              accessToken: account.access_token,
              refreshToken: rt,
              expiresAt,
              calendarId: null,
              syncEnabled: true,
              lastSynced: new Date(),
            },
            update: {
              accessToken: account.access_token,
              ...(rt ? { refreshToken: rt } : {}),
              expiresAt,
              lastSynced: new Date(),
            },
          });
        }
        return token;
      }

      if (user?.id) {
        token.sub = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }
      if (trigger === "update" && token.sub) {
        const u = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true },
        });
        if (u) token.role = u.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as string) ?? "USER";
      }
      return session;
    },
  },
};
