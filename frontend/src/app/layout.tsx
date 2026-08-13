import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastContainer } from "@/components/ToastContainer";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { AuthSync } from "@/components/AuthSync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OSAGO — Onlayn sug'urta",
  description: "Avtomobil OSAGO sug'urta polisini onlayn sotib olish tizimi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uz"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeInitializer />
        <AuthSync />
        <ToastContainer />
        {children}
      </body>
    </html>
  );
}
