import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-headline",
});

export const metadata: Metadata = {
  title: "Məşqçi - Azərbaycanın ilk peşəkar sınaq imtahanı platforması",
  description: "SAT, IELTS, TOEFL və DİM imtahanlarına hər yerdə, hər zaman peşəkar mühitdə hazırlaşın.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="az">
        <head />
        <body
          className={`${inter.variable} ${manrope.variable} antialiased bg-background text-on-surface font-body selection:bg-primary-fixed selection:text-on-primary-fixed`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
