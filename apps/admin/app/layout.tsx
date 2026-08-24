import type { Metadata } from "next";
import { ADMIN_PORTAL_NAME, APP_NAME, TAGLINE } from "@attendance/shared";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: ADMIN_PORTAL_NAME,
  description: `${APP_NAME} — ${TAGLINE}`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${monoFont.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--canvas)] text-[var(--foreground)]">{children}</body>
    </html>
  );
}
