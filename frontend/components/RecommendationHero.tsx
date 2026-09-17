// frontend/components/RecommendationHero.tsx
"use client";

import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Compass, Check } from "lucide-react";
import {
  RiskAssessment,
  VerificationResult,
  CanonicalLocation,
  MarineParameter,
  DataStatus,
} from "@/lib/types";
import { STATUS_THEMES } from "@/lib/theme";
import { springs } from "@/lib/motion";

export interface RecommendationHeroProps {
  risk?: RiskAssessment | null;
  verification?: VerificationResult | null;
  sources?: string[];
  location?: CanonicalLocation | null;
  evidence?: MarineParameter[] | null;
  timestamp?: string | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

// Strict Apple-style monochrome (Black & White) design tokens — these use
// --primary/--secondary rather than raw black/white so HIGH/EXTREME's
// "black badge" correctly inverts to a white-on-dark badge in dark mode.
const RISK_THEMES = {
  LOW: {
    label: "LOW",
    badgeBg: "bg-secondary",
    badgeText: "text-secondary-foreground",
    badgeBorder: "border-border",
    dot: "bg-muted-foreground",
    gauge: "bg-muted-foreground",
    accent: "text-foreground/80",
    headline: "text-foreground",
  },
  MODERATE: {
    label: "MODERATE",
    badgeBg: "bg-secondary",
    badgeText: "text-secondary-foreground",
    badgeBorder: "border-border",
    dot: "bg-foreground/70",
    gauge: "bg-foreground/70",
    accent: "text-foreground",
    headline: "text-foreground",
  },
  HIGH: {
    label: "HIGH",
    badgeBg: "bg-primary",
    badgeText: "text-primary-foreground",
    badgeBorder: "border-primary",
    dot: "bg-primary-foreground",
    gauge: "bg-primary",
    accent: "text-foreground",
    headline: "text-foreground",
  },
  EXTREME: {
    label: "EXTREME",
    badgeBg: "bg-primary",
    badgeText: "text-primary-foreground",
    badgeBorder: "border-primary",
    dot: "bg-primary-foreground",
    gauge: "bg-primary",
    accent: "text-foreground",
    headline: "text-foreground",
  },
} as const;

/**
 * Format timestamp into Apple editorial date/time: e.g. "16 Sep · 06:00"
 */
function formatEditorialDate(rawTimestamp?: string | null): string {
  if (!rawTimestamp) {
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleString("en-US", { month: "short" });
    const hours = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    return `${day} ${month} · ${hours}:${mins}`;
  }

  // If already a time string like "06:00" or "06:00 AM"
  if (/^\d{1,2}:\d{2}/.test(rawTimestamp.trim())) {
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleString("en-US", { month: "short" });
    return `${day} ${month} · ${rawTimestamp.trim()}`;
  }

  try {
    const d = new Date(rawTimestamp);
    if (isNaN(d.getTime())) return rawTimestamp;
    const day = d.getDate();
    const month = d.toLocaleString("en-US", { month: "short" });
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} · ${hours}:${mins}`;
  } catch {
    return rawTimestamp;
  }
}

/**
 * Resolve clean display location name without city hardcoding.
 */
function resolveLocationLabel(
  loc?: CanonicalLocation | null,
  evidence?: MarineParameter[] | null
): string {
  if (loc?.display_name && loc.display_name.trim().length > 0) {
    // If it contains a full address with commas, take the primary place and district/state
    const parts = loc.display_name.split(",").map((s) => s.trim());
    if (parts.length > 2) {
      return `${parts[0]}, ${parts[1]}`;
    }
    return loc.display_name;
  }

  if (loc?.nearest_coastal_name) {
    const sector = loc.nearest_coastal_sector ? ` (${loc.nearest_coastal_sector})` : "";
    return `${loc.nearest_coastal_name}${sector}`;
  }

  const lat = loc?.latitude ?? loc?.lat;
  const lon = loc?.longitude ?? loc?.lon;
  if (typeof lat === "number" && typeof lon === "number") {
    return `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;
  }

  if (evidence && evidence.length > 0) {
    const p = evidence[0];
    if (typeof p.latitude === "number" && typeof p.longitude === "number") {
      return `${p.latitude.toFixed(2)}°N, ${p.longitude.toFixed(2)}°E`;
    }
  }

