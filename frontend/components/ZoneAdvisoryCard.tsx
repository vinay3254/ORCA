// frontend/components/ZoneAdvisoryCard.tsx
"use client";

import React from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { ZoneAdvisory } from "@/lib/types";

interface ZoneAdvisoryCardProps {
  advisory: ZoneAdvisory;
}

export function ZoneAdvisoryCard({ advisory }: ZoneAdvisoryCardProps) {
  const { zones, avoid_count } = advisory;
  const allSafe = avoid_count === 0;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 sm:p-5 mb-4">
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {allSafe ? (
            <ShieldCheck className="w-4 h-4 text-slate-700" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-red-600" />
          )}
          <h4 className="text-sm font-bold text-slate-900">Nearby Zone Advisory</h4>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${
            allSafe
              ? "bg-slate-100 text-slate-800 border-slate-300"
              : "bg-red-600 text-white border-red-600"
          }`}
        >
          {allSafe ? "All Nearby Zones Clear" : `${avoid_count} Zone${avoid_count > 1 ? "s" : ""} Flagged`}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
        {zones.map((z) => (
          <div
            key={z.zone}
            className={`p-2.5 rounded-xl border ${
              z.verdict === "avoid"
                ? "bg-red-50 border-red-200"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-500">
              {z.zone} &middot; {z.distance_km}km
            </div>
            <div
              className={`text-xs font-bold mt-0.5 ${
                z.verdict === "avoid" ? "text-red-700" : "text-slate-800"
              }`}
            >
              {z.risk_level} ({z.risk_score}/100)
            </div>
            {z.verdict === "avoid" && z.reasons[0] && (
              <div className="text-[10px] text-red-700/90 mt-1 leading-snug">{z.reasons[0]}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
