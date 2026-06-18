import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ThemeScript } from "@/components/ThemeScript";

export const metadata: Metadata = {
  title: "Outlines",
  description:
    "A photography portfolio — light, shadow, and the silhouettes of cities.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Outlines",
    description:
      "Not the details, only the outlines. A lens that traces city and stranger.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <div className="layout-wrapper">
          <Header />
          <main className="layout-main">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