  return "Coastal Sector";
}

/**
 * Editorial formatted list of supporting marine factors
 */
interface FormattedFactor {
  label: string;
  value: string;
}

function extractSupportingFactors(
  risk: RiskAssessment,
  evidence?: MarineParameter[] | null
): FormattedFactor[] {
  const items: FormattedFactor[] = [];

  // 1. Prefer structured parameters if available
  if (evidence && evidence.length > 0) {
    const findParam = (name: string) =>
      evidence.find((p) => p.parameter === name && p.value !== null && p.value !== undefined);

    const wave = findParam("significant_wave_height");
    if (wave && wave.value !== null) {
      items.push({
        label: "Significant wave height",
        value: `${Number(wave.value).toFixed(1)} m`,
      });
    }

    const wind = findParam("wind_speed");
    if (wind && wind.value !== null) {
      items.push({
        label: "Wind speed",
        value: `${Number(wind.value).toFixed(1)} km/h`,
      });
    }

    const warning =
      findParam("weather_warning_level") || findParam("port_warning_signal");
    if (warning && warning.value) {
      const valStr = String(warning.value);
      const isClean = valStr.toLowerCase() === "green" || valStr.toLowerCase() === "none";
      items.push({
        label: "Coastal warning",
        value: isClean ? "None (Normal)" : `Active (${valStr})`,
      });
    }

    const current = findParam("surface_current_speed");
    if (current && current.value !== null) {
      items.push({
        label: "Surface current",
        value: `${Number(current.value).toFixed(2)} m/s`,
      });
    }

    const swell = findParam("swell_height");
    if (swell && swell.value !== null && items.length < 4) {
      items.push({
        label: "Swell wave height",
        value: `${Number(swell.value).toFixed(1)} m`,
      });
    }
  }

  // 2. If structured evidence was absent or sparse, parse from risk.factors
  if (items.length === 0 && risk.factors && risk.factors.length > 0) {
    for (const factor of risk.factors.slice(0, 4)) {
      // Clean up technical point additions like "(+30)" or "(+18)"
      const cleaned = factor.replace(/\s*\(\+\d+\)/g, "").trim();

      // Check for common metric patterns
      if (/wave height/i.test(cleaned)) {
        const m = cleaned.match(/([\d.]+\s*m)/i);
        items.push({
          label: "Significant wave height",
          value: m ? m[1] : cleaned,
        });
      } else if (/wind speed|gale|coastal wind/i.test(cleaned)) {
        const m = cleaned.match(/([\d.]+\s*km\/h)/i);
        items.push({
          label: "Wind speed",
          value: m ? m[1] : cleaned,
        });
      } else if (/warning|cyclone|lightning/i.test(cleaned)) {
        items.push({
          label: "Coastal warning",
          value: cleaned.replace(/^active\s+/i, "Active — "),
        });
      } else if (/current|drift/i.test(cleaned)) {
        const m = cleaned.match(/([\d.]+\s*m\/s)/i);
        items.push({
          label: "Surface current",
          value: m ? m[1] : cleaned,
        });
      } else {
        // Generic fallback split
        const parts = cleaned.split(" — ");
        if (parts.length === 2) {
          items.push({ label: parts[0], value: parts[1] });
        } else {
          items.push({ label: cleaned, value: "Recorded" });
        }
      }
    }
  }

  // If still empty, supply clean baseline indicators
  if (items.length === 0) {
    items.push({ label: "Significant wave height", value: "Normal range" });
    items.push({ label: "Wind speed", value: "Favorable" });
    items.push({ label: "Coastal warning", value: "None" });
  }

  return items;
}

