"use client";

import { useState } from "react";
import { translate, friendlyErrorMessage } from "@/lib/api";
import { LANGUAGES, getLanguageByCode } from "@/lib/languages";

const SAMPLE_TRANSLATIONS = [
  {
    label: "Rain in Lucknow",
    sourceText: "Will it rain heavily in Lucknow tomorrow?",
    sourceLang: "en-IN",
    targetLang: "hi-IN",
  },
  {
    label: "Chennai Heatwave",
    sourceText: "Is Chennai expecting a heatwave this week?",
    sourceLang: "en-IN",
    targetLang: "ta-IN",
  },
  {
    label: "Hyderabad Monsoon",
    sourceText: "When will the monsoon arrive in Hyderabad?",
    sourceLang: "en-IN",
    targetLang: "te-IN",
  },
  {
    label: "Kolkata Forecast",
    sourceText: "What is the 5-day weather forecast for Kolkata?",
    sourceLang: "en-IN",
    targetLang: "bn-IN",
  },
  {
    label: "Pune Temperature",
    sourceText: "What is the maximum temperature in Pune today?",
    sourceLang: "en-IN",
    targetLang: "mr-IN",
  },
];

const SUPPORTED_LANGUAGES_INFO = [
  {
    name: "Hindi (हिन्दी)",
    code: "hi-IN",
    notes: "Full support for Devanagari script weather queries, colloquial idioms, and forecasts.",
  },
  {
    name: "Tamil (தமிழ்)",
    code: "ta-IN",
    notes: "Trained on Tamil meteorological vocabulary and regional colloquial phrasings.",
  },
  {
    name: "Telugu (తెలుగు)",
    code: "te-IN",
    notes: "Supports Andhra Pradesh & Telangana regional weather phrasing and agricultural terms.",
  },
  {
    name: "Bengali (বাংলা)",
    code: "bn-IN",
    notes: "Optimized for Eastern India & delta region weather terminology.",
  },
  {
    name: "Marathi (मराठी)",
    code: "mr-IN",
    notes: "Specialized in Western Ghats, Vidarbha, and Konkan seasonal weather terms.",
  },
  {
    name: "English (Indian context)",
    code: "en-IN",
    notes: "Handles Indian city names, monsoon vernacular, and regional meteorological terms.",
  },
];

