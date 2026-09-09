"use client";

import { useRef, useState, useCallback } from "react";
import { chatStream, friendlyErrorMessage, ApiError } from "@/lib/api";
import { type LanguageCode } from "@/lib/languages";
import { ChatThread, type ChatMessage } from "@/app/components/ChatThread";
import { LanguageSelector } from "@/app/components/LanguageSelector";
import { useMounted } from "@/lib/useMounted";

const SAMPLE_QUESTIONS = [
  "Will it rain in Mumbai tomorrow?",
  "What's the weather in Chennai this week?",
  "Is it going to be hot in Delhi this weekend?",
  "Tell me the forecast for Kolkata for the next 5 days.",
];

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function ChatPage() {
  const mounted = useMounted();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [streaming, setStreaming] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      const userMsg: ChatMessage = { id: uid(), role: "user", text: trimmed };
      const assistantId = uid();
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: "assistant",
        text: "",
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setInput("");
      setStreaming(true);

      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      try {
        await chatStream(
          trimmed,
          language === "en" ? undefined : language,
          (delta) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, text: m.text + delta } : m
              )
            );
          },
          (meta) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, streaming: false, meta }
                  : m
              )
            );
          },
          (err) => {
            const msg = friendlyErrorMessage(
              err instanceof ApiError ? err : new Error(String(err))
            );
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, text: msg, streaming: false, error: true }
                  : m
              )
            );
          }
        );
      } catch (err) {
        const msg = friendlyErrorMessage(err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, text: msg, streaming: false, error: true }
              : m
          )
        );
      } finally {
        setStreaming(false);
        textareaRef.current?.focus();
      }
    },
    [language, streaming]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-65px)] max-w-3xl flex-col px-6">
      {/* Top bar: title + language picker */}
      <div className="flex shrink-0 items-center justify-between border-b border-line py-4">
        <div>
          <h1 className="font-display text-xl leading-tight text-indigo">
            Ask WeatherGPT
          </h1>
          <p className="mt-0.5 font-body text-xs text-ink-faint">
            Real weather data · plain-language answers
          </p>
        </div>

        <LanguageSelector
          value={language}
          onChange={(code) => setLanguage(code as LanguageCode)}
          disabled={streaming}
        />
      </div>

      {/* Message list via shared ChatThread */}
      {mounted && (
        <ChatThread
          messages={messages}
          streaming={streaming}
          sampleQuestions={SAMPLE_QUESTIONS}
          onSampleClick={(q) => sendMessage(q)}
        />
      )}

      {/* Input bar */}
      <div className="shrink-0 border-t border-line py-4">
        <div className="flex items-end gap-2.5">
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            disabled={streaming || !mounted}
            rows={1}
            placeholder={
              language === "en"
                ? "Ask about the weather anywhere in India…"
                : `Ask in ${language.toUpperCase()}…`
            }
            aria-label="Your question"
            className="flex-1 resize-none overflow-hidden rounded-lg border border-line bg-surface px-3.5 py-2.5 font-body text-sm text-ink outline-none transition-colors hover:border-indigo/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={streaming || !input.trim() || !mounted}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo text-mist transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo disabled:cursor-not-allowed disabled:opacity-40"
          >
            {streaming ? (
              <span className="animate-spin">
                <SpinnerIcon />
              </span>
            ) : (
              <SendIcon />
            )}
          </button>
        </div>
        <p className="mt-1.5 font-body text-[0.68rem] text-ink-faint">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14M12 5l7 7-7 7"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
