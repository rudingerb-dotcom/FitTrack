import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: "FitTrack — Fitness Tracker",
  description:
    "Track your workouts, monitor progress, and achieve your fitness goals with FitTrack. The smart fitness companion.",
  keywords: [
    "fitness",
    "tracker",
    "workout",
    "gym",
    "exercise",
    "health",
    "FitTrack",
  ],
  authors: [{ name: "FitTrack" }],
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "FitTrack — Fitness Tracker",
    description: "Track workouts, monitor progress, crush your goals",
    type: "website",
    siteName: "FitTrack",
  },
  twitter: {
    card: "summary_large_image",
    title: "FitTrack — Fitness Tracker",
    description: "Track workouts, monitor progress, crush your goals",
  },
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
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
