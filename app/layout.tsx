import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Let's Crack it",
  description: "Build your routine. Track your goals. Crack it.",
  other: {
    "color-scheme": "light",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-gray-900">
        <div className="flex-1">{children}</div>

        <footer className="border-t border-gray-200 bg-white/60 backdrop-blur mt-10">
          <div className="max-w-4xl mx-auto px-4 py-4 text-center text-[11px] leading-relaxed text-gray-500">
            <p>
              © 2026 By Abhirup Gumtya. All Rights Reserved. | Privacy Policy | Terms &amp; Conditions
            </p>
            <p className="mt-1">
              The content of this website is provided for general informational purposes and is subject to change without notice.
            </p>
            <p className="mt-1">
              Website Designed, Developed &amp; Maintained by - Abhirup Gumtya.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}