"use client";

import { useEffect, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
  error?: boolean;
  meta?: { location_name?: string; query_type?: string };
}

interface ChatThreadProps {
  messages: ChatMessage[];
  streaming?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  sampleQuestions?: string[];
  onSampleClick?: (question: string) => void;
  className?: string;
}

export function ChatThread({
  messages,
  streaming = false,
  emptyTitle = "What would you like to know about the weather?",
  emptySubtitle = "Ask about current conditions, forecasts, or rainfall — anywhere in India.",
  sampleQuestions,
  onSampleClick,
  className = "",
}: ChatThreadProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const lastScrollTop = useRef(0);

  function handleLogScroll() {
    const el = logRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    if (atBottom) {
      userScrolledUp.current = false;
    } else if (el.scrollTop < lastScrollTop.current) {
      userScrolledUp.current = true;
    }
    lastScrollTop.current = el.scrollTop;
  }

  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    if (!userScrolledUp.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const hasMessages = messages.length > 0;

  return (
    <div
      ref={logRef}
      role="log"
      aria-live="polite"
      aria-label="Conversation"
      onScroll={handleLogScroll}
      className={`flex-1 overflow-y-auto ${className}`}
    >
      {!hasMessages && (
        <div className="py-10">
          <p className="font-display text-2xl text-ink leading-snug">
            {emptyTitle}
          </p>
          <p className="mt-2 font-body text-sm text-ink-soft">
            {emptySubtitle}
          </p>

          {sampleQuestions && sampleQuestions.length > 0 && (
            <div className="mt-8 border-t border-line">
              {sampleQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onSampleClick?.(q)}
                  disabled={streaming}
                  className="group flex w-full items-center gap-3 border-b border-line py-3.5 text-left font-body text-sm text-ink-soft transition-colors hover:bg-indigo/5 hover:text-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo disabled:opacity-50"
                >
                  <span className="shrink-0 text-indigo" aria-hidden="true">
                    →
                  </span>
                  <span>{q}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {messages.map((msg) => (
        <div key={msg.id} className="border-b border-line py-5">
          <div className="mb-2 flex items-center gap-1.5">
            <span
              className={`shrink-0 ${
                msg.role === "user" ? "text-ink-faint" : "text-indigo"
              }`}
            >
              {msg.role === "user" ? <UserIcon /> : <BotIcon />}
            </span>
            <span
              className={`font-body text-[0.7rem] font-semibold uppercase tracking-wider ${
                msg.role === "user" ? "text-ink-faint" : "text-indigo"
              }`}
            >
              {msg.role === "user" ? "You" : "WeatherGPT"}
            </span>
            {msg.streaming && (
              <span className="ml-1 animate-spin text-indigo">
                <SpinnerIcon />
              </span>
            )}
          </div>

          <p
            className={`font-body text-[0.9375rem] leading-relaxed whitespace-pre-wrap ${
              msg.error ? "text-horizon" : "text-ink"
            }`}
          >
            {msg.text || (
              msg.streaming ? (
                <span className="italic text-ink-faint">Thinking…</span>
              ) : null
            )}
            {msg.streaming && msg.text && (
              <span className="ml-0.5 inline-block animate-pulse text-indigo">
                ▋
              </span>
            )}
          </p>

          {msg.role === "assistant" && !msg.streaming && msg.meta && (
            <p className="mt-2.5 font-body text-[0.7rem] text-ink-faint">
              {msg.meta.location_name && (
                <>
                  <span className="text-paddy">{msg.meta.location_name}</span>
                  {msg.meta.query_type && (
                    <span> · {msg.meta.query_type}</span>
                  )}
                </>
              )}
              {!msg.meta.location_name && msg.meta.query_type && (
                <span>{msg.meta.query_type}</span>
              )}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M4 20c0-3.31 3.58-6 8-6s8 2.69 8 6"
      />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="8" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M12 8V5M9 5h6M9 14h.01M15 14h.01M9 17h6"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="28.27"
        strokeDashoffset="10"
      />
    </svg>
  );
}
