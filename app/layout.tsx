import "./globals.css";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Qazax • Ağstafa Alqı-Satqı — Elanlar",
  description: "Qazax və Ağstafa şəhərləri üçün elan platforması: avtomobil, əşya, xidmət və daha çoxu.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az">
      <body>
        <Navbar />
        {/*
          Mobile bottom navigation is fixed; keep enough bottom padding so forms/buttons
          are not covered (also respects iOS safe-area).
        */}
        <main className="mx-auto max-w-6xl px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] sm:pb-6">
          {children}
        </main>
        {/* Footer is hidden on small screens to avoid clashing with mobile bottom nav */}
        <Footer />
        <MobileBottomNav />
      </body>
    </html>
  );
}
