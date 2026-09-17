import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Waves, MapPin, AlertTriangle, Check, Fish, Clock, Zap, Compass, ChevronDown, ChevronRight, Languages, Volume2, VolumeX } from "lucide-react";
import { ChatMessage, TraceEntry } from "@/lib/types";
import { RecommendationHero } from "./RecommendationHero";
import { WhatIfCard } from "./WhatIfCard";
import { EvidencePanel } from "./EvidencePanel";
import { MarkdownContent } from "./MarkdownContent";
import { PromptInput } from "./ui/ai-chat-input";
import { springs } from "@/lib/motion";
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, bcp47ForLanguageName, LanguageOption } from "@/lib/languages";
import { isSpeechSynthesisSupported, speak } from "@/lib/voice";

const VOICE_LANGUAGE_STORAGE_KEY = "orca-voice-language";
const READ_ALOUD_STORAGE_KEY = "orca-read-aloud";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  isStreaming: boolean;
  currentTrace?: TraceEntry[];
}

const DEMO_QUICK_PROMPTS = [
  {
    label: "Can I go fishing near Mangaluru tomorrow at 6 AM?",
    query: "Can I go fishing near Mangaluru tomorrow at 6 AM?",
    iconType: "fish" as const,
  },
  {
    label: "What if I leave at 11 AM instead?",
    query: "What if I leave at 11 AM instead?",
    iconType: "clock" as const,
  },
  {
    label: "Where is the nearest fishing zone near Kochi?",
    query: "Where is the nearest fishing zone near Kochi?",
    iconType: "compass" as const,
  },
  {
    label: "Any cyclone or lightning alerts near Mangaluru?",
    query: "Any cyclone or lightning alerts near Mangaluru?",
    iconType: "zap" as const,
  },
];

const SUGGESTED_LOCATIONS = [
  "Mangaluru Coast",
  "Kochi Fishing Harbour",
  "Veraval Port",
  "Visakhapatnam",
  "Chennai Coast",
];

type MessageKind = "clarification" | "error" | "answer";

function getMessageKind(msg: ChatMessage): MessageKind {
  if (msg.is_error || msg.message_type === "error") return "error";
  const text = msg.content.toLowerCase();
  if (
    text.includes("something went wrong") ||
    text.includes("unable to complete") ||
    text.includes("unable to process") ||
    text.includes("failed to") ||
    text.includes("error:")
  ) {
    return "error";
  }
  if (msg.message_type === "clarification") return "clarification";
  if (!msg.risk && (!msg.evidence || msg.evidence.length === 0)) {
    if (
      msg.content.includes("?") ||
      text.includes("need a location") ||
      text.includes("which coast") ||
      text.includes("which port") ||
      text.includes("coordinates") ||
      text.includes("specify")
    ) {
      return "clarification";
    }
  }
  return "answer";
}

function getAgentStreamingStatus(trace?: TraceEntry[]): string {
  if (!trace || trace.length === 0) {
    return "Initializing LangGraph multi-agent pipeline...";
  }
  const last = trace[trace.length - 1];
  switch (last.agent) {
    case "planner":
      return "Planner agent building orchestration DAG...";
    case "geospatial":
      return "Geospatial agent resolving sector coordinates & bathymetry...";
    case "weather":
      return "Weather agent fetching INCOIS ocean forecast & IMD warnings...";
    case "risk":
      return "Risk engine calculating wave, wind, and safety scores...";
    case "ocean_analytics":
      return "Ocean analytics agent auditing ISRO SST & chlorophyll data...";
    case "reporting":
      return "Reporting agent synthesizing grounded marine advisory...";
    default:
      return `Agent ${last.agent} executing step #${trace.length}...`;
  }
}

