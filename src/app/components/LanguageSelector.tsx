"use client";

import { LANGUAGES } from "@/lib/languages";

interface LanguageSelectorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  useBcp47?: boolean;
  showNativeName?: boolean;
  label?: string;
  className?: string;
}

export function LanguageSelector({
  id = "language-select",
  value,
  onChange,
  disabled = false,
  useBcp47 = false,
  showNativeName = false,
  label = "Language",
  className = "",
}: LanguageSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="font-body text-[0.7rem] uppercase tracking-wider text-ink-faint"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-md border border-line bg-surface px-2.5 py-1 font-body text-xs text-ink outline-none transition-colors hover:border-indigo/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {LANGUAGES.map((lang) => {
          const val = useBcp47 ? lang.bcp47 : lang.code;
          const display = showNativeName ? `${lang.label} (${lang.nativeName})` : lang.label;
          return (
            <option key={val} value={val}>
              {display}
            </option>
          );
        })}
      </select>
    </div>
  );
}
