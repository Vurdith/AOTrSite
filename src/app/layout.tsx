import type { Metadata } from "next";
import { Rajdhani, Unbounded } from "next/font/google";

import { FloatingHeader } from "@/components/FloatingHeader";
import { UiSoundLayer } from "@/components/UiSoundLayer";

import "./globals.css";

const display = Unbounded({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  display: "swap",
});

const sans = Rajdhani({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aotrvalue.com";
const title = "AOTR Value Central";
const description = "Check Attack on Titan Revolution item values, demand, tax, trends, updates, and trade fairness before you trade.";

export const metadata: Metadata = {
  alternates: {
    canonical: siteUrl,
  },
  applicationName: title,
  description,
  metadataBase: new URL(siteUrl),
  openGraph: {
    description,
    images: [{ alt: title, height: 630, url: "/aotevo-logo.png", width: 1200 }],
    siteName: title,
    title,
    type: "website",
    url: siteUrl,
  },
  referrer: "strict-origin-when-cross-origin",
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    index: true,
  },
  title: {
    default: title,
    template: `%s | ${title}`,
  },
  twitter: {
    card: "summary_large_image",
    description,
    images: ["/aotevo-logo.png"],
    title,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <UiSoundLayer />
        <FloatingHeader />
        {children}
      </body>
    </html>
  );
}