export function RecommendationHero({
  risk,
  verification,
  sources = ["INCOIS", "IMD", "ISRO/MOSDAC"],
  location,
  evidence,
  timestamp,
  isLoading = false,
  error = null,
  onRetry,
}: RecommendationHeroProps) {
  const crossfade = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: springs.default,
  };

  // ── 1. LOADING SKELETON STATE ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="loading"
          {...crossfade}
          data-testid="recommendation-hero-loading"
          className="rounded-3xl bg-card border border-border shadow-[0_2px_16px_rgba(0,0,0,0.03)] p-6 sm:p-7 mb-5 animate-pulse"
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="h-3.5 w-24 bg-muted rounded-full" />
            <div className="h-5 w-16 bg-muted rounded-full" />
          </div>

          {/* Big Recommendation Headline Skeleton */}
          <div className="h-8 sm:h-9 w-3/4 bg-muted rounded-xl mb-6" />

          {/* Metrics Grid Skeleton */}
          <div className="grid grid-cols-2 gap-4 pb-5 border-b border-border">
            <div className="p-3.5 bg-muted/60 rounded-2xl">
              <div className="h-3 w-16 bg-muted rounded mb-2" />
              <div className="h-7 w-24 bg-muted rounded" />
            </div>
            <div className="p-3.5 bg-muted/60 rounded-2xl">
              <div className="h-3 w-20 bg-muted rounded mb-2" />
              <div className="h-7 w-20 bg-muted rounded" />
            </div>
          </div>

          {/* Supporting Evidence Skeleton */}
          <div className="py-4 space-y-2.5 border-b border-border">
            <div className="h-3 w-40 bg-muted rounded mb-3" />
            <div className="h-3.5 w-56 bg-muted rounded" />
            <div className="h-3.5 w-48 bg-muted rounded" />
            <div className="h-3.5 w-52 bg-muted rounded" />
          </div>

          {/* Metadata Footer Skeleton */}
          <div className="pt-4 flex items-center justify-between">
            <div className="h-3 w-32 bg-muted rounded" />
            <div className="h-5 w-20 bg-muted rounded-full" />
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── 2. ERROR STATE ────────────────────────────────────────────────────────
  if (error) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="error"
          {...crossfade}
          data-testid="recommendation-hero-error"
          className="rounded-3xl bg-card border border-border shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-6 sm:p-7 mb-5 text-left"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-secondary text-foreground flex items-center justify-center shrink-0 text-lg font-bold border border-border">
              !
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-micro font-semibold uppercase text-muted-foreground">
                Marine Telemetry Unavailable
              </span>
              <h3 className="text-title text-foreground mt-0.5">
                Could not compute marine risk recommendation
              </h3>
              <p className="text-caption text-muted-foreground mt-1">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-3.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-xs"
                >
                  Retry Analysis
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── 3. POLISHED EMPTY STATE ───────────────────────────────────────────────
  if (!risk) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="empty"
          {...crossfade}
          data-testid="recommendation-hero-empty"
          className="rounded-3xl bg-card border border-border shadow-[0_2px_16px_rgba(0,0,0,0.03)] p-6 sm:p-7 mb-5 text-center"
        >
          <div className="w-11 h-11 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-3 text-muted-foreground shadow-xs">
            <Compass className="w-5 h-5" />
          </div>
          <span className="text-micro font-semibold uppercase text-muted-foreground">
            Marine Ecosystem Reasoning
          </span>
          <h3 className="text-title text-foreground mt-1 mb-1.5">
            Select a coastal coordinate or enter a query
          </h3>
          <p className="text-caption text-muted-foreground max-w-md mx-auto">
            ORCA synthesizes INCOIS ocean forecasts, IMD meteorological warnings, and
            ISRO satellite observations into verifiable departure recommendations.
          </p>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── 4. ACTIVE RECOMMENDATION HERO ─────────────────────────────────────────
  const { risk_score, risk_level, recommendation, confidence } = risk;
  const theme = RISK_THEMES[risk_level] || RISK_THEMES.MODERATE;

  // Normalized data status (strict definition: LIVE | FORECAST | CACHED | HISTORICAL)
  const rawStatus = (verification?.data_status || "FORECAST").toUpperCase();
  const validStatus = (
    ["LIVE", "FORECAST", "CACHED", "HISTORICAL"].includes(rawStatus)
      ? rawStatus
      : "FORECAST"
  ) as DataStatus;
  const statusTheme = STATUS_THEMES[validStatus] || STATUS_THEMES.FORECAST;

  // Location display
  const locationLabel = resolveLocationLabel(location, evidence);

  // Time display
  const targetTime =
    timestamp ||
    (evidence && evidence.length > 0 ? evidence[0].timestamp : null) ||
    null;
  const formattedTime = formatEditorialDate(targetTime);

  // Factors
  const factors = extractSupportingFactors(risk, evidence);

  // Proximity to forecast grid
  const gridDistance =
    location?.grid_distance_km ??
    (evidence && evidence[0]?.grid_distance_km ? evidence[0].grid_distance_km : null);
  const gridLabel =
    typeof gridDistance === "number"
      ? `${gridDistance.toFixed(1)} km from nearest forecast grid`
      : location?.distance_to_coast_km != null
      ? `${location.distance_to_coast_km.toFixed(1)} km offshore`
      : "Within Indian coastal grid coverage";

  // Sources string
  const activeSources =
    sources && sources.length > 0 ? sources : ["INCOIS", "IMD", "ISRO/MOSDAC"];
  const sourcesLabel = activeSources.join(" · ");

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="content"
        {...crossfade}
        data-testid="recommendation-hero"
        className="rounded-3xl bg-card border border-border shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-6 sm:p-7 mb-4 transition-shadow duration-300 text-left font-sans select-text"
      >
        {/* ── TOP EYEBROW + RISK PILL ── */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <span className="text-micro font-semibold uppercase text-muted-foreground">
            [ Marine Risk ]
          </span>
          <div
            data-testid="risk-badge"
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold tracking-wide ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
            <span>{theme.label}</span>
          </div>
        </div>

        {/* ── PRIMARY RECOMMENDATION (Visually Dominates) ── */}
        <h2
          data-testid="primary-recommendation"
          className="text-display text-foreground mb-5"
        >
          {recommendation}
        </h2>

        {/* ── METRICS: RISK SCORE & CONFIDENCE ── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-muted/50 border border-border">
          {/* Risk Stat */}
          <div className="flex flex-col justify-between">
            <span className="text-micro font-medium uppercase text-muted-foreground">
              Risk Index
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                data-testid="risk-score-value"
                className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono"
              >
                {risk_score}
              </span>
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">/ 100</span>
            </div>
            {/* Subtle micro gauge */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${theme.gauge}`}
                style={{ width: `${Math.min(100, Math.max(4, risk_score))}%` }}
              />
            </div>
          </div>

          {/* Confidence Stat */}
          <div className="flex flex-col justify-between border-l border-border pl-3.5 sm:pl-4">
            <span className="text-micro font-medium uppercase text-muted-foreground">
              Confidence
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                data-testid="confidence-value"
                className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono"
              >
                {Math.round(confidence * 100)}%
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-2 font-medium tracking-wide inline-flex items-center gap-1">
              {verification?.is_verified ? (
                <>
                  Provenance Verified <Check className="w-3 h-3 text-foreground/70" />
                </>
              ) : (
                "Cross-Grounded"
              )}
            </span>
          </div>
        </div>

        {/* ── DIVIDER ── */}
        <div className="h-px bg-border my-5" />

        {/* ── WHY ORCA RECOMMENDS THIS ── */}
        <div>
          <h3 className="text-micro font-semibold text-muted-foreground uppercase mb-3">
            Why ORCA recommends this
          </h3>
          <ul className="space-y-2 text-body text-foreground/90">
            {factors.map((factor, idx) => (
              <li
                key={idx}
                className="flex items-baseline gap-2.5 text-caption"
              >
                <span className="text-muted-foreground/60 font-semibold select-none">•</span>
                <span className="font-medium text-foreground/90">{factor.label}</span>
                <span className="text-muted-foreground font-normal">—</span>
                <span className="font-semibold text-foreground/90">{factor.value}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── DIVIDER ── */}
        <div className="h-px bg-border my-5" />

        {/* ── METADATA FOOTER (Quiet, Apple-style metadata) ── */}
        <div className="space-y-2 text-caption text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Location & Time */}
            <div className="flex items-center gap-2 font-medium text-foreground/80">
              <span data-testid="hero-location" className="font-semibold">
                {locationLabel}
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span data-testid="hero-timestamp" className="text-muted-foreground">
                {formattedTime}
              </span>
            </div>

            {/* Status Badge: Apple-style quiet pill */}
            <div
              data-testid="data-status-badge"
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusTheme.bg} ${statusTheme.text} ${statusTheme.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusTheme.dot}`} />
              <span>{statusTheme.label}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground/70">
            {/* Sources Attribution */}
            <span data-testid="hero-sources" className="tracking-wide">
              {sourcesLabel}
            </span>

            {/* Forecast Grid Proximity */}
            <span data-testid="hero-grid-distance" className="font-mono text-muted-foreground/70">
              {gridLabel}
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