export default function LanguagesPage() {
  const [inputText, setInputText] = useState("Is it going to rain in Mumbai tomorrow?");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("hi-IN");
  const [translatedText, setTranslatedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleTranslate() {
    const trimmed = inputText.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await translate(trimmed, targetLang, sourceLang);
      setTranslatedText(res.translated_text);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleSwap() {
    if (sourceLang === "auto") return;
    const oldSource = sourceLang;
    const oldTarget = targetLang;
    setSourceLang(oldTarget);
    setTargetLang(oldSource);
    setInputText(translatedText);
    setTranslatedText(inputText);
  }

  function handleCopy() {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function loadSample(sample: (typeof SAMPLE_TRANSLATIONS)[0]) {
    setInputText(sample.sourceText);
    setSourceLang(sample.sourceLang);
    setTargetLang(sample.targetLang);
    setTranslatedText("");
    setError(null);
  }

  const targetLangMeta = getLanguageByCode(targetLang);
  const sourceLangMeta = sourceLang === "auto" ? null : getLanguageByCode(sourceLang);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:py-16">
      {/* Header */}
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl text-indigo md:text-4xl">
          Multilingual support
        </h1>
        <p className="mt-2 font-body text-sm text-ink-soft leading-relaxed">
          WeatherGPT bridges linguistic divides across India with dedicated translation
          models engineered specifically for Indic languages.
        </p>
      </div>

      {/* Translation Workspace */}
      <div className="mt-10 rounded-2xl border border-line bg-surface p-6 sm:p-8">
        {/* Language Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            {/* Source language picker */}
            <div>
              <label
                htmlFor="source-lang-select"
                className="block font-body text-[0.68rem] uppercase tracking-wider text-ink-faint mb-1"
              >
                Source Language
              </label>
              <select
                id="source-lang-select"
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                disabled={loading}
                className="rounded-md border border-line bg-surface px-3 py-1.5 font-body text-xs text-ink outline-none hover:border-indigo/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
              >
                <option value="auto">Detect language (Auto)</option>
                {LANGUAGES.map((l) => (
                  <option key={l.bcp47} value={l.bcp47}>
                    {l.label} ({l.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={handleSwap}
              disabled={loading || sourceLang === "auto"}
              title="Swap languages"
              aria-label="Swap source and target languages"
              className="mt-4 flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-indigo hover:text-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <SwapIcon />
            </button>

            {/* Target language picker */}
            <div>
              <label
                htmlFor="target-lang-select"
                className="block font-body text-[0.68rem] uppercase tracking-wider text-ink-faint mb-1"
              >
                Target Language
              </label>
              <select
                id="target-lang-select"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                disabled={loading}
                className="rounded-md border border-line bg-surface px-3 py-1.5 font-body text-xs text-ink outline-none hover:border-indigo/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.bcp47} value={l.bcp47}>
                    {l.label} ({l.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={handleTranslate}
            disabled={loading || !inputText.trim()}
            className="rounded-lg bg-indigo px-5 py-2.5 font-body text-xs font-medium text-mist transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Translating…" : "Translate"}
          </button>
        </div>

        {/* Translation Boxes: Side-by-side on desktop, stacked on mobile */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Source Box */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between pb-2">
              <span className="font-body text-xs font-medium text-ink-soft">
                {sourceLangMeta ? `${sourceLangMeta.label} (${sourceLangMeta.nativeName})` : "Input Text"}
              </span>
              <span className="font-body text-[0.68rem] text-ink-faint">
                {inputText.length} characters
              </span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type or paste text to translate…"
              rows={5}
              disabled={loading}
              className="w-full resize-none rounded-xl border border-line bg-mist/30 p-4 font-body text-sm text-ink outline-none transition-colors hover:border-indigo/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo disabled:opacity-60"
            />
          </div>

          {/* Target Box */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between pb-2">
              <span className="font-body text-xs font-medium text-indigo">
                {targetLangMeta.label} ({targetLangMeta.nativeName})
              </span>
              {translatedText && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 font-body text-[0.68rem] text-ink-soft hover:text-indigo transition-colors"
                >
                  <CopyIcon />
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </div>
            <div
              className={`flex-1 min-h-[120px] rounded-xl border border-line bg-mist/30 p-4 font-body text-sm leading-relaxed transition-colors ${
                translatedText ? "text-ink" : "text-ink-faint italic"
              }`}
            >
              {translatedText || (loading ? "Translating with Sarvam AI…" : "Translation will appear here…")}
            </div>
          </div>
        </div>

        {/* Quick Test Chips */}
        <div className="mt-6 border-t border-line pt-4">
          <p className="font-body text-xs text-ink-faint mb-2.5">
            Quick weather query samples:
          </p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_TRANSLATIONS.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => loadSample(sample)}
                disabled={loading}
                className="rounded-full border border-line bg-surface px-3 py-1 font-body text-xs text-ink-soft transition-colors hover:border-indigo hover:text-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
              >
                {sample.label} → {sample.targetLang.split("-")[0].toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-lg border border-horizon/30 bg-surface p-3 font-body text-xs text-horizon">
            {error}
          </div>
        )}
      </div>

      {/* Static Explainer Section */}
      <div className="mt-16">
        <div className="border-b border-line pb-3">
          <h2 className="font-display text-2xl text-ink">
            Why Sarvam AI for Indian Languages?
          </h2>
          <p className="mt-1 font-body text-xs text-ink-faint">
            Targeted Indic foundation models designed for Indian linguistic nuances
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-5">
            <h3 className="font-display text-lg text-indigo">
              Dialect & Vernacular Precision
            </h3>
            <p className="mt-2 font-body text-xs text-ink-soft leading-relaxed">
              Standard global translation models often mistranslate localized meteorological terms (such as monsoon onset, loo, lathi, cyclonic disturbances, and crop-season weather). Sarvam AI is trained natively on Indic linguistic corpora.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <h3 className="font-display text-lg text-horizon">
              Grounded Meteorological Output
            </h3>
            <p className="mt-2 font-body text-xs text-ink-soft leading-relaxed">
              In WeatherGPT, all weather facts (temperatures, rainfall sums, wind speeds) are extracted first from authoritative sensors (Open-Meteo), framed in plain English, and then translated via Sarvam to guarantee zero statistical hallucination.
            </p>
          </div>
        </div>

        {/* Supported Languages Grid */}
        <div className="mt-8">
          <h3 className="font-display text-lg text-ink mb-4">
            Currently Supported Languages
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SUPPORTED_LANGUAGES_INFO.map((lang) => (
              <div
                key={lang.code}
                className="rounded-lg border border-line bg-surface/70 p-4 transition-colors hover:border-indigo/30"
              >
                <div className="flex items-center justify-between">
                  <p className="font-display text-sm text-ink">{lang.name}</p>
                  <span className="font-mono text-[0.68rem] text-paddy">
                    {lang.code}
                  </span>
                </div>
                <p className="mt-2 font-body text-xs text-ink-soft leading-relaxed">
                  {lang.notes}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SwapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m7 16 5 5 5-5M12 21V9M17 8l-5-5-5 5M12 3v12"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
      />
    </svg>
  );
}
