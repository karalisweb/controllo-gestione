import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance v2.1 by Karalisweb",
  description: "Controllo cashflow decisionale - Karalisweb Finance",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <div className="flex min-h-screen">
          {/* Sidebar - hidden on mobile */}
          <Sidebar />

          {/* Main content */}
          <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
            {children}
          </main>

          {/* Mobile bottom navigation */}
          <MobileNav />
        </div>
      </body>
    </html>
  );
}
