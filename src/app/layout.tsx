import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "DistroScope — Find Your Perfect Linux Distro",
  description:
    "Explore 42 Linux distros on one interactive glass map, filter by what matters to you, and take a smart 11-question quiz to find your perfect match. No telemetry, no sign-up, just clarity.",
  keywords: [
    "Linux",
    "distro",
    "distribution",
    "distro chooser",
    "find my Linux",
    "Ubuntu",
    "Arch",
    "Fedora",
    "Mint",
  ],
  authors: [{ name: "DistroScope" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "DistroScope — Find Your Perfect Linux Distro",
    description:
      "The glass map of the Linux universe. Explore, filter, and get matched with your perfect distro.",
    siteName: "DistroScope",
    type: "website",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "DistroScope — the glass map of the Linux universe. 52 distros, 8 families, 16 questions.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DistroScope — Find Your Perfect Linux Distro",
    description:
      "One interactive map, one smart quiz, zero telemetry. Find the Linux that feels like home.",
    images: ["/api/og"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0a12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
