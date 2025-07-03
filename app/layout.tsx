import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppwriteProvider } from "./appwrite-provider";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Whisperrauth",
  description: "Secure password management application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-[rgb(245,239,230)] text-[rgb(23,23,23)]`}>
        <AppwriteProvider>
          <Providers>
            <div className="min-h-screen w-full">
              <AppShell>{children}</AppShell>
            </div>
          </Providers>
        </AppwriteProvider>
      </body>
    </html>
  );
}
