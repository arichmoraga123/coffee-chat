import "server-only";
import {
  PHASE_ANALYZE,
  PHASE_EXPORT,
  PHASE_INFO,
  PHASE_PRODUCTION_BUILD,
  PHASE_TEST,
} from "next/constants";
import { z } from "zod";

/** Treat empty string as unset (common in .env files). */
function optString(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

function truthy(v: unknown): boolean {
  const s = optString(v);
  return s === "1" || s === "true" || s === "yes";
}

const postgresUrl = z
  .string()
  .min(1)
  .refine(
    (s) =>
      /^postgres(ql)?:\/\//i.test(s) ||
      /^prisma(\+postgres)?:\/\//i.test(s) ||
      /^neon(\+postgres)?:\/\//i.test(s),
    "DATABASE_URL must be a Postgres-style connection string (postgresql://…, prisma+postgres://…, etc.)",
  );

/** NextAuth accepts localhost, IPs, custom ports — avoid z.string().url() quirks across Zod versions. */
const nextAuthOrigin = z
  .string()
  .min(1)
  .refine((s) => {
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "NEXTAUTH_URL must be a valid http(s) URL (e.g. http://localhost:3000)");

/** True when the CLI is `next build` (including `npx next build` / `next.cmd` on Windows). */
function argvHasNextBuild(): boolean {
  const a = process.argv.map((x) => x.toLowerCase());
  for (let i = 1; i < a.length; i++) {
    if (a[i] !== "build") continue;
    const prev = a[i - 1];
    if (prev === "next" || prev.endsWith("/next") || prev.endsWith("\\next") || prev.endsWith("next.cmd")) {
      return true;
    }
  }
  return false;
}

/**
 * Skip strict NextAuth env checks during `next build` / prerender / analyze.
 * - Next sets `NEXT_PRIVATE_BUILD_WORKER=1` on Webpack + Turbopack compile workers (often without NEXT_PHASE).
 * - `NEXT_PHASE` uses stable strings from `next/constants` for non-runtime phases.
 */
function isBuildTimeForAuthValidation(): boolean {
  if (truthy(process.env.NEXT_PRIVATE_BUILD_WORKER)) {
    return true;
  }
  const phase = process.env.NEXT_PHASE;
  if (
    phase === PHASE_PRODUCTION_BUILD ||
    phase === PHASE_EXPORT ||
    phase === PHASE_ANALYZE ||
    phase === PHASE_INFO ||
    phase === PHASE_TEST
  ) {
    return true;
  }
  if (typeof phase === "string" && (phase.includes("compile") || phase.includes("prerender"))) {
    return true;
  }
  if (argvHasNextBuild()) {
    return true;
  }
  return false;
}

const schema = z.object({
  DATABASE_URL: z.preprocess(optString, postgresUrl),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  NEXTAUTH_URL: z.preprocess(optString, z.union([nextAuthOrigin, z.undefined()])),
  NEXTAUTH_SECRET: z.preprocess(optString, z.string().min(1).optional()),
  AUTH_SECRET: z.preprocess(optString, z.string().min(1).optional()),
  NEWS_API_KEY: z.preprocess(optString, z.string().min(1).optional()),
  CRON_SECRET: z.preprocess(optString, z.string().min(1).optional()),
});

function load() {
  if (truthy(process.env.SKIP_ENV_VALIDATION)) {
    const raw = process.env;
    const databaseUrlRaw = optString(raw.DATABASE_URL) ?? "";
    const pg = postgresUrl.safeParse(databaseUrlRaw);
    if (!pg.success) {
      throw new Error(
        `SKIP_ENV_VALIDATION is set but DATABASE_URL is invalid: ${pg.error.issues.map((i) => i.message).join("; ")}`,
      );
    }
    const nodeEnv = (optString(raw.NODE_ENV) as "development" | "production" | "test" | undefined) ?? "development";
    const isProduction = nodeEnv === "production";
    const nextAuthSecret = optString(raw.NEXTAUTH_SECRET) ?? optString(raw.AUTH_SECRET);
    const vercel = optString(raw.VERCEL_URL);
    const nextAuthUrl =
      optString(raw.NEXTAUTH_URL) ??
      (vercel
        ? vercel.startsWith("http://") || vercel.startsWith("https://")
          ? vercel
          : `https://${vercel}`
        : undefined);
    return {
      databaseUrl: databaseUrlRaw,
      nodeEnv,
      isProduction,
      isDevelopment: !isProduction,
      nextAuthUrl,
      nextAuthSecret,
      newsApiKey: optString(raw.NEWS_API_KEY),
      cronSecret: optString(raw.CRON_SECRET),
      skipValidation: true as const,
    };
  }

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".") || "env"}: ${i.message}`).join("; ");
    throw new Error(`Environment validation failed: ${detail}`);
  }

  const data = parsed.data;
  const nodeEnv = data.NODE_ENV ?? "development";
  const isProduction = nodeEnv === "production";
  const nextAuthSecret = data.NEXTAUTH_SECRET ?? data.AUTH_SECRET;

  const vercel = optString(process.env.VERCEL_URL);
  const nextAuthUrl =
    data.NEXTAUTH_URL ??
    (vercel ? (vercel.startsWith("http://") || vercel.startsWith("https://") ? vercel : `https://${vercel}`) : undefined);

  const deferProdAuthChecks = isBuildTimeForAuthValidation();
  const enforceProdAuth = isProduction && !deferProdAuthChecks;

  if (enforceProdAuth) {
    if (!nextAuthSecret) {
      throw new Error("Set NEXTAUTH_SECRET or AUTH_SECRET in production.");
    }
    if (!nextAuthUrl) {
      throw new Error(
        "Set NEXTAUTH_URL in production (e.g. https://your-app.vercel.app), or rely on VERCEL_URL on Vercel.",
      );
    }
  }

  const onVercelProd = truthy(process.env.VERCEL) && process.env.VERCEL_ENV === "production";
  if (onVercelProd && enforceProdAuth) {
    if (!data.CRON_SECRET) {
      console.warn(
        "[env] CRON_SECRET is unset — /api/cron/* will return 503. Set CRON_SECRET in Vercel and match the cron Authorization header.",
      );
    }
    if (!data.NEWS_API_KEY) {
      console.warn("[env] NEWS_API_KEY is unset — news refresh and /api/news will have no upstream data.");
    }
  }

  return {
    databaseUrl: data.DATABASE_URL,
    nodeEnv,
    isProduction,
    isDevelopment: !isProduction,
    nextAuthUrl,
    nextAuthSecret,
    newsApiKey: data.NEWS_API_KEY,
    cronSecret: data.CRON_SECRET,
    skipValidation: false as const,
  };
}

export const env = load();

export type AppEnv = typeof env;
