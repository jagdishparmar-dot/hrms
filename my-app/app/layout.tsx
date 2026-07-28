import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { rootMetadata } from "@/lib/site-metadata";
import { parseThemeMode, DEFAULT_THEME_MODE, THEME_STORAGE_KEY, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = rootMetadata;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4338CA" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1b4b" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme: ThemeMode =
    parseThemeMode(cookieStore.get(THEME_STORAGE_KEY)?.value) ?? DEFAULT_THEME_MODE;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme={theme}
      data-theme-preset="checkin"
      className={cn(
        "h-full antialiased",
        theme === "dark" ? "dark" : "light",
        geistSans.variable,
        geistMono.variable,
      )}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground transition-colors duration-200">
        <ThemeProvider defaultTheme={theme}>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