export function ChatPanel({
  messages,
  onSend,
  isStreaming,
  currentTrace,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [showEvidenceFor, setShowEvidenceFor] = useState<number | null>(null);
  const [voiceLanguage, setVoiceLanguage] = useState<LanguageOption>(DEFAULT_LANGUAGE);
  const [readAloud, setReadAloud] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSpokenIndexRef = useRef(-1);

  // Auto-scroll when messages update or during streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, currentTrace]);

  // Restore per-viewer voice preferences (mic language, read-aloud toggle).
  // Deliberately deferred to a mount-only effect rather than a useState lazy
  // initializer: reading localStorage during the first render would return
  // different values on the server (unavailable) vs. the client, causing a
  // hydration mismatch. Restoring after mount keeps first paint SSR-safe.
  useEffect(() => {
    try {
      const savedLangName = localStorage.getItem(VOICE_LANGUAGE_STORAGE_KEY);
      const match = SUPPORTED_LANGUAGES.find((l) => l.name === savedLangName);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (match) setVoiceLanguage(match);
      if (localStorage.getItem(READ_ALOUD_STORAGE_KEY) === "true") setReadAloud(true);
    } catch {
      // Private browsing / blocked storage -- fall back to defaults.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VOICE_LANGUAGE_STORAGE_KEY, voiceLanguage.name);
    } catch {
      // ignore
    }
  }, [voiceLanguage]);

  useEffect(() => {
    try {
      localStorage.setItem(READ_ALOUD_STORAGE_KEY, String(readAloud));
    } catch {
      // ignore
    }
  }, [readAloud]);

  // Read the latest assistant answer aloud, in the language it was actually
  // written in (its own response_language), not the mic's input language.
  useEffect(() => {
    if (!readAloud) return;
    const lastIndex = messages.length - 1;
    if (lastIndex < 0 || lastIndex === lastSpokenIndexRef.current) return;
    const last = messages[lastIndex];
    lastSpokenIndexRef.current = lastIndex;
    if (last.role === "assistant" && last.content) {
      speak(last.content, bcp47ForLanguageName(last.response_language));
    }
  }, [messages, readAloud]);

  function handlePromptClick(query: string) {
    if (isStreaming) return;
    onSend(query);
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── DEMO SCENARIO QUICK PROMPT BAR (High Contrast & Spacing) ── */}
      <div className="px-4 py-3 bg-card border-b border-border shadow-2xs shrink-0">
        <div className="flex items-center justify-between mb-2 gap-2">
          <span className="text-micro font-bold text-muted-foreground uppercase">
            Verified Demo Scenarios
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-1.5 py-1">
              <Languages className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <select
                aria-label="Voice input language"
                value={voiceLanguage.name}
                onChange={(e) => {
                  const match = SUPPORTED_LANGUAGES.find((l) => l.name === e.target.value);
                  if (match) setVoiceLanguage(match);
                }}
                className="bg-transparent text-[11px] font-medium text-foreground/80 focus:outline-none"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.name} value={l.name}>
                    {l.nativeName}
                  </option>
                ))}
              </select>
            </div>
            {isSpeechSynthesisSupported() && (
              <button
                type="button"
                onClick={() => setReadAloud((v) => !v)}
                aria-pressed={readAloud}
                aria-label={readAloud ? "Disable reading answers aloud" : "Read answers aloud"}
                title={readAloud ? "Reading answers aloud" : "Read answers aloud"}
                className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${
                  readAloud
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {readAloud ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEMO_QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handlePromptClick(p.query)}
              disabled={isStreaming}
              className="group text-xs px-3 py-1.5 rounded-xl bg-secondary hover:bg-primary text-secondary-foreground hover:text-primary-foreground border border-border hover:border-primary font-medium transition-all shadow-2xs hover:shadow-xs disabled:opacity-50 text-left flex items-center gap-1.5"
            >
              <span className="opacity-80 group-hover:opacity-100">
                {p.iconType === "fish" && <Fish className="w-3.5 h-3.5" />}
                {p.iconType === "clock" && <Clock className="w-3.5 h-3.5" />}
                {p.iconType === "compass" && <Compass className="w-3.5 h-3.5" />}
                {p.iconType === "zap" && <Zap className="w-3.5 h-3.5" />}
              </span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CHAT MESSAGES LOG ── */}
      <div className="flex-1 overflow-y-auto space-y-5 p-4 sm:p-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[340px] text-center p-6 sm:p-8 bg-card rounded-3xl border border-border shadow-2xs my-auto">
            <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3.5 shadow-md ring-4 ring-secondary">
              <Waves className="w-6 h-6 text-sky-400" />
            </div>
            <h3 className="text-title text-foreground">
              ORCA Marine Reasoning Assistant
            </h3>
            <p className="text-caption text-muted-foreground max-w-md mx-auto mt-1.5">
              Ask natural-language marine safety, fishing advisories, or coastal weather queries. Every assessment is grounded in official <strong>INCOIS</strong> ocean forecasts, <strong>IMD</strong> meteorological warnings, and <strong>ISRO</strong> satellite telemetry.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground font-medium">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary border border-border">
                <Check className="w-3 h-3" /> Wave & Swell Heights
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary border border-border">
                <Check className="w-3 h-3" /> Potential Fishing Zones (PFZ)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary border border-border">
                <Check className="w-3 h-3" /> Cyclone & Lightning Alerts
              </span>
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          if (m.role === "user") {
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springs.default}
                className="text-right flex justify-end"
              >
                <div className="inline-block max-w-[85%] rounded-2xl rounded-tr-xs px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium shadow-xs leading-relaxed text-left">
                  {m.content}
                </div>
              </motion.div>
            );
          }

          const kind = getMessageKind(m);

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springs.default}
              className="text-left space-y-3 max-w-3xl"
            >
              {/* 1. HERO RECOMMENDATION CARD (If risk assessment is available) */}
              {m.risk && (
                <RecommendationHero
                  risk={m.risk}
                  verification={m.verification}
                  sources={m.verification?.sources || ["INCOIS", "IMD", "ISRO/MOSDAC"]}
                  location={m.location}
                  evidence={m.evidence}
                />
              )}

              {/* 2. WHAT-IF DEPARTURE COMPARISON */}
              {m.what_if && <WhatIfCard comparison={m.what_if} />}

              {/* 3. VISUALLY DIFFERENTIATED MESSAGE CARDS */}
              {kind === "clarification" && (
                <div className="p-4 sm:p-5 rounded-2xl bg-secondary border border-border text-foreground shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground/80">
                    <span className="w-5 h-5 rounded-md bg-card border border-border flex items-center justify-center text-xs shadow-2xs">
                      <MapPin className="w-3.5 h-3.5" />
                    </span>
                    <span>Location / Query Clarification Needed</span>
                  </div>
                  <div className="text-body font-medium">
                    <MarkdownContent content={m.content} />
                  </div>
                  {/* Quick suggested coastal areas */}
                  <div className="pt-2 border-t border-border flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground font-semibold mr-1">
                      Quick select:
                    </span>
                    {SUGGESTED_LOCATIONS.map((loc, lIdx) => (
                      <button
                        key={lIdx}
                        onClick={() => handlePromptClick(`Is it safe to go fishing near ${loc}?`)}
                        disabled={isStreaming}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-card hover:bg-primary text-foreground/80 hover:text-primary-foreground border border-border font-medium transition-colors shadow-2xs"
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {kind === "error" && (
                <div className="p-4 sm:p-5 rounded-2xl bg-danger/10 border border-danger/30 text-foreground shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-danger">
                    <span className="w-5 h-5 rounded-md bg-danger/15 border border-danger/30 flex items-center justify-center text-xs shadow-2xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-danger" />
                    </span>
                    <span>Telemetry Processing Notice</span>
                  </div>
                  <div className="text-sm font-medium leading-relaxed text-foreground">
                    {m.content}
                  </div>
                  <p className="text-xs text-danger/90 leading-normal">
                    ORCA could not complete the multi-agent pipeline for this request. Please verify that the coastal coordinates or harbour name are within Indian waters, or retry your query.
                  </p>
                </div>
              )}

              {kind === "answer" && (
                <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border text-foreground shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-border text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-foreground/80">
                      <Check className="w-3.5 h-3.5" />
                      <span>Synthesized Marine Advisory</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      INCOIS · IMD Grounded
                    </span>
                  </div>
                  <div className="text-body text-foreground/90 font-normal">
                    <MarkdownContent content={m.content} />
                  </div>
                </div>
              )}

              {/* 4. GROUNDING EVIDENCE ACCORDION */}
              {m.evidence && m.evidence.length > 0 && (
                <div className="pt-1">
                  <button
                    onClick={() => setShowEvidenceFor(showEvidenceFor === i ? null : i)}
                    className="text-xs text-foreground/80 font-semibold hover:text-foreground underline underline-offset-3 flex items-center gap-1.5 transition-colors"
                  >
                    {showEvidenceFor === i ? (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span>
                      {showEvidenceFor === i ? "Hide" : "Show"} Grounding Evidence & Observations ({m.evidence.length} metrics)
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {showEvidenceFor === i && (
                      <motion.div
                        key="evidence"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={springs.sheet}
                        className="overflow-hidden"
                      >
                        <div className="mt-2.5">
                          <EvidencePanel evidence={m.evidence} verification={m.verification} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* ── LOADING & PIPELINE TYPING INDICATOR ── */}
        {isStreaming && (
          <div className="space-y-3 max-w-3xl">
            <RecommendationHero isLoading={true} />
            <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs flex items-center gap-3">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary border border-border shrink-0">
                <span className="w-2 h-2 rounded-full bg-foreground/70 animate-wave-dot-1" />
                <span className="w-2 h-2 rounded-full bg-foreground/70 animate-wave-dot-2" />
                <span className="w-2 h-2 rounded-full bg-foreground/70 animate-wave-dot-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">
                  {getAgentStreamingStatus(currentTrace)}
                </div>
                <div className="text-[10px] text-muted-foreground/70 font-mono">
                  LangGraph Orchestration · Live Evidence Synthesis
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── ANIMATED SPRING PROMPT INPUT (Cubic-Bezier Physics & Fluid Morphing) ── */}
      <div className="p-3 sm:p-4 bg-transparent shrink-0 flex items-center justify-center">
        <PromptInput
          value={input}
          onChange={setInput}
          onSubmit={(val) => {
            if (!val.trim() || isStreaming) return;
            onSend(val.trim());
            setInput("");
          }}
          placeholder="Ask e.g. 'Can I fish near Mangaluru tomorrow at 6 AM?'"
          className="max-w-full mx-auto"
          lang={voiceLanguage.bcp47}
        />
      </div>
    </div>
  );
}
