export interface LanguageOption {
  /** Canonical English name -- matches the backend planner's response_language values. */
  name: string;
  nativeName: string;
  /** BCP-47 tag for the Web Speech API (SpeechRecognition.lang / SpeechSynthesisUtterance.lang). */
  bcp47: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { name: "English", nativeName: "English", bcp47: "en-IN" },
  { name: "Hindi", nativeName: "हिन्दी", bcp47: "hi-IN" },
  { name: "Tamil", nativeName: "தமிழ்", bcp47: "ta-IN" },
  { name: "Telugu", nativeName: "తెలుగు", bcp47: "te-IN" },
  { name: "Kannada", nativeName: "ಕನ್ನಡ", bcp47: "kn-IN" },
  { name: "Malayalam", nativeName: "മലയാളം", bcp47: "ml-IN" },
  { name: "Marathi", nativeName: "मराठी", bcp47: "mr-IN" },
  { name: "Gujarati", nativeName: "ગુજરાતી", bcp47: "gu-IN" },
  { name: "Bengali", nativeName: "বাংলা", bcp47: "bn-IN" },
  { name: "Odia", nativeName: "ଓଡ଼ିଆ", bcp47: "or-IN" },
];

export const DEFAULT_LANGUAGE: LanguageOption = SUPPORTED_LANGUAGES[0];

/**
 * Maps a free-text language name (as the backend planner's response_language
 * returns it, e.g. "Hindi") to a BCP-47 code for speech recognition/synthesis.
 * Falls back to the default language for anything unrecognized.
 */
export function bcp47ForLanguageName(name: string | null | undefined): string {
  if (!name) return DEFAULT_LANGUAGE.bcp47;
  const trimmed = name.trim().toLowerCase();
  const match = SUPPORTED_LANGUAGES.find((l) => l.name.toLowerCase() === trimmed);
  return match ? match.bcp47 : DEFAULT_LANGUAGE.bcp47;
}
