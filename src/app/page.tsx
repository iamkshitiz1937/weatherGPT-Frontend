import Link from "next/link";
import { getCurrentWeather } from "@/lib/api";
import { LiveWeatherWidget } from "./components/LiveWeatherWidget";
import { DisasterAlertsSection } from "./components/DisasterAlertsSection";

const FEATURES = [
  {
    href: "/alerts",
    title: "Disaster alerts & warnings",
    description: "Live NDMA SACHET disaster advisories, flood warnings, and cyclonic alerts.",
    accent: "horizon" as const,
    icon: AlertIcon,
  },
  {
    href: "/chat",
    title: "Ask WeatherGPT",
    description: "Ask about the weather in plain language, in English or an Indian language.",
    accent: "indigo" as const,
    icon: ChatIcon,
  },
  {
    href: "/forecast",
    title: "Forecast lookup",
    description: "Current conditions and a 5-day forecast for any location in India.",
    accent: "horizon" as const,
    icon: CloudIcon,
  },
  {
    href: "/climate-trends",
    title: "Climate & historical trends",
    description: "See how temperature and rainfall have changed over time for a place.",
    accent: "paddy" as const,
    icon: TrendIcon,
  },
  {
    href: "/languages",
    title: "Multilingual support",
    description: "Try live translation into Hindi, Tamil, Telugu, Bengali, and Marathi.",
    accent: "indigo" as const,
    icon: GlobeIcon,
  },
  {
    href: "/voice",
    title: "Voice access",
    description: "Speak your question and hear the answer — built for accessibility.",
    accent: "horizon" as const,
    icon: MicIcon,
  },
];

const ACCENT_CLASSES = {
  indigo: "text-indigo",
  horizon: "text-horizon",
  paddy: "text-paddy",
};

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      {/* Hero: headline + CTA on the left, live user station widget on the right */}
      <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 font-body text-xs text-ink-soft mb-4">
            <span className="h-2 w-2 rounded-full bg-paddy animate-pulse" />
            Live Meteorological Intelligence for India
          </div>
          <h1 className="max-w-prose font-display text-4xl leading-tight text-indigo md:text-5xl lg:text-6xl">
            Ask about the weather, anywhere in India, in your language.
          </h1>
          <p className="mt-5 max-w-[38ch] font-body leading-relaxed text-ink-soft">
            Real weather data goes in, a plain-language answer comes out —
            in English or your own language, whenever you ask.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/chat"
              className="inline-flex items-center rounded-full bg-indigo px-6 py-3 font-body text-sm font-medium text-mist transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo"
            >
              Start chatting
            </Link>
            <Link
              href="/alerts"
              className="inline-flex items-center rounded-full border border-horizon/40 bg-surface px-5 py-3 font-body text-sm font-medium text-horizon transition-colors hover:border-horizon hover:bg-horizon/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-horizon"
            >
              Disaster alerts
            </Link>
          </div>
        </div>

        {/* Dynamic User Location Station Readout with wind, humidity, condition */}
        <div>
          <LiveWeatherWidget />
        </div>
      </div>

      {/* Prominent Localized Disaster Alerts (200 km radius of user) */}
      <DisasterAlertsSection />

      {/* Feature list, styled as forecast-bulletin rows rather than cards */}
      <div className="mt-16 border-t border-line pt-2">
        <div className="py-4">
          <h3 className="font-display text-xl text-ink">Explore capabilities</h3>
          <p className="font-body text-xs text-ink-faint">
            Meteorological analysis, conversational AI, and emergency safety features
          </p>
        </div>
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.href}
              href={feature.href}
              className="group flex items-start gap-4 border-b border-line py-5 transition-colors hover:bg-indigo/5 px-2 rounded-lg"
            >
              <span className={`mt-1 shrink-0 ${ACCENT_CLASSES[feature.accent]}`}>
                <Icon />
              </span>
              <span>
                <span className="font-display text-xl text-ink transition-colors group-hover:text-indigo">
                  {feature.title}
                </span>
                <span className="mt-1 block max-w-prose font-body text-sm text-ink-soft">
                  {feature.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function AlertIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      />
      <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        d="M4 5.5h16v10H9.5L5 19v-3.5H4v-10Z"
      />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        d="M7.5 17a4 4 0 0 1-.5-7.97A5 5 0 0 1 16.9 8.1 3.75 3.75 0 0 1 16.5 17h-9Z"
      />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16.5 9.5 11l3.5 3 6-7M15 6.5h4.5V11"
      />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        d="M12 4.5c2.2 2.1 3.4 4.7 3.4 7.5s-1.2 5.4-3.4 7.5c-2.2-2.1-3.4-4.7-3.4-7.5S9.8 6.6 12 4.5ZM4.8 9.5h14.4M4.8 14.5h14.4"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9.25" y="3.5" width="5.5" height="10" rx="2.75" stroke="currentColor" strokeWidth="1.6" />
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3"
      />
    </svg>
  );
}