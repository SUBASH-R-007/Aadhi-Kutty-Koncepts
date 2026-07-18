import type { Metadata } from "next";
import Image from "next/image";
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
        <header className="sticky top-0 z-30 border-b border-black/10 bg-[#4B2072]/95 text-white shadow-sm backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2.5 font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 p-1 shadow-sm">
                <Image src="/rec-logo.png" alt="REC" width={28} height={28} className="h-full w-auto object-contain" />
              </span>
              <span className="text-lg tracking-tight">
                Aadhi <span className="text-[#F4A81D]">Learning Studio</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium">
              <Link href="/" className="rounded-md px-3 py-1.5 text-white/90 transition hover:bg-white/10 hover:text-white">
                Projects
              </Link>
              <Link href="/settings" className="rounded-md px-3 py-1.5 text-white/90 transition hover:bg-white/10 hover:text-white">
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
