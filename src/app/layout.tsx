import type { Metadata } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { ThemeToggle } from "./components/ThemeToggle";

// next/font self-hosts these at build time — no runtime request to Google Fonts,
// so this doesn't cost you a render-blocking external font request in production.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "WeatherGPT",
  description:
    "Ask about the weather, anywhere in India, in your language — powered by real meteorological data.",
};

const NAV_LINKS = [
  { href: "/alerts", label: "Alerts" },
  { href: "/chat", label: "Chat" },
  { href: "/forecast", label: "Forecast" },
  { href: "/climate-trends", label: "Climate Trends" },
  { href: "/languages", label: "Languages" },
  { href: "/voice", label: "Voice" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('weathergpt-theme');
                const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-line bg-mist/80 backdrop-blur-sm sticky top-0 z-30">
          <nav className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
            <Link href="/" className="font-display text-xl text-indigo tracking-tight hover:opacity-90 transition-opacity">
              WeatherGPT
            </Link>
            <div className="flex items-center gap-6">
              <ul className="flex items-center gap-5 sm:gap-6 text-xs sm:text-sm font-body">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-ink-soft hover:text-indigo transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo rounded-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <ThemeToggle />
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}