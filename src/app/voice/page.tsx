"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { chatStream, friendlyErrorMessage, ApiError } from "@/lib/api";
import { getBcp47Tag, type LanguageCode } from "@/lib/languages";
import { ChatThread, type ChatMessage } from "@/app/components/ChatThread";
import { LanguageSelector } from "@/app/components/LanguageSelector";
import { useMounted } from "@/lib/useMounted";

type VoiceState = "idle" | "listening" | "processing" | "speaking";

function uid() {
  return Math.random().toString(36).slice(2);
}

// Browser Web Speech API type declarations
interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResultItem[];
  [index: number]: {
    isFinal: boolean;
    [index: number]: SpeechRecognitionResultItem;
  };
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition;
}

interface SpeechWindow extends Window {
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
}

function checkSpeechRecognition(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as unknown as SpeechWindow;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

function checkSpeechSynthesis(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
}

export default function VoicePage() {
  const mounted = useMounted();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [typedInput, setTypedInput] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const speechSupported = mounted ? checkSpeechRecognition() : null;
  const ttsSupported = mounted ? checkSpeechSynthesis() : false;

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const handleSendQueryRef = useRef<(text: string) => void>(() => {});

  // Text-To-Speech playback
  const speakText = useCallback(
    (text: string) => {
      if (!ttsSupported || typeof window === "undefined" || !window.speechSynthesis) return;

      window.speechSynthesis.cancel(); // Stop any previous playback

      const cleanText = text.replace(/[*#_`]/g, ""); // Strip markdown markers for cleaner TTS
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = getBcp47Tag(language);
      utterance.rate = 1.0;

      // Select matching voice if available
      const voices = window.speechSynthesis.getVoices();
      const targetBcp = getBcp47Tag(language);
      const matchVoice = voices.find((v) => v.lang.startsWith(targetBcp.slice(0, 2)));
      if (matchVoice) {
        utterance.voice = matchVoice;
      }

      utterance.onstart = () => setVoiceState("speaking");
      utterance.onend = () => setVoiceState("idle");
      utterance.onerror = () => setVoiceState("idle");

      window.speechSynthesis.speak(utterance);
    },
    [language, ttsSupported]
  );

  const handleSendQuery = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      // Stop speech synthesis if speaking
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      const userMsg: ChatMessage = { id: uid(), role: "user", text: trimmed };
      const assistantId = uid();
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: "assistant",
        text: "",
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setVoiceState("processing");
      setTypedInput("");

      let accumulatedAnswer = "";

      try {
        await chatStream(
          trimmed,
          language === "en" ? undefined : language,
          (delta) => {
            accumulatedAnswer += delta;
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
            // Once response completes, speak it out loud
            speakText(accumulatedAnswer);
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
            setVoiceState("idle");
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
        setVoiceState("idle");
      }
    },
    [language, speakText]
  );

  // Keep ref up to date for recognition event handler
  useEffect(() => {
    handleSendQueryRef.current = handleSendQuery;
  }, [handleSendQuery]);

  // Initialize Speech Recognition feature detection
  useEffect(() => {
    const win = window as unknown as SpeechWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = true;
      recog.lang = getBcp47Tag(language);

      recog.onstart = () => {
        isListeningRef.current = true;
        setVoiceState("listening");
        setErrorMsg(null);
      };

      recog.onresult = (event: SpeechRecognitionEvent) => {
        let currentInterim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const finalTranscript = event.results[i][0].transcript;
            setInterimTranscript("");
            handleSendQueryRef.current(finalTranscript);
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }
        setInterimTranscript(currentInterim);
      };

      recog.onerror = (event: SpeechRecognitionErrorEvent) => {
        isListeningRef.current = false;
        if (event.error === "not-allowed") {
          setErrorMsg(
            "Microphone permission was denied. Please allow microphone access in your browser settings, or use typed input below."
          );
        } else if (event.error !== "no-speech") {
          setErrorMsg(`Voice input note: ${event.error || "Could not hear audio."}`);
        }
        setVoiceState("idle");
        setInterimTranscript("");
      };

      recog.onend = () => {
        isListeningRef.current = false;
        setVoiceState((prev) => (prev === "listening" ? "idle" : prev));
      };

      recognitionRef.current = recog;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [language]);

  // Update recognition language when language selector changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = getBcp47Tag(language);
    }
  }, [language]);

  function toggleListening() {
    if (!recognitionRef.current) return;

    if (voiceState === "speaking") {
      window.speechSynthesis.cancel();
      setVoiceState("idle");
      return;
    }

    if (isListeningRef.current || voiceState === "listening") {
      recognitionRef.current.stop();
      isListeningRef.current = false;
      setVoiceState("idle");
    } else {
      try {
        recognitionRef.current.start();
        isListeningRef.current = true;
      } catch {
        // Recognition might already be active
      }
    }
  }

  function handleStopSpeaking() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setVoiceState("idle");
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-65px)] max-w-3xl flex-col px-6">
      {/* Top bar: title + language selector */}
      <div className="flex shrink-0 items-center justify-between border-b border-line py-4">
        <div>
          <h1 className="font-display text-xl leading-tight text-indigo">
            Voice access
          </h1>
          <p className="mt-0.5 font-body text-xs text-ink-faint">
            Speak naturally · listen to live meteorological answers
          </p>
        </div>

        <LanguageSelector
          value={language}
          onChange={(code) => setLanguage(code as LanguageCode)}
          disabled={voiceState === "listening" || voiceState === "processing"}
        />
      </div>

      {/* Browser Speech Support Warning Banner */}
      {speechSupported === false && (
        <div className="mt-3 rounded-lg border border-horizon/30 bg-surface p-3 font-body text-xs text-ink-soft">
          <p className="font-medium text-horizon">
            Microphone speech recognition is not supported in this browser.
          </p>
          <p className="mt-0.5 text-ink-faint">
            Chrome, Edge, and Safari have native Web Speech API support. You can still type queries below and hear voice playback.
          </p>
        </div>
      )}

      {/* Permission / Runtime Note */}
      {errorMsg && (
        <div className="mt-3 rounded-lg border border-horizon/30 bg-surface p-3 font-body text-xs text-horizon">
          {errorMsg}
        </div>
      )}

      {/* Conversational Message Thread */}
      {mounted && (
        <ChatThread
          messages={messages}
          streaming={voiceState === "processing"}
          emptyTitle="Speak to WeatherGPT"
          emptySubtitle="Tap the microphone to ask about conditions, rain, or temperatures across India in your preferred language."
          sampleQuestions={[
            "Will it rain in Delhi this evening?",
            "What is the temperature in Bengaluru right now?",
            "Is there a storm forecast in Mumbai?",
          ]}
          onSampleClick={(q) => handleSendQuery(q)}
        />
      )}

      {/* Voice Control & Input Panel */}
      <div className="shrink-0 border-t border-line py-4">
        {/* Live Interim Transcript or State Readout */}
        <div className="mb-3 flex items-center justify-between min-h-[24px]">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full transition-colors ${
                voiceState === "listening"
                  ? "bg-horizon animate-ping"
                  : voiceState === "processing"
                  ? "bg-indigo animate-pulse"
                  : voiceState === "speaking"
                  ? "bg-paddy animate-bounce"
                  : "bg-line"
              }`}
            />
            <span className="font-body text-xs font-medium text-ink-soft">
              {voiceState === "listening" && "Listening to you…"}
              {voiceState === "processing" && "Fetching real meteorological data…"}
              {voiceState === "speaking" && "Speaking response aloud…"}
              {voiceState === "idle" && (speechSupported ? "Ready to listen" : "Ready for input")}
            </span>
          </div>

          {voiceState === "speaking" && (
            <button
              type="button"
              onClick={handleStopSpeaking}
              className="font-body text-xs text-horizon hover:underline"
            >
              Stop speaking
            </button>
          )}
        </div>

        {interimTranscript && (
          <div className="mb-3 rounded-lg border border-line bg-surface/80 p-2.5 font-body text-xs italic text-ink-soft">
            &ldquo;{interimTranscript}…&rdquo;
          </div>
        )}

        {/* Action Controls: Mic button + typed input fallback */}
        <div className="flex items-center gap-3">
          {/* Mic Button */}
          {speechSupported !== false && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={voiceState === "processing"}
              aria-label={
                voiceState === "listening" ? "Stop listening" : "Start speaking"
              }
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo ${
                voiceState === "listening"
                  ? "border-horizon bg-horizon text-mist shadow-md ring-4 ring-horizon/20"
                  : voiceState === "speaking"
                  ? "border-paddy bg-paddy text-mist"
                  : "border-line bg-surface text-ink hover:border-indigo hover:text-indigo"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {voiceState === "listening" ? <StopIcon /> : <MicIcon />}
            </button>
          )}

          {/* Typed Fallback Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery(typedInput);
            }}
            className="flex flex-1 items-center gap-2"
          >
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              disabled={voiceState === "processing" || voiceState === "listening"}
              placeholder="Or type your question here…"
              className="flex-1 rounded-lg border border-line bg-surface px-3.5 py-2.5 font-body text-sm text-ink outline-none transition-colors hover:border-indigo/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!typedInput.trim() || voiceState === "processing"}
              aria-label="Send query"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo px-4 font-body text-xs font-medium text-mist transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>

        <p className="mt-2 font-body text-[0.68rem] text-ink-faint">
          Browser-native Speech Recognition & Synthesis · Works in English, Hindi, Tamil, Telugu, Bengali, and Marathi
        </p>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9.25" y="3.5" width="5.5" height="10" rx="2.75" stroke="currentColor" strokeWidth="1.6" />
      <path stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  );
}
