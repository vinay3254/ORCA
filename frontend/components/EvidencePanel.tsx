// frontend/components/EvidencePanel.tsx
"use client";

import React from "react";
import { BarChart3, Check } from "lucide-react";
import { MarineParameter, VerificationResult, DataStatus } from "@/lib/types";
import { STATUS_THEMES } from "@/lib/theme";

interface EvidencePanelProps {
  evidence: MarineParameter[];
  verification?: VerificationResult | null;
}

const PARAM_FORMAT_MAP: Record<string, string> = {
  significant_wave_height: "Significant Wave Height",
  wave_period: "Mean Wave Period",
  swell_height: "Swell Wave Height",
  swell_period: "Swell Peak Period",
  wind_speed: "Wind Speed (10m)",
  wind_direction: "Wind Direction",
  surface_current_speed: "Surface Current Velocity",
  surface_current_direction: "Surface Current Direction",
  sst: "Sea Surface Temperature",
  satellite_sst: "Satellite Blended SST",
  chlorophyll: "Chlorophyll-a Concentration",
  diffuse_attenuation_kd490: "Diffuse Attenuation (Kd490)",
  total_suspended_matter: "Total Suspended Matter",
  weather_warning_level: "Weather Warning Advisory",
  rainfall_forecast: "24h Rainfall Forecast",
  port_warning_signal: "Port Cautionary Signal",
};

export function EvidencePanel({ evidence, verification }: EvidencePanelProps) {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="p-4 text-caption text-muted-foreground italic">
        No structured marine evidence available for this turn.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 sm:p-5 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-foreground/80" />
          <h4 className="text-body font-bold text-foreground/90">
            Grounding Evidence & Observation Audit
          </h4>
        </div>
        <div className="text-caption text-muted-foreground font-medium">
          {evidence.length} verified metrics |{" "}
          <span className="text-foreground/80 font-semibold inline-flex items-center gap-1">
            {verification?.is_verified ? (
              <>
                Provenance Audited <Check className="w-3 h-3 inline" />
              </>
            ) : (
              "Baseline Grounded"
            )}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto my-2">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2 px-2.5">Parameter</th>
              <th className="py-2 px-2.5">Observed Value</th>
              <th className="py-2 px-2.5">Source</th>
              <th className="py-2 px-2.5">Status</th>
              <th className="py-2 px-2.5">Valid Window</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {evidence.map((item, idx) => {
              const label = PARAM_FORMAT_MAP[item.parameter] || item.parameter;
              const valStr =
                typeof item.value === "number"
                  ? `${item.value.toFixed(1)} ${item.unit}`.trim()
                  : `${item.value} ${item.unit}`.trim();
              const badgeTheme =
                STATUS_THEMES[item.data_status as DataStatus] || STATUS_THEMES.FORECAST;

              return (
                <tr key={idx} className="hover:bg-muted/50 transition-colors">
                  <td className="py-2 px-2.5 font-medium text-foreground/90">
                    {label}
                  </td>
                  <td className="py-2 px-2.5 font-mono font-bold text-foreground">
                    {valStr}
                  </td>
                  <td className="py-2 px-2.5 text-muted-foreground font-medium">
                    {item.source}
                  </td>
                  <td className="py-2 px-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeTheme.bg} ${badgeTheme.text} ${badgeTheme.border}`}
                    >
                      {item.data_status}
                    </span>
                  </td>
                  <td className="py-2 px-2.5 text-[11px] font-mono text-muted-foreground">
                    {item.valid_from && item.valid_until
                      ? `${item.valid_from.substring(11, 16)} - ${item.valid_until.substring(11, 16)} UTC`
                      : item.timestamp
                        ? item.timestamp.substring(0, 16).replace("T", " ")
                        : "Current"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {verification?.checks_passed && verification.checks_passed.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          {verification.checks_passed.map((chk, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-muted-foreground">
              <Check className="w-3 h-3 inline" /> {chk}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
