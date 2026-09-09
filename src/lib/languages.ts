/**
 * Language options for the chat, translation, and voice interfaces.
 *
 * Codes are the SHORT-FORM keys that the backend's LANGUAGE_MAP resolves:
 *   "hi" → "hi-IN", "ta" → "ta-IN", etc.
 * Source: backend/app/routers/chat.py, LANGUAGE_MAP (lines 34-41).
 *
 * BCP-47 tags match what Sarvam AI translation and Web Speech API
 * (SpeechRecognition & SpeechSynthesis) expect.
 */
export const LANGUAGES = [
  { code: "en", label: "English", nativeName: "English", bcp47: "en-IN" },
  { code: "hi", label: "Hindi", nativeName: "हिन्दी", bcp47: "hi-IN" },
  { code: "ta", label: "Tamil", nativeName: "தமிழ்", bcp47: "ta-IN" },
  { code: "te", label: "Telugu", nativeName: "తెలుగు", bcp47: "te-IN" },
  { code: "bn", label: "Bengali", nativeName: "বাংলা", bcp47: "bn-IN" },
  { code: "mr", label: "Marathi", nativeName: "मराठी", bcp47: "mr-IN" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export type Bcp47LanguageTag = (typeof LANGUAGES)[number]["bcp47"];

export function getLanguageByCode(code: string) {
  return LANGUAGES.find((l) => l.code === code || l.bcp47 === code) ?? LANGUAGES[0];
}

export function getBcp47Tag(code: LanguageCode | string): string {
  const match = LANGUAGES.find((l) => l.code === code || l.bcp47 === code);
  return match ? match.bcp47 : "en-IN";
}
