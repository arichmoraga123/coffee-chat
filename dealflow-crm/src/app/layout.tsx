import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { AuthSessionProvider } from "@/components/session-provider";
import { CareerTrackProvider } from "@/components/career-track-provider";
import { PwaRegister } from "@/components/pwa-register";
import { AppToaster } from "@/components/theme/app-toaster";
import { THEME_INIT_SCRIPT } from "@/components/theme/theme";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Prospect",
  description: "Recruiting prep, pipeline, and the PE@Broad club",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1214" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Prospect" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="flex min-h-full flex-col bg-bg text-ink">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <PwaRegister />
        <AppToaster />
        <AuthSessionProvider>
          <CareerTrackProvider>
            <AppShell>{children}</AppShell>
          </CareerTrackProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
