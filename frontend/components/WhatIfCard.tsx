// frontend/components/WhatIfCard.tsx
"use client";

import React from "react";
import { Clock, TrendingDown, TrendingUp } from "lucide-react";
import { WhatIfComparison } from "@/lib/types";

interface WhatIfCardProps {
  comparison: WhatIfComparison;
}

export function WhatIfCard({ comparison }: WhatIfCardProps) {
  const {
    original_time,
    original_risk_score,
    original_risk_level,
    alternative_time,
    alternative_risk_score,
    alternative_risk_level,
    differences,
    verdict,
  } = comparison;

  const scoreDelta = alternative_risk_score - original_risk_score;
  const isSafer = scoreDelta < 0;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 sm:p-5 mb-4">
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-700" />
          <h4 className="text-sm font-bold text-slate-900">
            What-If Departure Comparison
          </h4>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold inline-flex items-center gap-1 ${
            isSafer
              ? "bg-slate-100 text-slate-800 border-slate-300"
              : "bg-black text-white border-black"
          }`}
        >
          {isSafer ? (
            <>
              <TrendingDown className="w-3 h-3" /> {Math.abs(scoreDelta)} pts Risk Reduction
            </>
          ) : (
            <>
              <TrendingUp className="w-3 h-3" /> {scoreDelta} pts Risk Increase
            </>
          )}
        </span>
      </div>

      {/* Comparison Badges */}
      <div className="grid grid-cols-2 gap-3 my-3">
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] text-slate-500 font-medium">Original Departure:</div>
          <div className="text-base font-bold text-slate-800">
            {original_time}
          </div>
          <div className="text-xs font-semibold text-slate-600 mt-0.5">
            Risk: {original_risk_score} ({original_risk_level})
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] text-slate-500 font-medium">Alternative Departure:</div>
          <div className="text-base font-bold text-slate-800">
            {alternative_time}
          </div>
          <div
            className={`text-xs font-semibold mt-0.5 ${
              isSafer ? "text-slate-900" : "text-red-600"
            }`}
          >
            Risk: {alternative_risk_score} ({alternative_risk_level})
          </div>
        </div>
      </div>

      {/* Parameter Differences Table */}
      {differences && differences.length > 0 && (
        <div className="overflow-x-auto my-2">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500">
                <th className="py-1 px-2 font-medium">Parameter</th>
                <th className="py-1 px-2 font-medium">{original_time}</th>
                <th className="py-1 px-2 font-medium">{alternative_time}</th>
                <th className="py-1 px-2 font-medium">Change</th>
                <th className="py-1 px-2 font-medium">Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {differences.map((diff, i) => (
                <tr key={i} className="text-slate-700">
                  <td className="py-1.5 px-2 font-medium">{diff.parameter}</td>
                  <td className="py-1.5 px-2 font-mono">{diff.original}</td>
                  <td className="py-1.5 px-2 font-mono">{diff.alternative}</td>
                  <td className="py-1.5 px-2 font-mono font-semibold text-slate-900">
                    {diff.delta}
                  </td>
                  <td className="py-1.5 px-2 text-[11px] text-slate-500">{diff.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Narrative Verdict */}
      <div className="mt-2 text-xs text-slate-800 leading-relaxed font-medium">
        {verdict}
      </div>
    </div>
  );
}
