// frontend/components/RegionScanCard.tsx
"use client";

import React from "react";
import { Thermometer, Leaf } from "lucide-react";
import { RegionScan } from "@/lib/types";

interface RegionScanCardProps {
  scan: RegionScan;
}

const LIKELIHOOD_STYLE: Record<string, string> = {
  high: "bg-emerald-50 border-emerald-200 text-emerald-800",
  moderate: "bg-amber-50 border-amber-200 text-amber-800",
  low: "bg-slate-50 border-slate-200 text-slate-600",
  unknown: "bg-slate-50 border-slate-200 text-slate-400",
};

export function RegionScanCard({ scan }: RegionScanCardProps) {
  const { regions, favorable_count } = scan;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 sm:p-5 mb-4">
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-emerald-600" />
          <h4 className="text-sm font-bold text-slate-900">Regional PFZ Hotspot Scan</h4>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${
            favorable_count > 0
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-slate-100 text-slate-800 border-slate-300"
          }`}
        >
          {favorable_count > 0 ? `${favorable_count} Favorable Region${favorable_count > 1 ? "s" : ""}` : "None Currently Favorable"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
        {regions.map((r) => (
          <div
            key={r.region}
            className={`p-2.5 rounded-xl border ${LIKELIHOOD_STYLE[r.pfz_likelihood] ?? LIKELIHOOD_STYLE.unknown}`}
          >
            <div className="text-[11px] font-semibold opacity-80">
              {r.region} &middot; {r.distance_km}km
            </div>
            <div className="text-xs font-bold mt-0.5 uppercase">{r.pfz_likelihood}</div>
            {r.sst_celsius != null && r.chlorophyll_mg_m3 != null && (
              <div className="text-[10px] mt-1 flex items-center gap-2 font-mono">
                <span className="inline-flex items-center gap-0.5">
                  <Thermometer className="w-2.5 h-2.5" /> {r.sst_celsius}°C
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <Leaf className="w-2.5 h-2.5" /> {r.chlorophyll_mg_m3} mg/m³
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
