import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aadhi Learning Studio",
  description:
    "AI-assisted educational content creation with the Aadhi mascot: novice and advanced page-by-page content, branded templates, and consistent character visuals.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-indigo-800">
              <span aria-hidden className="text-xl">🦌</span> Aadhi Learning Studio
            </Link>
            <nav className="flex gap-4 text-sm font-medium text-slate-700">
              <Link href="/" className="hover:text-indigo-700">
                Projects
              </Link>
              <Link href="/settings" className="hover:text-indigo-700">
                Settings
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
